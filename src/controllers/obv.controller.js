const BaseController = require('./base.controller');
const obvService = require('../services/obv.service');

class ObvController extends BaseController {
  async getEnterpriseCatalog(req, res, next) {
    try {
      const result = await obvService.getEnterpriseCatalogAsync(req.body);
      return this.fromResult(result, res);
    } catch (error) {
      next(error);
    }
  }

  async getEnterpriseUsedPriceRange(req, res, next) {
    try {
      const result = await obvService.getEnterpriseUsedPriceRangeAsync(req.body);
      return this.fromResult(result, res);
    } catch (error) {
      next(error);
    }
  }

  async getByVehicleDetailId(req, res, next) {
    try {
      const { vehicleDetailId } = req.query;
      const result = await obvService.getByVehicleDetailIdAsync(parseInt(vehicleDetailId));
      return this.fromResult(result, res);
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new ObvController();
