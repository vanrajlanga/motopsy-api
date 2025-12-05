const BaseController = require('./base.controller');
const lostCarService = require('../services/lost-car.service');

class LostCarController extends BaseController {
  /**
   * GET /api/lostCar/vehicle-stolen-status/:registrationNumber
   */
  async checkStolenStatus(req, res, next) {
    try {
      const { registrationNumber } = req.params;
      const result = await lostCarService.checkStolenStatusAsync(registrationNumber);
      return this.fromResult(result, res);
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new LostCarController();
