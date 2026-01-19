const BaseController = require('./base.controller');
const discrepancyService = require('../services/discrepancy.service');

class DiscrepancyController extends BaseController {
  /**
   * POST /api/discrepancy - Create a discrepancy report
   * Body: { vehicleDetailId, newSpecId, carNotFound, userNotes }
   */
  async create(req, res, next) {
    try {
      const userId = req.user.userId;
      const result = await discrepancyService.createDiscrepancyAsync(req.body, parseInt(userId));
      return this.fromResult(result, res);
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/discrepancy/list - List all discrepancies (admin)
   * Body: { take, skip }
   */
  async list(req, res, next) {
    try {
      const { take = 10, skip = 0 } = req.body;
      const result = await discrepancyService.listDiscrepanciesAsync(take, skip);
      return this.fromResult(result, res);
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/discrepancy/by-vehicle/:vehicleDetailId - Check if discrepancy exists
   */
  async getByVehicleDetailId(req, res, next) {
    try {
      const { vehicleDetailId } = req.params;
      const result = await discrepancyService.getByVehicleDetailIdAsync(parseInt(vehicleDetailId));
      return this.fromResult(result, res);
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new DiscrepancyController();
