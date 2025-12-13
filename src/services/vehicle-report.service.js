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
        where: { registration_number: cleanRegNo }
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
        where: { id: vehicleReportId },
        attributes: ['report']
      });

      if (!report || !report.report) {
        return Result.success(null);
      }

      return Result.success(report.report);
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
        ncrb_report_data: fileBytes,
        ncrb_report_file_name: dto.ncrbReport.originalname,
        ncrb_report_updated_at: new Date()
      });

      // Send email if requested
      if (dto.sendMail) {
        const message = `
          <p>Dear ${user.user_name},</p>
          <p>Thank you for your recent purchase of a Vehicle History Report from Motopsy.com.</p>
          <p>We are pleased to confirm that the NCRB Vehicle NOC, which is an integral part of your Vehicle History Report, is attached to this email.</p>
          <p>We are grateful for your patronage and look forward to serving you again in the future.</p>
          <p>Best regards,</p>
          <p>Atul Bawa</p>
          <p>Motopsy.com</p>`;

        await emailService.sendEmailWithAttachmentAsync(
          user.email,
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
   * Returns VehicleHistoryReportDto[] format
   */
  async getVehicleHistoryReportsAsync(userEmail) {
    try {
      const user = await User.findOne({ where: { email: userEmail } });
      if (!user) {
        return Result.failure('Not found');
      }

      const reports = await VehicleDetail.findAll({
        where: { user_id: user.id },
        order: [['created_at', 'DESC']]
      });

      // Transform to VehicleHistoryReportDto - matches .NET API format
      const vehicleHistoryReports = reports.map(r => ({
        vehicleHistoryReportId: r.id,
        vehicleReportId: r.id,
        registrationNumber: r.registration_number,
        makerDescription: r.maker_description || r.manufacturer || '',
        makerModel: r.maker_model || r.model || '',
        createdAt: r.created_at
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
      const user = await User.findOne({ where: { email: userEmail } });
      if (!user) {
        return Result.failure('Not found');
      }

      const reports = await PhysicalVerification.findAll({
        where: { user_id: user.id },
        order: [['created_at', 'DESC']]
      });

      // Transform to GetPhysicalVerificationReportsResponse (matches .NET API exactly)
      const physicalVerificationReports = reports.map(r => ({
        id: r.id,
        registrationNumber: r.registration_number,
        status: r.status
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
        where: { id: id },
        attributes: ['report']
      });

      return report?.report || null;
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
        where: { user_id: user.id },
        order: [['created_at', 'DESC']]
      });

      const userPhysicalVerifications = await PhysicalVerification.findAll({
        where: { user_id: user.id }
      });

      // Map to VehicleDetailWithReportDto
      const vehicleDetailWithReports = userVehicleHistoryReports.map(uvr => {
        const pvForVehicle = userPhysicalVerifications.find(
          x => x.registration_number === uvr.registration_number
        );

        return {
          registrationNumber: uvr.registration_number,
          vehicleDetailId: uvr.id,
          physicalVerificationReport: !!pvForVehicle,
          ncrbReport: !!uvr.ncrb_report_data,
          ncrbReportId: uvr.ncrb_report_data ? uvr.id : null,
          physicalVerificationReportId: pvForVehicle?.id || null,
          generatedDate: uvr.created_at
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
        report: fileBytes,
        report_generated_at: new Date(),
        status: 'Complete'
      });

      // Send email if requested
      if (request.sendMail) {
        const user = await User.findByPk(physicalVerification.user_id);
        if (user) {
          const message = `
            <p>Dear ${user.user_name},</p>
            <p>Your Physical Verification Report is ready.</p>
            <p>Best regards,</p>
            <p>Motopsy</p>`;

          await emailService.sendEmailWithAttachmentAsync(
            user.email,
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
        where: { id: reportId },
        attributes: ['ncrb_report_data']
      });

      return vehicleDetail?.ncrb_report_data || null;
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
      id: vehicleDetail.id,
      registrationNumber: vehicleDetail.registration_number,
      ownerName: vehicleDetail.owner_name,
      registrationDate: vehicleDetail.registration_date,
      manufacturer: vehicleDetail.manufacturer,
      model: vehicleDetail.model,
      variant: vehicleDetail.variant,
      yearOfManufacture: vehicleDetail.year_of_manufacture,
      vehicleClass: vehicleDetail.vehicle_class,
      fuelType: vehicleDetail.fuel_type,
      color: vehicleDetail.color,
      chassisNumber: vehicleDetail.chassis_number,
      engineNumber: vehicleDetail.engine_number,
      registeredAt: vehicleDetail.registered_at,
      registeredCity: vehicleDetail.registered_city,
      registeredState: vehicleDetail.registered_state,
      rtoCode: vehicleDetail.rto_code,
      ownerSerialNumber: vehicleDetail.owner_serial_number,
      insuranceValidUpto: vehicleDetail.insurance_valid_upto,
      insuranceCompany: vehicleDetail.insurance_company,
      policyNumber: vehicleDetail.policy_number,
      fitnessValidUpto: vehicleDetail.fitness_upto,
      pucValidUpto: vehicleDetail.pucc_upto,
      permitValidUpto: vehicleDetail.permit_valid_upto,
      createdAt: vehicleDetail.created_at
    };
  }
}

module.exports = new VehicleReportService();
