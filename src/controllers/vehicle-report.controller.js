const BaseController = require('./base.controller');
const vehicleReportService = require('../services/vehicle-report.service');

class VehicleReportController extends BaseController {
  /**
   * POST /api/vehicleReport/get-vehicle-report/{registrationNumber}
   * Matches .NET: GetVehicleReport
   */
  async getVehicleReport(req, res, next) {
    try {
      const { registrationNumber } = req.params;
      const result = await vehicleReportService.getVehicleReportAsync(registrationNumber);
      return this.fromResult(result, res);
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/vehicleReport/vehicle-report/{physicalVerificationId}/physical-verification-report
   * Matches .NET: DownloadPhysicalVerificationReport
   */
  async getPhysicalVerificationReportByVehicleReportId(req, res, next) {
    try {
      const { physicalVerificationId } = req.params;
      const result = await vehicleReportService.getPhysicalVerificationReportByVehicleReportIdAsync(parseInt(physicalVerificationId));
      return this.fromResult(result, res);
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/vehicleReport/upload-ncrbReport/{userId}
   * Matches .NET: AddOrUpdateReport
   */
  async uploadNcrbReport(req, res, next) {
    try {
      const { userId } = req.params;
      const { VehicleDetailId, SendMail } = req.body;

      if (!req.file) {
        return res.status(400).json({ isSuccess: false, error: 'No file uploaded' });
      }

      const dto = {
        vehicleDetailId: parseInt(VehicleDetailId),
        sendMail: SendMail === 'true' || SendMail === true,
        ncrbReport: req.file
      };

      const result = await vehicleReportService.addOrUpdateReportAsync(dto, parseInt(userId));
      return this.fromResult(result, res);
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/vehicleReport/get-vehicle-history-report
   * Matches .NET: GetVehicleHistoryReport - uses User.Identity.Name
   */
  async getVehicleHistoryReport(req, res, next) {
    try {
      const userEmail = req.user.email;
      const result = await vehicleReportService.getVehicleHistoryReportsAsync(userEmail);
      return this.fromResult(result, res);
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/vehicleReport/get-physical-verification-reports
   * Matches .NET: GetPhysicalVerificationReports - uses User.Identity.Name
   */
  async getPhysicalVerificationReports(req, res, next) {
    try {
      const userEmail = req.user.email;
      const result = await vehicleReportService.getPhysicalVerificationReportsByUserAsync(userEmail);
      return this.fromResult(result, res);
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/vehicleReport/get-vehicle-history-report-count
   * Matches .NET: GetVehicleHistoryReportCount
   */
  async getVehicleHistoryReportCount(req, res, next) {
    try {
      const result = await vehicleReportService.getVehicleHistoryReportsCountAsync();
      return this.fromResult(result, res);
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/vehicleReport/get-physical-verifications-report-by-id?id={id}
   * Matches .NET: GetPhysicalVerificationReportById - returns PDF file
   */
  async getPhysicalVerificationReportById(req, res, next) {
    try {
      const { id } = req.query;
      const report = await vehicleReportService.getPhysicalVerificationReportByIdAsync(parseInt(id));

      if (!report) {
        return res.status(404).json({ error: 'Physical verification report not found' });
      }

      // Return as PDF file (matches .NET File() response)
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', 'attachment; filename="PhysicalVerificationReport.pdf"');
      return res.send(report);
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/vehicleReport/get-list-of-reports-generated-by-user?userId={userId}
   * Matches .NET: GetListOfReportsGeneratedByUser - uses query param userId
   */
  async getListOfReportsGeneratedByUser(req, res, next) {
    try {
      const { userId } = req.query;
      const result = await vehicleReportService.getVehicleDetailWithReportsAsync(parseInt(userId));
      return this.fromResult(result, res);
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/vehicleReport/upload-and-send-physical-verification-report
   * Matches .NET: UploadAndSendPhysicalVerificationReport
   */
  async uploadAndSendPhysicalVerificationReport(req, res, next) {
    try {
      const { PhysicalVerificationId, SendMail } = req.body;

      if (!req.file) {
        return res.status(400).json({ isSuccess: false, error: 'No file uploaded' });
      }

      const request = {
        physicalVerificationId: parseInt(PhysicalVerificationId),
        sendMail: SendMail === 'true' || SendMail === true,
        file: req.file
      };

      const result = await vehicleReportService.uploadAndSendPhysicalVerificationReportAsync(request);
      return this.fromResult(result, res);
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/vehicleReport/ncrb-report-by-id?reportId={reportId}
   * Matches .NET: GetNcrbReportById
   */
  async getNcrbReportById(req, res, next) {
    try {
      const { reportId } = req.query;
      const report = await vehicleReportService.getNcrbReportByIdAsync(parseInt(reportId));
      return res.status(200).json(report);
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new VehicleReportController();
