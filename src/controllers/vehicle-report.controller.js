const BaseController = require('./base.controller');
const vehicleReportService = require('../services/vehicle-report.service');
const upload = require('../middlewares/upload.middleware');

class VehicleReportController extends BaseController {
  async getVehicleReport(req, res, next) {
    try {
      const { registrationNumber } = req.params;
      const result = await vehicleReportService.getVehicleReportAsync(registrationNumber, req.user.userId);
      return this.fromResult(result, res);
    } catch (error) {
      next(error);
    }
  }

  async getVehicleHistoryReport(req, res, next) {
    try {
      const result = await vehicleReportService.getVehicleHistoryReportAsync();
      return this.fromResult(result, res);
    } catch (error) {
      next(error);
    }
  }

  async getPhysicalVerificationReports(req, res, next) {
    try {
      const result = await vehicleReportService.getPhysicalVerificationReportsAsync();
      return this.fromResult(result, res);
    } catch (error) {
      next(error);
    }
  }

  async getVehicleHistoryReportCount(req, res, next) {
    try {
      const result = await vehicleReportService.getVehicleHistoryReportCountAsync();
      return this.fromResult(result, res);
    } catch (error) {
      next(error);
    }
  }

  async getListOfReportsGeneratedByUser(req, res, next) {
    try {
      const result = await vehicleReportService.getListOfReportsGeneratedByUserAsync(req.user.userId);
      return this.fromResult(result, res);
    } catch (error) {
      next(error);
    }
  }

  async uploadNcrbReport(req, res, next) {
    try {
      if (!req.file) {
        return res.status(400).json({ isSuccess: false, error: 'No file uploaded' });
      }
      
      return res.json({
        isSuccess: true,
        value: {
          message: 'NCRB report uploaded successfully',
          file: req.file
        }
      });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new VehicleReportController();
