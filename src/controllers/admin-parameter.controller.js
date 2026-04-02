const parameterService = require('../services/parameter.service');
const { TIER_1, TIER_2, TIER_3, SEVERITY_THRESHOLDS, refreshTierIndex, isTiersLoadedFromDB } = require('../config/red-flag-tiers');
const RedFlagTier = require('../models/red-flag-tier.model');
const InspectionTemplate = require('../models/inspection-template.model');
const InspectionModule = require('../models/inspection-module.model');
const InspectionSubGroup = require('../models/inspection-sub-group.model');
const InspectionParameter = require('../models/inspection-parameter.model');
const Result = require('../utils/result');
const BaseController = require('./base.controller');

class AdminParameterController extends BaseController {
  /**
   * GET /api/admin/parameters/hierarchy
   * Get all modules → sub-groups → parameters with is_active status
   */
  async getHierarchy(req, res) {
    const result = await parameterService.getParameterHierarchy();
    return this.fromResult(result, res);
  }

  /**
   * GET /api/admin/parameters/modules
   * Get module list with counts only (no parameters) for tab headers
   */
  async getModules(req, res) {
    const result = await parameterService.getModules();
    return this.fromResult(result, res);
  }

  /**
   * GET /api/admin/parameters/modules/:moduleId
   * Get sub-groups + parameters for a single module (lazy load)
   */
  async getModuleParameters(req, res) {
    const { moduleId } = req.params;
    const result = await parameterService.getModuleParameters(parseInt(moduleId));
    return this.fromResult(result, res);
  }

  /**
   * GET /api/admin/parameters/:id
   * Get a single parameter with all fields
   */
  async getParameter(req, res) {
    const { id } = req.params;
    const result = await parameterService.getParameterById(parseInt(id));
    return this.fromResult(result, res);
  }

  /**
   * PUT /api/admin/parameters/:id
   * Update a parameter's editable fields
   */
  async updateParameter(req, res) {
    const { id } = req.params;
    const data = req.body;

    if (data.name !== undefined && (!data.name || !data.name.trim())) {
      return this.badRequest('name cannot be empty', res);
    }

    const result = await parameterService.updateParameter(parseInt(id), data);
    return this.fromResult(result, res);
  }

  /**
   * PATCH /api/admin/parameters/:id/status
   * Toggle a single parameter's is_active status
   */
  async toggleParameterStatus(req, res) {
    const { id } = req.params;
    const { isActive, template } = req.body;

    if (typeof isActive !== 'boolean') {
      return this.badRequest('isActive (boolean) is required', res);
    }

    const result = await parameterService.toggleParameterStatus(parseInt(id), isActive, template || 'uc');
    return this.fromResult(result, res);
  }

  /**
   * PATCH /api/admin/parameters/sub-group/:id/bulk-status
   * Toggle all parameters in a sub-group
   */
  async toggleSubGroupStatus(req, res) {
    const { id } = req.params;
    const { isActive } = req.body;

    if (typeof isActive !== 'boolean') {
      return this.badRequest('isActive (boolean) is required', res);
    }

    const result = await parameterService.toggleSubGroupStatus(parseInt(id), isActive);
    return this.fromResult(result, res);
  }

  /**
   * PATCH /api/admin/parameters/module/:id/bulk-status
   * Toggle all parameters in a module
   */
  async toggleModuleStatus(req, res) {
    const { id } = req.params;
    const { isActive } = req.body;

    if (typeof isActive !== 'boolean') {
      return this.badRequest('isActive (boolean) is required', res);
    }

    const result = await parameterService.toggleModuleStatus(parseInt(id), isActive);
    return this.fromResult(result, res);
  }

  /**
   * GET /api/admin/parameters/module/:id/weight-summary
   * Returns total + active weight for a module
   */
  async getModuleWeightSummary(req, res) {
    const { id } = req.params;
    const result = await parameterService.getModuleWeightSummary(parseInt(id));
    return this.fromResult(result, res);
  }

