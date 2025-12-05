const VehicleDetail = require('../models/vehicle-detail.model');
const PhysicalVerification = require('../models/physical-verification.model');
const User = require('../models/user.model');
const Result = require('../utils/result');
const logger = require('../config/logger');
const emailService = require('./email.service');
const { Op } = require('sequelize');
const { sequelize } = require('../config/database');

class VehicleReportService {
  /**
   * Get vehicle report by registration number
   * Matches .NET: GetVehicleReportAsync
   */
  async getVehicleReportAsync(registrationNumber) {
    try {
      logger.info(`Getting vehicle report for: ${registrationNumber}`);

      const cleanRegNo = registrationNumber.replace(/\s/g, '').toUpperCase();

      // Get vehicle details from database
      const vehicleDetail = await VehicleDetail.findOne({
        where: { RegistrationNumber: cleanRegNo }
      });

      if (!vehicleDetail) {
        logger.warn(`Something went wrong while fetching report for ${registrationNumber}`);
        return Result.failure('Report not found');
      }

      // Transform to camelCase DTO matching .NET VehicleReportDto
      const report = this.transformToVehicleReportDto(vehicleDetail);

      logger.info(`Vehicle report generated for: ${cleanRegNo}`);
      return Result.success(report);
    } catch (error) {
      logger.error('Get vehicle report error:', error);
      return Result.failure(error.message || 'Failed to get vehicle report');
    }
  }

  /**
   * Get physical verification report by vehicle report ID
   * Matches .NET: GetPhysicalVerificationReportByVehicleReportIdAsync
   */
  async getPhysicalVerificationReportByVehicleReportIdAsync(vehicleReportId) {
    try {
      const report = await PhysicalVerification.findOne({
        where: { Id: vehicleReportId },
        attributes: ['Report']
      });

      if (!report || !report.Report) {
        return Result.success(null);
      }

      return Result.success(report.Report);
    } catch (error) {
      logger.error('Get physical verification report error:', error);
      return Result.failure(error.message || 'Failed to get report');
    }
  }

  /**
   * Add or update NCRB report
   * Matches .NET: AddOrUpdateReportAsync
   */
  async addOrUpdateReportAsync(dto, userId) {
    try {
      const user = await User.findByPk(userId);
      if (!user) {
        return Result.failure('User not found');
      }

      const vehicleDetail = await VehicleDetail.findByPk(dto.vehicleDetailId);
      if (!vehicleDetail) {
        return Result.failure("Vehicle History Report doesn't exist");
      }

      // Store the file bytes
      const fileBytes = dto.ncrbReport.buffer;

      // Check if NcrbReport exists for this vehicle detail
      // For now, we'll store in a simple way - in production, you'd want a separate NcrbReport table
      await vehicleDetail.update({
        NcrbReportData: fileBytes,
        NcrbReportFileName: dto.ncrbReport.originalname,
        NcrbReportUpdatedAt: new Date()
      });

      // Send email if requested
      if (dto.sendMail) {
        const message = `
          <p>Dear ${user.UserName},</p>
          <p>Thank you for your recent purchase of a Vehicle History Report from Motopsy.com.</p>
          <p>We are pleased to confirm that the NCRB Vehicle NOC, which is an integral part of your Vehicle History Report, is attached to this email.</p>
          <p>We are grateful for your patronage and look forward to serving you again in the future.</p>
          <p>Best regards,</p>
          <p>Atul Bawa</p>
          <p>Motopsy.com</p>`;

        await emailService.sendEmailWithAttachmentAsync(
          user.Email,
          'NCRB Report',
          message,
          fileBytes,
          dto.ncrbReport.originalname
        );
      }

      return Result.success();
    } catch (error) {
      logger.error('Add or update report error:', error);
      return Result.failure(error.message || 'Failed to add/update report');
    }
  }

