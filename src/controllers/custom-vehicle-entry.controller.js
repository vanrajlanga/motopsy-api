const BaseController = require('./base.controller');
const customVehicleEntryService = require('../services/custom-vehicle-entry.service');

class CustomVehicleEntryController extends BaseController {
  /**
   * Create a new custom vehicle entry
   * POST /api/custom-vehicles
   */
  async createEntry(req, res, next) {
    try {
      const result = await customVehicleEntryService.createCustomEntry(req.body);
      return this.fromResult(result, res);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get custom vehicle entries by user
   * GET /api/custom-vehicles/user/:userId
   */
  async getEntriesByUser(req, res, next) {
    try {
      const { userId } = req.params;
      const result = await customVehicleEntryService.getEntriesByUser(userId);
      return this.fromResult(result, res);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get custom vehicle entry by ID
   * GET /api/custom-vehicles/:id
   */
  async getEntryById(req, res, next) {
    try {
      const { id } = req.params;
      const result = await customVehicleEntryService.getEntryById(id);
      return this.fromResult(result, res);
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new CustomVehicleEntryController();
