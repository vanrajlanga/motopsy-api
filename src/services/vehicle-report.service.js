const VehicleDetail = require('../models/vehicle-detail.model');
const VehicleDetailRequest = require('../models/vehicle-detail-request.model');
const PaymentHistory = require('../models/payment-history.model');
const PhysicalVerification = require('../models/physical-verification.model');
const User = require('../models/user.model');
const NcrbReport = require('../models/ncrb-report.model');
const Result = require('../utils/result');
const logger = require('../config/logger');
const emailService = require('./email.service');
const { Op } = require('sequelize');
const { sequelize } = require('../config/database');
const fs = require('fs');

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
      const vehicleDetail = await VehicleDetail.findByPk(dto.vehicleDetailId);
      if (!vehicleDetail) {
        return Result.failure("Vehicle History Report doesn't exist");
      }

      // Get the owner of the vehicle report (not the admin uploading)
      const vehicleOwner = await User.findByPk(vehicleDetail.user_id);
      if (!vehicleOwner) {
        return Result.failure('Vehicle owner not found');
      }

      // Store the file bytes - handle both disk storage (path) and memory storage (buffer)
      let fileBytes;
      if (dto.ncrbReport.buffer) {
        fileBytes = dto.ncrbReport.buffer;
      } else if (dto.ncrbReport.path) {
        fileBytes = fs.readFileSync(dto.ncrbReport.path);
        // Clean up the temporary file after reading
        fs.unlinkSync(dto.ncrbReport.path);
      } else {
        logger.error('Invalid file upload - no buffer or path');
        return Result.failure('Invalid file upload');
      }

      // Check if NcrbReport exists for this vehicle detail, update or create
      const existingNcrbReport = await NcrbReport.findOne({
        where: { vehicle_detail_id: dto.vehicleDetailId }
      });

      if (existingNcrbReport) {
        // Update existing NCRB report
        await existingNcrbReport.update({
          report: fileBytes,
          modified_at: new Date()
        });
        logger.info(`Updated NCRB report for vehicle detail ID: ${dto.vehicleDetailId}`);
      } else {
        // Create new NCRB report
        await NcrbReport.create({
          report: fileBytes,
          vehicle_detail_id: dto.vehicleDetailId,
          created_at: new Date()
        });
        logger.info(`Created new NCRB report for vehicle detail ID: ${dto.vehicleDetailId}`);
      }

      // Send email if requested - send to the vehicle owner
      if (dto.sendMail) {
        logger.info(`Sending NCRB email to vehicle owner: ${vehicleOwner.email}, filename: ${dto.ncrbReport.originalname}, file size: ${fileBytes.length} bytes`);
        const userName = vehicleOwner.user_name || vehicleOwner.first_name || vehicleOwner.email;
        const message = `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <div style="background-color: #9c27b0; padding: 20px; text-align: center;">
              <h1 style="color: white; margin: 0;">Motopsy</h1>
            </div>
            <div style="padding: 30px; background-color: #f9f9f9;">
              <p style="font-size: 16px; color: #333;">Dear ${userName},</p>
              <p style="font-size: 14px; color: #555; line-height: 1.6;">
                Thank you for your recent purchase of a Vehicle History Report from Motopsy.com.
              </p>
              <p style="font-size: 14px; color: #555; line-height: 1.6;">
                We are pleased to confirm that the <strong>NCRB Vehicle NOC</strong>, which is an integral part of your
                Vehicle History Report, is attached to this email.
              </p>
              <div style="background-color: #e8f5e9; border-left: 4px solid #4caf50; padding: 15px; margin: 20px 0;">
                <p style="margin: 0; color: #2e7d32; font-size: 14px;">
                  <strong>Registration Number:</strong> ${vehicleDetail.registration_number}
                </p>
              </div>
              <p style="font-size: 14px; color: #555; line-height: 1.6;">
                We are grateful for your patronage and look forward to serving you again in the future.
              </p>
              <p style="font-size: 14px; color: #555; margin-top: 30px;">
                Best regards,<br>
                <strong>Team Motopsy</strong>
              </p>
            </div>
            <div style="background-color: #333; padding: 20px; text-align: center;">
              <p style="color: #999; font-size: 12px; margin: 0;">
                © ${new Date().getFullYear()} Motopsy Technologies Pvt. Ltd. All rights reserved.
              </p>
              <p style="color: #999; font-size: 12px; margin: 5px 0 0 0;">
                www.motopsy.com
              </p>
            </div>
          </div>`;

        // Use a descriptive filename with registration number
        const attachmentFilename = `NCRB_Report_${vehicleDetail.registration_number}.pdf`;

        await emailService.sendEmailWithAttachmentAsync(
          vehicleOwner.email,
          'NCRB Vehicle NOC Report - Motopsy',
          message,
          fileBytes,
          attachmentFilename
        );
        logger.info(`NCRB report email sent to: ${vehicleOwner.email}`);
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
   * Supports optional date range filtering
   */
  async getVehicleHistoryReportsCountAsync(startDate = null, endDate = null) {
    try {
      const whereClause = {};

      if (startDate && endDate) {
        whereClause.created_at = {
          [Op.between]: [new Date(startDate), new Date(endDate + ' 23:59:59')]
        };
      }

      const count = await VehicleDetail.count({ where: whereClause });
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
   * Now shows one entry per paid order (matching Order List behavior)
   */
  async getVehicleDetailWithReportsAsync(userId) {
    try {
      const user = await User.findByPk(userId);
      if (!user) {
        return Result.failure('User not found');
      }

      // Get ALL paid vehicle_detail_requests for this user (one per payment)
      const allPaidRequests = await VehicleDetailRequest.findAll({
        where: { user_id: user.id },
        include: [{
          model: PaymentHistory,
          as: 'PaymentHistory',
          where: { status: 1 }, // Only paid orders
          required: true
        }],
        order: [['created_at', 'DESC']]
      });

      // Get all vehicle_details for this user
      const userVehicleDetails = await VehicleDetail.findAll({
        where: { user_id: user.id }
      });

      // Create a map of vehicle_detail_request_id -> vehicle_detail
      const vehicleDetailByRequestId = {};
      // Create a map of registration_number -> latest vehicle_detail
      const vehicleDetailByRegNumber = {};

      userVehicleDetails.forEach(vd => {
        if (vd.vehicle_detail_request_id) {
          vehicleDetailByRequestId[vd.vehicle_detail_request_id] = vd;
        }
        // Keep the latest vehicle_detail for each registration number
        const regNo = vd.registration_number;
        if (!vehicleDetailByRegNumber[regNo] || new Date(vd.created_at) > new Date(vehicleDetailByRegNumber[regNo].created_at)) {
          vehicleDetailByRegNumber[regNo] = vd;
        }
      });

      // Get physical verifications
      const userPhysicalVerifications = await PhysicalVerification.findAll({
        where: { user_id: user.id }
      });

      // Get all NCRB reports for user's vehicle details
      const vehicleDetailIds = userVehicleDetails.map(v => v.id);
      const ncrbReports = vehicleDetailIds.length > 0 ? await NcrbReport.findAll({
        where: { vehicle_detail_id: { [Op.in]: vehicleDetailIds } }
      }) : [];

      // Map each paid request to a report entry
      const reports = allPaidRequests.map(req => {
        // Try to find vehicle_detail by request_id first, then by registration_number
        let vehicleDetail = vehicleDetailByRequestId[req.id] || vehicleDetailByRegNumber[req.registration_number] || null;

        const pvForVehicle = userPhysicalVerifications.find(
          x => x.registration_number === req.registration_number
        );

        const ncrbForVehicle = vehicleDetail ? ncrbReports.find(
          n => n.vehicle_detail_id === vehicleDetail.id
        ) : null;

        return {
          registrationNumber: req.registration_number,
          vehicleDetailId: vehicleDetail?.id || null,
          vehicleDetailRequestId: req.id,
          paymentHistoryId: req.payment_history_id,
          physicalVerificationReport: !!pvForVehicle,
          ncrbReport: !!ncrbForVehicle,
          ncrbReportId: ncrbForVehicle?.id || null,
          physicalVerificationReportId: pvForVehicle?.id || null,
          generatedDate: req.created_at,
          paymentDate: req.PaymentHistory?.payment_date || req.created_at,
          status: vehicleDetail ? 'generated' : 'pending'
        };
      });

      return Result.success(reports);
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
      // Find NCRB report by ID
      const ncrbReport = await NcrbReport.findByPk(reportId, {
        attributes: ['report']
      });

      if (!ncrbReport || !ncrbReport.report) {
        return null;
      }

      // Return as base64 string for frontend consumption
      return ncrbReport.report.toString('base64');
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