  /**
   * Get vehicle history reports by user
   * Matches .NET: GetVehicleHistoryReportsAsync(userName)
   */
  async getVehicleHistoryReportsAsync(userEmail) {
    try {
      const user = await User.findOne({ where: { Email: userEmail } });
      if (!user) {
        return Result.failure('Not found');
      }

      const reports = await VehicleDetail.findAll({
        where: { UserId: user.Id },
        order: [['CreatedAt', 'DESC']]
      });

      // Transform to VehicleHistoryReportDto
      const vehicleHistoryReports = reports.map(r => ({
        id: r.Id,
        registrationNumber: r.RegistrationNumber,
        manufacturer: r.Manufacturer,
        model: r.Model,
        yearOfManufacture: r.YearOfManufacture,
        fuelType: r.FuelType,
        createdAt: r.CreatedAt
      }));

      return Result.success(vehicleHistoryReports);
    } catch (error) {
      logger.error('Get vehicle history reports error:', error);
      return Result.failure(error.message || 'Failed to get reports');
    }
  }

  /**
   * Get physical verification reports by user
   * Matches .NET: GetPhysicalVerificationReportsByUserAsync(userName)
   */
  async getPhysicalVerificationReportsByUserAsync(userEmail) {
    try {
      const user = await User.findOne({ where: { Email: userEmail } });
      if (!user) {
        return Result.failure('Not found');
      }

      const reports = await PhysicalVerification.findAll({
        where: { UserId: user.Id },
        order: [['CreatedAt', 'DESC']]
      });

      // Transform to GetPhysicalVerificationReportsResponse
      const physicalVerificationReports = reports.map(r => ({
        id: r.Id,
        registrationNumber: r.RegistrationNumber,
        status: r.Status,
        appointmentAt: r.AppointmentAt,
        createdAt: r.CreatedAt,
        reportGeneratedAt: r.ReportGeneratedAt
      }));

      return Result.success(physicalVerificationReports);
    } catch (error) {
      logger.error('Get physical verification reports error:', error);
      return Result.failure(error.message || 'Failed to get reports');
    }
  }

  /**
   * Get vehicle history report count
   * Matches .NET: GetVehicleHistoryReportsCountAsync - returns Result<int>
   */
  async getVehicleHistoryReportsCountAsync() {
    try {
      const count = await VehicleDetail.count();
      return Result.success(count);
    } catch (error) {
      logger.error('Get count error:', error);
      return Result.failure(error.message || 'Failed to get count');
    }
  }

  /**
   * Get physical verification report by ID (returns PDF bytes)
   * Matches .NET: GetPhysicalVerificationReportById
   */
  async getPhysicalVerificationReportByIdAsync(id) {
    try {
      const report = await PhysicalVerification.findOne({
        where: { Id: id },
        attributes: ['Report']
      });

      return report?.Report || null;
    } catch (error) {
      logger.error('Get physical verification report by ID error:', error);
      throw error;
    }
  }

  /**
   * Get vehicle details with reports for a user
   * Matches .NET: GetVehicleDetailWithReportsAsync(userId)
   */
  async getVehicleDetailWithReportsAsync(userId) {
    try {
      const user = await User.findByPk(userId);
      if (!user) {
        return Result.failure('User not found');
      }

      const userVehicleHistoryReports = await VehicleDetail.findAll({
        where: { UserId: user.Id },
        order: [['CreatedAt', 'DESC']]
      });

      const userPhysicalVerifications = await PhysicalVerification.findAll({
        where: { UserId: user.Id }
      });

      // Map to VehicleDetailWithReportDto
      const vehicleDetailWithReports = userVehicleHistoryReports.map(uvr => {
        const pvForVehicle = userPhysicalVerifications.find(
          x => x.RegistrationNumber === uvr.RegistrationNumber
        );

        return {
          registrationNumber: uvr.RegistrationNumber,
          vehicleDetailId: uvr.Id,
          physicalVerificationReport: !!pvForVehicle,
          ncrbReport: !!uvr.NcrbReportData,
          ncrbReportId: uvr.NcrbReportData ? uvr.Id : null,
          physicalVerificationReportId: pvForVehicle?.Id || null,
          generatedDate: uvr.CreatedAt
        };
      });

      return Result.success(vehicleDetailWithReports);
    } catch (error) {
      logger.error('Get vehicle detail with reports error:', error);
      return Result.failure(error.message || 'Failed to get reports');
    }
  }

