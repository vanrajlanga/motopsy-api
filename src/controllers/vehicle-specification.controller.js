const BaseController = require('./base.controller');
const vehicleSpecificationService = require('../services/vehicle-specification.service');

class VehicleSpecificationController extends BaseController {
  /**
   * GET /api/vehicleSpecification/makes - Get all distinct makes
   */
  async getMakes(req, res, next) {
    try {
      const result = await vehicleSpecificationService.getMakesAsync();
      return this.fromResult(result, res);
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/vehicleSpecification/models/:make - Get models for a make
   */
  async getModelsByMake(req, res, next) {
    try {
      const { make } = req.params;
      const result = await vehicleSpecificationService.getModelsByMakeAsync(make);
      return this.fromResult(result, res);
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/vehicleSpecification/versions/:make/:model - Get versions for make and model
   */
  async getVersionsByMakeModel(req, res, next) {
    try {
      const { make, model } = req.params;
      const result = await vehicleSpecificationService.getVersionsByMakeModelAsync(make, model);
      return this.fromResult(result, res);
    } catch (error) {
      next(error);
    }
  }

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
