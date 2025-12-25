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
      // Pass user email from auth context (matches .NET User.Identity.Name)
      const userEmail = req.user.email;
      const result = await physicalVerificationService.createAppointmentAsync(req.body, userEmail);
      return this.fromResult(result, res);
    } catch (error) {
      next(error);
    }
  }

  async getCount(req, res, next) {
    try {
      const { startDate, endDate } = req.query;
      const count = await physicalVerificationService.getCountAsync(startDate, endDate);
      // .NET returns raw integer, not wrapped in Result
      return res.status(200).json(count);
    } catch (error) {
      next(error);
    }
  }

  async getAllVerifications(req, res, next) {
    try {
      // .NET returns DataSourceResult directly (not wrapped in Result)
      const result = await physicalVerificationService.getAllVerificationsAsync(req.body);
      return res.status(200).json(result);
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
      // .NET uses query param 'reportId', not 'id'
      const { reportId } = req.query;
      const result = await physicalVerificationService.getReportByIdAsync(parseInt(reportId));
      return this.fromResult(result, res);
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new PhysicalVerificationController();