  /**
   * Upload and send physical verification report
   * Matches .NET: UploadAndSendPhysicalVerificationReportAsync
   */
  async uploadAndSendPhysicalVerificationReportAsync(request) {
    try {
      const physicalVerification = await PhysicalVerification.findByPk(request.physicalVerificationId);
      if (!physicalVerification) {
        return Result.failure('Physical verification not found');
      }

      // Upload report (store file bytes)
      const fileBytes = request.file.buffer;
      await physicalVerification.update({
        Report: fileBytes,
        ReportGeneratedAt: new Date(),
        Status: 'Complete'
      });

      // Send email if requested
      if (request.sendMail) {
        const user = await User.findByPk(physicalVerification.UserId);
        if (user) {
          const message = `
            <p>Dear ${user.UserName},</p>
            <p>Your Physical Verification Report is ready.</p>
            <p>Best regards,</p>
            <p>Motopsy</p>`;

          await emailService.sendEmailWithAttachmentAsync(
            user.Email,
            'Physical Verification Report',
            message,
            fileBytes,
            request.file.originalname
          );
        }
      }

      return Result.success();
    } catch (error) {
      logger.error('Upload and send physical verification report error:', error);
      return Result.failure(error.message || 'Failed to upload report');
    }
  }

  /**
   * Get NCRB report by ID
   * Matches .NET: GetNcrbReportByIdAsync
   */
  async getNcrbReportByIdAsync(reportId) {
    try {
      // Find vehicle detail that has this NCRB report
      const vehicleDetail = await VehicleDetail.findOne({
        where: { Id: reportId },
        attributes: ['NcrbReportData']
      });

      return vehicleDetail?.NcrbReportData || null;
    } catch (error) {
      logger.error('Get NCRB report by ID error:', error);
      throw error;
    }
  }

  /**
   * Transform VehicleDetail to VehicleReportDto (camelCase)
   */
  transformToVehicleReportDto(vehicleDetail) {
    if (!vehicleDetail) return null;

    return {
      id: vehicleDetail.Id,
      registrationNumber: vehicleDetail.RegistrationNumber,
      ownerName: vehicleDetail.OwnerName,
      registrationDate: vehicleDetail.RegistrationDate,
      manufacturer: vehicleDetail.Manufacturer,
      model: vehicleDetail.Model,
      variant: vehicleDetail.Variant,
      yearOfManufacture: vehicleDetail.YearOfManufacture,
      vehicleClass: vehicleDetail.VehicleClass,
      fuelType: vehicleDetail.FuelType,
      color: vehicleDetail.Color,
      chassisNumber: vehicleDetail.ChassisNumber,
      engineNumber: vehicleDetail.EngineNumber,
      registeredAt: vehicleDetail.RegisteredAt,
      registeredCity: vehicleDetail.RegisteredCity,
      registeredState: vehicleDetail.RegisteredState,
      rtoCode: vehicleDetail.RTOCode,
      ownerSerialNumber: vehicleDetail.OwnerSerialNumber,
      insuranceValidUpto: vehicleDetail.InsuranceValidUpto,
      insuranceCompany: vehicleDetail.InsuranceCompany,
      policyNumber: vehicleDetail.PolicyNumber,
      fitnessValidUpto: vehicleDetail.FitnessValidUpto,
      pucValidUpto: vehicleDetail.PUCValidUpto,
      permitValidUpto: vehicleDetail.PermitValidUpto,
      createdAt: vehicleDetail.CreatedAt
    };
  }
}

module.exports = new VehicleReportService();
