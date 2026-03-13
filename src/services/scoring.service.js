const { sequelize } = require('../config/database');
const InspectionResponse = require('../models/inspection-response.model');
const InspectionParameter = require('../models/inspection-parameter.model');
const InspectionSubGroup = require('../models/inspection-sub-group.model');
const InspectionModule = require('../models/inspection-module.model');
const InspectionScore = require('../models/inspection-score.model');
const Inspection = require('../models/inspection.model');
const InspectionTemplate = require('../models/inspection-template.model');
const { getTierMultiplier, TOTAL_REPAIR_CAP_PERCENT } = require('../config/repair-tiers');
const Result = require('../utils/result');
const logger = require('../config/logger');

// Default certification thresholds (used_car)
const DEFAULT_CERT_LEVELS = [
  { label: 'Gold',          minRating: 4.5 },
  { label: 'Silver',        minRating: 3.5 },
  { label: 'Verified',      minRating: 2.5 },
  { label: 'Not Certified', minRating: 0   }
];

// Module slug → risk column mapping
const SLUG_TO_RISK_COLUMN = {
  'engine_system': 'engine_risk',
  'transmission_drivetrain': 'transmission_risk',
  'structural_integrity': 'structural_risk',
  'paint_panel': 'paint_risk',
  'suspension_brakes': 'suspension_risk',
  'electrical_electronics': 'electrical_risk',
  'interior_safety': 'interior_risk',
  'documentation': 'documents_risk',
  'road_test': 'road_test_risk',
};

