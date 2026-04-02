const { sequelize } = require('../config/database');
const InspectionResponse = require('../models/inspection-response.model');
const InspectionParameter = require('../models/inspection-parameter.model');
const InspectionSubGroup = require('../models/inspection-sub-group.model');
const InspectionModule = require('../models/inspection-module.model');
const InspectionScore = require('../models/inspection-score.model');
const Inspection = require('../models/inspection.model');
const InspectionTemplate = require('../models/inspection-template.model');
const { getTierMultiplier, TOTAL_REPAIR_CAP_PERCENT } = require('../config/repair-tiers');
const { getSubItemTier, getTier2Cap, getTier3Deduction, SEVERITY_THRESHOLDS, loadTiersFromDB } = require('../config/red-flag-tiers');
const Result = require('../utils/result');
const logger = require('../config/logger');

// Load tier items from DB at service initialization (non-blocking).
// Falls back to static items if DB is not yet available.
loadTiersFromDB().catch(err => {
  logger.warn('ScoringService: Initial tier load from DB failed, using static fallback —', err.message);
});

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
        // Filter by per-template active status
        const isParamActive = (r) => isPDI
          ? r.Parameter?.is_active_pdi !== false && r.Parameter?.is_active_pdi !== 0
          : r.Parameter?.is_active !== false && r.Parameter?.is_active !== 0;

        const answered = group.responses.filter(r => r.severity_score != null && isParamActive(r));

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

      // ── Red flag detection — tiered system ──────────────────────────────────
      // Tier 1: Instant Kill (rating → 0)
      // Tier 2: Hard Cap (rating ≤ 2.0, decreasing with count)
      // Tier 3: Soft Penalty (−0.10 per flag, max −1.50)
      // Warning: severity 0.50–0.69 (shown on report, no penalty)

      const tier1Flags = [];
      const tier2Flags = [];
      const tier3Flags = [];
      const warningFlags = [];
      const redFlagParams = []; // All triggered flags (for backward compat / reporting)

      for (const r of responses) {
        const param = r.Parameter;
        if (!param) continue;

        // For composites with sub_item_responses, check individual sub-items
        if (param.is_composite && r.sub_item_responses) {
          let subResponses = r.sub_item_responses;
          if (typeof subResponses === 'string') {
            try { subResponses = JSON.parse(subResponses); } catch (e) { subResponses = []; }
          }

          for (const si of (subResponses || [])) {
            if (!si.redFlag || si.severityScore == null) continue;
            const severity = parseFloat(si.severityScore);

            // Warning zone: 0.50–0.69
            if (severity >= SEVERITY_THRESHOLDS.WARNING_MIN && severity < SEVERITY_THRESHOLDS.RED_FLAG_MIN) {
              warningFlags.push({
                paramNumber: param.param_number,
                paramName: param.name,
                subItemLabel: si.label,
                severityScore: severity,
                tier: 'warning',
              });
              continue;
            }

            // Below warning threshold — not flagged
            if (severity < SEVERITY_THRESHOLDS.RED_FLAG_MIN) continue;

            // Determine tier (UC or PDI based on template)
            const tier = getSubItemTier(param.param_number, si.label, isPDI ? 'pdi' : 'uc');
            const flagEntry = {
              paramNumber: param.param_number,
              paramName: param.name,
              subItemLabel: si.label,
              severityScore: severity,
              tier: tier || 3, // default to Tier 3 if not classified
            };

            if (tier === 1) tier1Flags.push(flagEntry);
            else if (tier === 2) tier2Flags.push(flagEntry);
            else tier3Flags.push(flagEntry);

            redFlagParams.push(flagEntry);
          }
        }
        // Non-composite red flag (legacy params)
        else if (param.is_red_flag) {
          const severity = parseFloat(r.severity_score || 0);

          if (severity >= SEVERITY_THRESHOLDS.WARNING_MIN && severity < SEVERITY_THRESHOLDS.RED_FLAG_MIN) {
            warningFlags.push({
              paramNumber: param.param_number,
              paramName: param.name,
              severityScore: severity,
              tier: 'warning',
            });
          } else if (severity >= SEVERITY_THRESHOLDS.RED_FLAG_MIN) {
            const flagEntry = {
              paramNumber: param.param_number,
              paramName: param.name,
              severityScore: severity,
              tier: 3, // legacy non-composite → Tier 3
            };
            tier3Flags.push(flagEntry);
            redFlagParams.push(flagEntry);
          }
        }
      }

      const hasRedFlags = redFlagParams.length > 0;
      const hasWarnings = warningFlags.length > 0;

      // ── Apply tiered penalties ────────────────────────────────────────────
      let rating = baseRating;
      let appliedTier = null;  // Which tier drove the final penalty
      let tier2Cap = Infinity;
      let tier3Deduction = 0;

      if (!isPDI && hasRedFlags) {
        // Tier 1: Instant Kill — rating forced to 0
        if (tier1Flags.length > 0) {
          rating = 0;
          appliedTier = 1;
        } else {
          // Tier 2: Hard Cap
          if (tier2Flags.length > 0) {
            tier2Cap = getTier2Cap(tier2Flags.length);
            rating = Math.min(rating, tier2Cap);
            appliedTier = 2;
          }

          // Tier 3: Soft Penalty (applied after cap)
          if (tier3Flags.length > 0) {
            tier3Deduction = getTier3Deduction(tier3Flags.length);
            rating = rating - tier3Deduction;
            if (!appliedTier) appliedTier = 3;
          }
        }

        rating = Math.max(0, Math.min(5, rating));
        rating = Math.round(rating * 100) / 100;
      }

      // ── Determine certification ───────────────────────────────────────────
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
        red_flag_warnings: warningFlags.length > 0 ? warningFlags : null,
        base_rating: baseRating,
        red_flag_tier: appliedTier,
        tier1_count: tier1Flags.length,
        tier2_count: tier2Flags.length,
        tier2_cap: tier2Flags.length > 0 ? tier2Cap : null,
        tier3_count: tier3Flags.length,
        tier3_deduction: tier3Flags.length > 0 ? tier3Deduction : null,
        warning_count: warningFlags.length,
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
        hasWarnings,
        redFlagTier: appliedTier,
        tier1Count: tier1Flags.length,
        tier2Count: tier2Flags.length,
        tier2Cap: tier2Flags.length > 0 ? tier2Cap : null,
        tier3Count: tier3Flags.length,
        tier3Deduction: tier3Flags.length > 0 ? tier3Deduction : null,
        warningCount: warningFlags.length,
        redFlagParams,
        warningParams: warningFlags,
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
