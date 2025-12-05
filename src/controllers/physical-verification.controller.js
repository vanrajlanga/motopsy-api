const BaseController = require('./base.controller');
const physicalVerificationService = require('../services/physical-verification.service');

class PhysicalVerificationController extends BaseController {
  async getPhysicalVerifications(req, res, next) {
    try {
      const result = await physicalVerificationService.getPhysicalVerificationsAsync(req.body);
      return this.fromResult(result, res);
    } catch (error) {
      next(error);
    }
  }

  async getById(req, res, next) {
    try {
      const { id } = req.params;
      const result = await physicalVerificationService.getByIdAsync(parseInt(id));
      return this.fromResult(result, res);
    } catch (error) {
      next(error);
    }
  }

  async createAppointment(req, res, next) {
    try {
      const result = await physicalVerificationService.createAppointmentAsync(req.body);
      return this.fromResult(result, res);
    } catch (error) {
      next(error);
    }
  }

  async getCount(req, res, next) {
    try {
      const result = await physicalVerificationService.getCountAsync();
      return this.fromResult(result, res);
    } catch (error) {
      next(error);
    }
  }

  async getAllVerifications(req, res, next) {
    try {
      const result = await physicalVerificationService.getAllVerificationsAsync(req.body);
      return this.fromResult(result, res);
    } catch (error) {
      next(error);
    }
  }

  async getByUser(req, res, next) {
    try {
      const result = await physicalVerificationService.getByUserAsync(req.user.userId);
      return this.fromResult(result, res);
    } catch (error) {
      next(error);
    }
  }

  async getReportById(req, res, next) {
    try {
      const { id } = req.query;
      const result = await physicalVerificationService.getReportByIdAsync(parseInt(id));
      return this.fromResult(result, res);
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new PhysicalVerificationController();
