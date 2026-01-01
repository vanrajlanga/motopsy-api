const BaseController = require('./base.controller');
const vehicleDetailService = require('../services/vehicle-detail.service');

class VehicleDetailController extends BaseController {
  /**
   * POST /api/vehicle-detail - Get vehicle details by RC number
   * Matches .NET: GetVehicleDetailsByRcNumber(request, User.Identity.Name)
   */
  async getVehicleDetails(req, res, next) {
    try {
      // Pass user email from auth context (matches .NET User.Identity.Name)
      const userEmail = req.user.email;
      const result = await vehicleDetailService.getVehicleDetailsByRCAsync(req.body, userEmail);
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
      const isAdmin = req.user?.isAdmin || false;
      console.log('DEBUG - getVehicleDetailById:', {
        id,
        userId,
        isAdmin,
        userObj: req.user
      });
      const result = await vehicleDetailService.getVehicleDetailByIdAsync(parseInt(id), parseInt(userId), isAdmin);
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
      const userEmail = req.user.email;
      const result = await vehicleDetailService.getPendingReportsAsync(userEmail);
      return this.fromResult(result, res);
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/vehicle-detail/calculate-resale
   * Calculate resale value using user-provided data (when auto-calculation fails)
   */
  async calculateResale(req, res, next) {
    try {
      const { vehicleDetailId, make, model, year, exShowroomPrice, kmsDriven } = req.body;

      if (!vehicleDetailId) {
        return res.status(400).json({
          success: false,
          message: 'vehicleDetailId is required'
        });
      }

      const result = await vehicleDetailService.calculateResaleManually(vehicleDetailId, {
        make,
        model,
        year,
        exShowroomPrice,
        kmsDriven
      });

      if (result.success) {
        return res.status(200).json(result);
      } else {
        return res.status(400).json(result);
      }
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new VehicleDetailController();
