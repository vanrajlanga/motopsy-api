const ApiController = require('./base.controller');
const serviceOrderService = require('../services/service-order.service');
const inspectionService = require('../services/inspection.service');

class PublicController extends ApiController {
  /**
   * GET /api/public/order/:token
   * No auth — returns vehicle details for the share token's order
   */
  async getOrderByToken(req, res, next) {
    try {
      const { token } = req.params;
      const order = await serviceOrderService.getOrderByShareToken(token);
      return this.ok({
        success: true,
        data: {
          orderId: order.id,
          registrationNumber: order.registration_number,
          make: order.car_company,
          model: order.car_model,
          year: order.car_model_year,
          customerName: order.name,
          shareToken: token
        }
      }, res);
    } catch (error) {
      return res.status(404).json({ isSuccess: false, error: 'Invalid or expired share link' });
    }
  }

  /**
   * POST /api/public/inspection
   * No auth — creates an inspection for the given share token
   * Body: { shareToken, inspectorName, fuelType, transmissionType, odometerKm, hasLift, roadTestPossible }
   */
  async startInspection(req, res, next) {
    try {
      const { shareToken, inspectorName, fuelType, transmissionType, odometerKm, hasLift, roadTestPossible } = req.body;

      if (!shareToken) {
        return res.status(400).json({ isSuccess: false, error: 'shareToken is required' });
      }
      if (!fuelType || !transmissionType) {
        return res.status(400).json({ isSuccess: false, error: 'fuelType and transmissionType are required' });
      }

      const order = await serviceOrderService.getOrderByShareToken(shareToken);

      const result = await inspectionService.create(null, {
        vehicleRegNumber: order.registration_number || '',
        vehicleMake: order.car_company || '',
        vehicleModel: order.car_model || '',
        vehicleYear: order.car_model_year || new Date().getFullYear(),
        fuelType,
        transmissionType,
        odometerKm: odometerKm || 0,
        inspectorName: inspectorName || 'Inspector',
        serviceOrderId: order.id,
        hasLift: !!hasLift,
        roadTestPossible: !!roadTestPossible
      });

      if (!result.isSuccess) {
        return res.status(500).json({ isSuccess: false, error: result.error });
      }

      return this.ok({ success: true, inspectionId: result.value.id }, res);
    } catch (error) {
      return res.status(404).json({ isSuccess: false, error: 'Invalid or expired share link' });
    }
  }
}

module.exports = new PublicController();