  /**
   * GET /api/admin/parameters/red-flag-tiers
   * Returns tier items from the database along with tier metadata for the admin UI.
   */
  async getRedFlagTiers(req, res) {
    try {
      // Fetch all tier items from DB
      const rows = await RedFlagTier.findAll({
        order: [['tier', 'ASC'], ['param_number', 'ASC'], ['sub_item_label', 'ASC']],
        raw: true,
      });

      // Build tierMap: paramNumber → { subItemLabel → { uc: tier, pdi: tier } }
      const tierMap = {};
      for (const row of rows) {
        if (!tierMap[row.param_number]) tierMap[row.param_number] = {};
        tierMap[row.param_number][row.sub_item_label] = {
          uc: row.tier_uc || (row.is_pdi_only ? 0 : row.tier),
          pdi: row.tier_pdi || row.tier,
        };
      }

      // Count per tier (excluding PDI-only for tier counts)
      const tier1Count = rows.filter(r => r.tier === 1 && !r.is_pdi_only).length;
      const tier2Count = rows.filter(r => r.tier === 2 && !r.is_pdi_only).length;
      const tier3Count = rows.filter(r => r.tier === 3 && !r.is_pdi_only).length;
      const pdiCount = rows.filter(r => r.is_pdi_only).length;

      return this.ok({
        tierMap,
        items: rows,
        source: isTiersLoadedFromDB() ? 'database' : 'fallback',
        tiers: {
          1: { label: TIER_1.label, description: TIER_1.description, count: tier1Count },
          2: { label: TIER_2.label, description: TIER_2.description, count: tier2Count, baseCap: TIER_2.baseCap, perAdditional: TIER_2.perAdditional, floorCap: TIER_2.floorCap },
          3: { label: TIER_3.label, description: TIER_3.description, count: tier3Count, perFlagDeduction: TIER_3.perFlagDeduction, maxDeduction: TIER_3.maxDeduction },
        },
        pdiCount,
        thresholds: SEVERITY_THRESHOLDS,
      }, res);
    } catch (error) {
      return res.status(500).json({ isSuccess: false, error: error.message });
    }
  }

  /**
   * POST /api/admin/parameters/red-flag-tiers
   * Create a new red flag tier record.
   * Body: { param_number, sub_item_label, tier, is_pdi_only? }
   */
  async createRedFlagTier(req, res) {
    try {
      const { param_number, sub_item_label, tier, is_pdi_only } = req.body;

      // Validation
      if (!param_number || typeof param_number !== 'number') {
        return this.badRequest('param_number (integer) is required', res);
      }
      if (!sub_item_label || typeof sub_item_label !== 'string' || !sub_item_label.trim()) {
        return this.badRequest('sub_item_label (string) is required', res);
      }
      if (![1, 2, 3].includes(tier)) {
        return this.badRequest('tier must be 1, 2, or 3', res);
      }

      // Check for duplicate
      const existing = await RedFlagTier.findOne({
        where: { param_number, sub_item_label: sub_item_label.trim() },
      });
      if (existing) {
        return this.badRequest(`Red flag tier already exists for param ${param_number} / "${sub_item_label.trim()}"`, res);
      }

      const { tier_uc, tier_pdi } = req.body;
      const record = await RedFlagTier.create({
        param_number,
        sub_item_label: sub_item_label.trim(),
        tier,
        tier_uc: tier_uc != null ? tier_uc : tier,
        tier_pdi: tier_pdi != null ? tier_pdi : tier,
        is_pdi_only: is_pdi_only ? 1 : 0,
      });

      // Refresh the in-memory tier index so the scoring engine picks up the change
      await refreshTierIndex();

      return this.ok({ success: true, record: record.toJSON() }, res);
    } catch (error) {
      return res.status(500).json({ isSuccess: false, error: error.message });
    }
  }

  /**
   * PUT /api/admin/parameters/red-flag-tiers/:id
   * Update an existing red flag tier record.
   * Body: { tier: 1|2|3, is_pdi_only? }
   */
  async updateRedFlagTier(req, res) {
    try {
      const { id } = req.params;
      const { tier, is_pdi_only } = req.body;

      if (![1, 2, 3].includes(tier)) {
        return this.badRequest('tier must be 1, 2, or 3', res);
      }

      const record = await RedFlagTier.findByPk(parseInt(id));
      if (!record) {
        return this.notFound('Red flag tier record not found', res);
      }

      const { tier_uc, tier_pdi } = req.body;
      const updates = { tier };
      if (tier_uc != null) updates.tier_uc = tier_uc;
      if (tier_pdi != null) updates.tier_pdi = tier_pdi;
      if (typeof is_pdi_only === 'boolean' || typeof is_pdi_only === 'number') {
        updates.is_pdi_only = is_pdi_only ? 1 : 0;
      }

      await record.update(updates);

      // Refresh the in-memory tier index so the scoring engine picks up the change
      await refreshTierIndex();

      return this.ok({ success: true, record: record.toJSON() }, res);
    } catch (error) {
      return res.status(500).json({ isSuccess: false, error: error.message });
    }
  }

