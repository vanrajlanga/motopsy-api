const vehicleCatalogService = require('../services/vehicle-catalog.service');
const BaseController = require('./base.controller');

/**
 * Vehicle Catalog Controller
 * Handles requests for vehicle makes, models, and versions
 */
class VehicleCatalogController extends BaseController {
  /**
   * Get vehicle catalog (makes, models, versions)
   * Fetches from database first, falls back to Droom API
   */
  async getCatalog(req, res, next) {
    try {
      const result = await vehicleCatalogService.getCatalogAsync(req.body);
      return this.fromResult(result, res);
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new VehicleCatalogController();
