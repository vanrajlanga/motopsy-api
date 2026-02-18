const BaseController = require('./base.controller');
const parameterService = require('../services/parameter.service');

class ParameterController extends BaseController {
  async getParameters(req, res, next) {
    try {
      const { fuelType, transmissionType } = req.query;
      const result = await parameterService.getApplicableParameters(fuelType, transmissionType);
      return this.fromResult(result, res);
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new ParameterController();