class ScoringService {
  /**
   * Calculate all scores for a completed inspection.
   * Rating formula: 5 × (1 − VRI^1.3)
   * VRI = weighted average of module risks
   */
  async calculateScores(inspectionId) {
    try {
      // Load the inspection to get template_id and valuation data
      const inspection = await Inspection.findByPk(inspectionId, {
        attributes: ['id', 'template_id', 'vehicle_market_value', 'repair_cost_tier', 'ex_showroom_price']
      });

      // Load the template if set (for module weight overrides + custom cert labels)
      let template = null;
      if (inspection?.template_id) {
        template = await InspectionTemplate.findByPk(inspection.template_id);
      }

      // Parse JSON fields that MySQL may return as strings
      let rawModWeights = template?.module_weights || null;
      if (typeof rawModWeights === 'string') {
        try { rawModWeights = JSON.parse(rawModWeights); } catch (e) { rawModWeights = null; }
      }
      const templateModuleWeights = rawModWeights;

      let rawCertLevels = template?.certification_levels || null;
      if (typeof rawCertLevels === 'string') {
        try { rawCertLevels = JSON.parse(rawCertLevels); } catch (e) { rawCertLevels = null; }
      }
      const certLevels = Array.isArray(rawCertLevels) ? rawCertLevels : DEFAULT_CERT_LEVELS;
      const isPDI = template?.slug === 'new_car_pdi';

      // Get all responses with parameter and module info
      const responses = await InspectionResponse.findAll({
        where: { inspection_id: inspectionId },
        include: [{
          model: InspectionParameter,
          as: 'Parameter',
          include: [{
            model: InspectionSubGroup,
            as: 'SubGroup',
            include: [{
              model: InspectionModule,
              as: 'Module'
            }]
          }]
        }]
      });

      if (responses.length === 0) {
        return Result.failure('No responses found for this inspection');
      }

      // Group responses by module
      const moduleGroups = {};
      for (const resp of responses) {
        const param = resp.Parameter;
        if (!param || !param.SubGroup || !param.SubGroup.Module) continue;

        const mod = param.SubGroup.Module;
        if (!moduleGroups[mod.slug]) {
          moduleGroups[mod.slug] = {
            module: mod,
            responses: []
          };
        }
        moduleGroups[mod.slug].responses.push(resp);
      }

      // Calculate per-module risk using WEIGHTED average of responded params.
      // Proportional redistribution: divide by the sum of weights of answered
      // params only — disabled/N/A/filtered params are simply absent from both
      // numerator and denominator, so their weight is automatically redistributed
      // to the remaining answered params in proportion to their weights.
      const moduleRisks = {};
      const repairCostBreakdown = {};
      let totalRepairCost = 0;

      for (const [slug, group] of Object.entries(moduleGroups)) {
        const answered = group.responses.filter(r => r.severity_score != null);

        let moduleRisk = 0;
        if (answered.length > 0) {
          // For PDI, use weightage_pdi if set; otherwise fall back to weightage
          const getWt = (r) => isPDI && r.Parameter?.weightage_pdi != null
            ? parseFloat(r.Parameter.weightage_pdi)
            : parseFloat(r.Parameter?.weightage || 1);
          const weightedSum  = answered.reduce((s, r) => s + getWt(r) * parseFloat(r.severity_score || 0), 0);
          const totalParamWt = answered.reduce((s, r) => s + getWt(r), 0);
          moduleRisk = totalParamWt > 0 ? weightedSum / totalParamWt : 0;
        }

        moduleRisks[slug] = moduleRisk;

        // Repair cost: skipped for PDI (new car under warranty)
        const mod = group.module;
        if (!isPDI) {
          const vehicleValue = parseFloat(inspection.vehicle_market_value || 0);
          const tierMultiplier = getTierMultiplier(inspection.repair_cost_tier);
          const repairPercent = parseFloat(mod.repair_percent || 0);
          const gamma = parseFloat(mod.gamma || 1.0);

          let moduleCost = 0;
          if (vehicleValue > 0 && repairPercent > 0 && moduleRisk > 0) {
            // New formula: vehicleValue × repairPercent × tierMultiplier × risk^gamma
            moduleCost = vehicleValue * repairPercent * tierMultiplier * Math.pow(moduleRisk, gamma);
          }

          repairCostBreakdown[slug] = {
            moduleName: mod.name,
            risk: Math.round(moduleRisk * 10000) / 10000,
            repairPercent,
            tierMultiplier,
            gamma,
            vehicleValue,
            repairCost: Math.round(moduleCost * 100) / 100
          };

          totalRepairCost += moduleCost;
        }
      }

      // Apply hard cap: total repair cost cannot exceed 60% of vehicle market value
      const vehicleValue = parseFloat(inspection.vehicle_market_value || 0);
      let repairCapApplied = false;
      if (vehicleValue > 0) {
        const maxCap = vehicleValue * TOTAL_REPAIR_CAP_PERCENT;
        if (totalRepairCost > maxCap) {
          totalRepairCost = maxCap;
          repairCapApplied = true;
        }
      }

      // Calculate VRI (weighted sum of module risks)
      // Use template module_weights if provided, otherwise use inspection_modules.weight
      let vri = 0;
      let totalWeight = 0;

      for (const [slug, group] of Object.entries(moduleGroups)) {
        const weight = templateModuleWeights
          ? parseFloat(templateModuleWeights[slug] ?? group.module.weight ?? 0)
          : parseFloat(group.module.weight || 0);
        vri += (moduleRisks[slug] || 0) * weight;
        totalWeight += weight;
      }

      // Normalize by total weight (should sum to 1.0, but protect against rounding)
      if (totalWeight > 0) {
        vri = vri / totalWeight;
      }

      // Rating = 5 × (1 − VRI^1.3), clamped [0, 5]
      let baseRating = 5 * (1 - Math.pow(vri, 1.3));
      baseRating = Math.max(0, Math.min(5, baseRating));
      baseRating = Math.round(baseRating * 100) / 100;

      // Check for red flags
      const redFlagResponses = responses.filter(r => {
        const param = r.Parameter;
        return param && param.is_red_flag && parseFloat(r.severity_score || 0) >= 0.75;
      });

      const hasRedFlags = redFlagResponses.length > 0;
      const redFlagParams = redFlagResponses.map(r => {
        const param = r.Parameter;
        const severity = parseFloat(r.severity_score);

        // Per-red-flag penalty based on severity (industry-aligned: NAAA/ADESA grade cap approach)
        let penalty = 0;
        if (severity >= 0.95)      penalty = 0.40;  // Critical / near-catastrophic
        else if (severity >= 0.85) penalty = 0.25;  // Major issue, expensive fix
        else                       penalty = 0.15;  // Serious but repairable (0.75-0.84)

        const entry = {
          paramNumber: param.param_number,
          paramName: param.name,
          severityScore: severity,
          penalty
        };

        // For composite params, include which sub-items are red flags
        if (param.is_composite && param.sub_items_json) {
          let subItems = param.sub_items_json;
          if (typeof subItems === 'string') {
            try { subItems = JSON.parse(subItems); } catch (e) { subItems = []; }
          }
          const rfSubItems = (subItems || []).filter(si => si.redFlag);
          if (rfSubItems.length > 0) {
            entry.redFlagSubItems = rfSubItems.map(si => si.label);
          }
        }

        return entry;
      });

      // Apply red flag penalty to rating (grade cap approach)
      // Total penalty = sum of individual penalties, capped at 80%
      let rating = baseRating;
      let totalRedFlagPenalty = 0;
      if (hasRedFlags && !isPDI) {
        totalRedFlagPenalty = Math.min(
          redFlagParams.reduce((sum, rf) => sum + rf.penalty, 0),
          0.80  // Max 80% penalty — always leaves some rating
        );
        rating = baseRating * (1 - totalRedFlagPenalty);
        rating = Math.max(0, Math.min(5, rating));
        rating = Math.round(rating * 100) / 100;
      }

      // Determine certification using template-specific levels
      let certification;
      if (isPDI && hasRedFlags) {
        // PDI: any red flag = Reject Delivery (non-negotiable for new car)
        certification = 'Reject Delivery';
      } else {
        const levels = Array.isArray(certLevels) ? certLevels : DEFAULT_CERT_LEVELS;
        certification = levels[levels.length - 1].label; // fallback to lowest
        for (const level of levels) {
          if (rating >= level.minRating) {
            certification = level.label;
            break;
          }
        }
      }

      // Build score data
      const scoreData = {
        inspection_id: inspectionId,
        vri: Math.round(vri * 10000) / 10000,
        rating,
        certification,
        has_red_flags: hasRedFlags ? 1 : 0,
        red_flag_params: redFlagParams.length > 0 ? redFlagParams : null,
        base_rating: baseRating,
        red_flag_penalty: hasRedFlags ? Math.round(totalRedFlagPenalty * 100) : 0,
        total_repair_cost: Math.round(totalRepairCost * 100) / 100,
        repair_cost_breakdown: {
          ...repairCostBreakdown,
          _meta: {
            vehicleMarketValue: vehicleValue,
            repairCostTier: inspection.repair_cost_tier || 'T2',
            capPercent: TOTAL_REPAIR_CAP_PERCENT,
            capApplied: repairCapApplied
          }
        },
        created_at: new Date()
      };

      // Set individual module risk columns
      for (const [slug, risk] of Object.entries(moduleRisks)) {
        const column = SLUG_TO_RISK_COLUMN[slug];
        if (column) {
          scoreData[column] = Math.round(risk * 10000) / 10000;
        }
      }

      // Upsert: create or update
      const existingScore = await InspectionScore.findOne({
        where: { inspection_id: inspectionId }
      });

      let score;
      if (existingScore) {
        await existingScore.update({ ...scoreData, modified_at: new Date() });
        score = existingScore;
      } else {
        score = await InspectionScore.create(scoreData);
      }

      logger.info(`Scoring complete for inspection ${inspectionId}: Rating=${rating}, Cert=${certification}`);

      return Result.success({
        vri: scoreData.vri,
        baseRating: baseRating,
        rating,
        certification,
        hasRedFlags,
        redFlagPenalty: hasRedFlags ? Math.round(totalRedFlagPenalty * 100) : 0,
        redFlagParams,
        totalRepairCost: scoreData.total_repair_cost,
        repairCostBreakdown,
        moduleRisks
      });
    } catch (error) {
      logger.error('Calculate scores error:', error);
      return Result.failure(error.message || 'Failed to calculate scores');
    }
  }
}

module.exports = new ScoringService();
