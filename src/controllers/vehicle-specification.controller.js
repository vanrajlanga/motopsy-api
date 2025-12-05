const BaseController = require('./base.controller');
const vehicleSpecificationService = require('../services/vehicle-specification.service');

class VehicleSpecificationController extends BaseController {
  /**
   * GET /api/vehicleSpecification/:model
   */
  async getByModel(req, res, next) {
    try {
      const { model } = req.params;
      const result = await vehicleSpecificationService.getByModelAsync(model);
      return this.fromResult(result, res);
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/vehicleSpecification/vehicles-from-specs
   */
  async getVehiclesFromSpecs(req, res, next) {
    try {
      const result = await vehicleSpecificationService.getVehiclesFromSpecsAsync(req.body);
      return this.fromResult(result, res);
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new VehicleSpecificationController();
