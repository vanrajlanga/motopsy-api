const ApiController = require('./base.controller');
const pricingService = require('../services/pricing.service');

class PricingController extends ApiController {
  /**
   * GET /api/pricing
   * Get all pricing settings (public)
   */
  async getAllPricing(req, res, next) {
    try {
      const result = await pricingService.getAllPricingAsync();
      return this.fromResult(result, res);
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/pricing/:key
   * Get pricing by key (public)
   */
  async getPricingByKey(req, res, next) {
    try {
      const { key } = req.params;
      const result = await pricingService.getPricingByKeyAsync(key);
      return this.fromResult(result, res);
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/pricing/vehicle-history-price
   * Get vehicle history report price (public - for frontend)
   */
  async getVehicleHistoryPrice(req, res, next) {
    try {
      const result = await pricingService.getVehicleHistoryPriceAsync();
      return this.fromResult(result, res);
    } catch (error) {
      next(error);
    }
  }

  /**
   * PUT /api/pricing/:id
   * Update pricing setting (admin only)
   */
  async updatePricing(req, res, next) {
    try {
      const { id } = req.params;
      const userId = req.user?.sub || req.user?.id;
      const result = await pricingService.updatePricingAsync(parseInt(id), req.body, userId);
      return this.fromResult(result, res);
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/pricing
   * Create pricing setting (admin only)
   */
  async createPricing(req, res, next) {
    try {
      const userId = req.user?.sub || req.user?.id;
      const result = await pricingService.createPricingAsync(req.body, userId);
      return this.fromResult(result, res);
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new PricingController();
