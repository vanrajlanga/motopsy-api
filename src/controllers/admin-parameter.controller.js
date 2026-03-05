const parameterService = require('../services/parameter.service');
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

    if (!data.name || !data.name.trim()) {
      return this.badRequest('name is required', res);
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
    const { isActive } = req.body;

    if (typeof isActive !== 'boolean') {
      return this.badRequest('isActive (boolean) is required', res);
    }

    const result = await parameterService.toggleParameterStatus(parseInt(id), isActive);
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
        InspectionParameter.findAll({ attributes: ['id', 'sub_group_id', 'template_filter', 'is_active'] })
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
