const { sequelize } = require('../config/database');
const InspectionResponse = require('../models/inspection-response.model');
const InspectionParameter = require('../models/inspection-parameter.model');
const InspectionSubGroup = require('../models/inspection-sub-group.model');
const InspectionModule = require('../models/inspection-module.model');
const InspectionScore = require('../models/inspection-score.model');
const Inspection = require('../models/inspection.model');
const InspectionTemplate = require('../models/inspection-template.model');
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
      // Load the inspection to get template_id
      const inspection = await Inspection.findByPk(inspectionId, {
        attributes: ['id', 'template_id']
      });

      // Load the template if set (for module weight overrides + custom cert labels)
      let template = null;
      if (inspection?.template_id) {
        template = await InspectionTemplate.findByPk(inspection.template_id);
      }

      const templateModuleWeights = template?.module_weights || null;
      const certLevels = template?.certification_levels || DEFAULT_CERT_LEVELS;
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
          const baseCost = parseFloat(mod.base_repair_cost || 0);
          const gamma = parseFloat(mod.gamma || 1.0);
          const moduleCost = baseCost * Math.pow(moduleRisk, gamma);

          repairCostBreakdown[slug] = {
            moduleName: mod.name,
            risk: Math.round(moduleRisk * 10000) / 10000,
            baseCost,
            gamma,
            repairCost: Math.round(moduleCost * 100) / 100
          };

          totalRepairCost += moduleCost;
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
      let rating = 5 * (1 - Math.pow(vri, 1.3));
      rating = Math.max(0, Math.min(5, rating));
      rating = Math.round(rating * 100) / 100;

      // Check for red flags
      const redFlagResponses = responses.filter(r => {
        const param = r.Parameter;
        return param && param.is_red_flag && parseFloat(r.severity_score || 0) >= 0.75;
      });

      const hasRedFlags = redFlagResponses.length > 0;
      const redFlagParams = redFlagResponses.map(r => ({
        paramNumber: r.Parameter.param_number,
        paramName: r.Parameter.name,
        severityScore: parseFloat(r.severity_score)
      }));

      // Determine certification using template-specific levels
      let certification;
      if (hasRedFlags) {
        // For PDI: red flag = Reject Delivery; for used car: Not Certified
        certification = isPDI ? 'Reject Delivery' : 'Not Certified';
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
        total_repair_cost: Math.round(totalRepairCost * 100) / 100,
        repair_cost_breakdown: repairCostBreakdown,
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
        rating,
        certification,
        hasRedFlags,
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
