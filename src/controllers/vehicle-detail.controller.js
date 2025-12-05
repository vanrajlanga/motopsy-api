const BaseController = require('./base.controller');
const vehicleDetailService = require('../services/vehicle-detail.service');

class VehicleDetailController extends BaseController {
  /**
   * POST /api/vehicle-detail - Get vehicle details by RC number
   */
  async getVehicleDetails(req, res, next) {
    try {
      const result = await vehicleDetailService.getVehicleDetailsByRCAsync(req.body);
      return this.fromResult(result, res);
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/vehicle-detail/vehicle-detail-by-id/:id/:userId
   */
  async getVehicleDetailById(req, res, next) {
    try {
      const { id, userId } = req.params;
      const result = await vehicleDetailService.getVehicleDetailByIdAsync(parseInt(id), parseInt(userId));
      return this.fromResult(result, res);
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/vehicle-detail/paid-vehicle-detail-failed-reports (admin only)
   */
  async getFailedReports(req, res, next) {
    try {
      const result = await vehicleDetailService.getPaidVehicleDetailFailedReportsAsync();
      return this.fromResult(result, res);
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/vehicle-detail/pending-reports
   */
  async getPendingReports(req, res, next) {
    try {
      const result = await vehicleDetailService.getPendingReportsAsync();
      return this.fromResult(result, res);
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new VehicleDetailController();