  /**
   * DELETE /api/admin/parameters/red-flag-tiers/:rfId
   * Delete a red flag tier record.
   */
  async deleteRedFlagTier(req, res) {
    try {
      const { rfId } = req.params;

      const record = await RedFlagTier.findByPk(parseInt(rfId));
      if (!record) {
        return this.notFound('Red flag tier record not found', res);
      }

      await record.destroy();

      // Refresh the in-memory tier index so the scoring engine picks up the change
      await refreshTierIndex();

      return this.ok({ success: true, deleted: true }, res);
    } catch (error) {
      return res.status(500).json({ isSuccess: false, error: error.message });
    }
  }

  /**
   * GET /api/admin/parameters/templates
   * Returns all inspection templates alongside the global module list so the
   * frontend can render a weight-editor grid (modules as rows, templates as columns).
   */
  async getTemplates(req, res) {
    try {
      const [templates, modules, subGroups, params] = await Promise.all([
        InspectionTemplate.findAll({ where: { is_active: 1 }, order: [['id', 'ASC']] }),
        InspectionModule.findAll({ order: [['sort_order', 'ASC']], attributes: ['id', 'name', 'slug', 'weight'] }),
        InspectionSubGroup.findAll({ attributes: ['id', 'module_id'] }),
        InspectionParameter.findAll({ where: { parent_id: null }, attributes: ['id', 'sub_group_id', 'template_filter', 'is_active'] })
      ]);

      // Build sub_group → module_id lookup
      const sgModuleMap = new Map();
      for (const sg of subGroups) sgModuleMap.set(sg.id, sg.module_id);

      // Per-module param counts (total + active) visible to each template slug
      const moduleTemplateCounts = {}; // moduleId → { used_car: N, new_car_pdi: N, used_car_active: N, new_car_pdi_active: N }
      for (const p of params) {
        const moduleId = sgModuleMap.get(p.sub_group_id);
        if (!moduleId) continue;
        if (!moduleTemplateCounts[moduleId]) moduleTemplateCounts[moduleId] = {
          used_car: 0, new_car_pdi: 0, used_car_active: 0, new_car_pdi_active: 0
        };
        const tf = p.template_filter;
        const active = !!p.is_active;
        if (!tf || tf === 'used_car') {
          moduleTemplateCounts[moduleId].used_car++;
          if (active) moduleTemplateCounts[moduleId].used_car_active++;
        }
        if (!tf || tf === 'new_car_pdi') {
          moduleTemplateCounts[moduleId].new_car_pdi++;
          if (active) moduleTemplateCounts[moduleId].new_car_pdi_active++;
        }
      }

      const parseJson = (v) => {
        if (!v) return null;
        if (typeof v === 'string') { try { return JSON.parse(v); } catch { return null; } }
        return v;
      };

      return this.ok({
        templates: templates.map(t => {
          const obj = t.toJSON();
          obj.module_weights = parseJson(obj.module_weights);
          obj.certification_levels = parseJson(obj.certification_levels);
          return obj;
        }),
        modules: modules.map(m => ({
          ...m.toJSON(),
          templateCounts: moduleTemplateCounts[m.id] || { used_car: 0, new_car_pdi: 0 }
        }))
      }, res);
    } catch (error) {
      return res.status(500).json({ isSuccess: false, error: error.message });
    }
  }

  /**
   * PUT /api/admin/parameters/templates/:id
   * Update a template's module_weights and/or certification_levels.
   * Body: { moduleWeights: { [slug]: number }, certificationLevels: [{ label, minRating }] }
   */
  async updateTemplate(req, res) {
    try {
      const { id } = req.params;
      const { moduleWeights, certificationLevels } = req.body;

      const template = await InspectionTemplate.findByPk(id);
      if (!template) {
        return res.status(404).json({ isSuccess: false, error: 'Template not found' });
      }

      // Validate module weights sum to ~100% (allow ±0.5 rounding tolerance)
      if (moduleWeights) {
        const total = Object.values(moduleWeights).reduce((s, v) => s + parseFloat(v || 0), 0);
        if (Math.abs(total - 1.0) > 0.01) {
          return res.status(400).json({
            isSuccess: false,
            error: `Module weights must sum to 100%. Current total: ${Math.round(total * 100)}%`
          });
        }
      }

      const updates = {};
      if (moduleWeights !== undefined) updates.module_weights = moduleWeights;
      if (certificationLevels !== undefined) updates.certification_levels = certificationLevels;

      await template.update(updates);

      const obj = template.toJSON();
      const parseJ = (v) => (typeof v === 'string' ? JSON.parse(v) : v);
      if (obj.module_weights) obj.module_weights = parseJ(obj.module_weights);
      if (obj.certification_levels) obj.certification_levels = parseJ(obj.certification_levels);

      return this.ok({ success: true, template: obj }, res);
    } catch (error) {
      return res.status(500).json({ isSuccess: false, error: error.message });
    }
  }
}

module.exports = new AdminParameterController();
