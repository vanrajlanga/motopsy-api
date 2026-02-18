const parameterService = require('../services/parameter.service');
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
}

module.exports = new AdminParameterController();
