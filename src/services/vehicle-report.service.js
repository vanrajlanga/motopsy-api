const VehicleDetail = require('../models/vehicle-detail.model');
const PhysicalVerification = require('../models/physical-verification.model');
const LostVehicle = require('../models/lost-vehicle.model');
const VehicleSpecification = require('../models/vehicle-specification.model');
const Result = require('../utils/result');
const logger = require('../config/logger');
const emailService = require('./email.service');
const { Op } = require('sequelize');

class VehicleReportService {
  async getVehicleReportAsync(registrationNumber, userId) {
    try {
      logger.info(`Getting vehicle report for: ${registrationNumber}`);

      const cleanRegNo = registrationNumber.replace(/\s/g, '').toUpperCase();

      // Get vehicle details from database
      const vehicleDetail = await VehicleDetail.findOne({
        where: { RegistrationNumber: cleanRegNo }
      });

      // Check if vehicle is stolen
      const stolenVehicle = await LostVehicle.findOne({
        where: { RegistrationNumber: cleanRegNo }
      });

      // Get physical verification records
      const physicalVerifications = await PhysicalVerification.findAll({
        where: { RegistrationNumber: cleanRegNo },
        order: [['CreatedAt', 'DESC']],
        limit: 5
      });

      // Search for vehicle specifications
      let specifications = null;
      if (vehicleDetail) {
        specifications = await VehicleSpecification.findOne({
          where: {
            [Op.or]: [
              { naming_model: { [Op.like]: `%${vehicleDetail.Model}%` } },
              { naming_make: { [Op.like]: `%${vehicleDetail.Manufacturer}%` } }
            ]
          }
        });
      }

      // Generate comprehensive report
      const report = {
        registrationNumber: cleanRegNo,
        generatedAt: new Date(),
        generatedBy: userId,

        // Basic Vehicle Information
        basicInfo: vehicleDetail ? {
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
          engineNumber: vehicleDetail.EngineNumber
        } : null,

        // Registration Details
        registrationInfo: vehicleDetail ? {
          registrationNumber: vehicleDetail.RegistrationNumber,
          registeredAt: vehicleDetail.RegisteredAt,
          registeredCity: vehicleDetail.RegisteredCity,
          registeredState: vehicleDetail.RegisteredState,
          rtoCode: vehicleDetail.RTOCode,
          ownerSerialNumber: vehicleDetail.OwnerSerialNumber
        } : null,

        // Insurance & Fitness
        insurance: vehicleDetail ? {
          insuranceValidUpto: vehicleDetail.InsuranceValidUpto,
          insuranceCompany: vehicleDetail.InsuranceCompany,
          policyNumber: vehicleDetail.PolicyNumber
        } : null,

        fitness: vehicleDetail ? {
          fitnessValidUpto: vehicleDetail.FitnessValidUpto,
          pucValidUpto: vehicleDetail.PUCValidUpto,
          permitValidUpto: vehicleDetail.PermitValidUpto
        } : null,

        // Theft Status
        theftStatus: {
          isStolen: !!stolenVehicle,
          reportedDate: stolenVehicle ? stolenVehicle.CreatedAt : null,
          status: stolenVehicle ? 'STOLEN - DO NOT PURCHASE' : 'CLEAR'
        },

        // Physical Verification History
        verificationHistory: physicalVerifications.map(pv => ({
          id: pv.Id,
          date: pv.CreatedAt,
          status: pv.Status,
          remarks: pv.Remarks,
          location: pv.Location
        })),

        // Technical Specifications
        specifications: specifications ? {
          make: specifications.naming_make,
          model: specifications.naming_model,
          variant: specifications.naming_variant,
          displacement: specifications.spec_displacement_value,
          power: specifications.spec_power_value,
          torque: specifications.spec_torque_value,
          transmission: specifications.spec_transmission_value,
          fuelType: specifications.spec_fuel_type_value,
          seatingCapacity: specifications.spec_seating_capacity_value,
          bodyType: specifications.naming_body_type,
          segment: specifications.naming_segment
        } : null,

        // Summary
        summary: {
          totalRecords: 1 + (stolenVehicle ? 1 : 0) + physicalVerifications.length,
          hasBasicInfo: !!vehicleDetail,
          hasTheftRecord: !!stolenVehicle,
          hasVerificationHistory: physicalVerifications.length > 0,
          hasSpecifications: !!specifications,
          overallStatus: stolenVehicle ? 'HIGH_RISK' : (vehicleDetail ? 'VERIFIED' : 'NO_RECORDS_FOUND')
        }
      };

      // Send email with report if user has email
      if (userId) {
        const reportUrl = `${process.env.FRONTEND_URL}/reports/${registrationNumber}`;
        // Note: Would need to get user email from userId
        // await emailService.sendVehicleReportEmailAsync(userEmail, cleanRegNo, reportUrl);
      }

      logger.info(`Vehicle report generated for: ${cleanRegNo}`);

      return Result.success(report);
    } catch (error) {
      logger.error('Get vehicle report error:', error);
      return Result.failure(error.message || 'Failed to get vehicle report');
    }
  }

  async getVehicleHistoryReportAsync() {
    try {
      const reports = await VehicleDetail.findAll({
        order: [['CreatedAt', 'DESC']],
        limit: 100
      });
      return Result.success(reports);
    } catch (error) {
      logger.error('Get history reports error:', error);
      return Result.failure(error.message || 'Failed to get history reports');
    }
  }

  async getPhysicalVerificationReportsAsync() {
    try {
      const reports = await PhysicalVerification.findAll({
        where: { Status: 'Completed' },
        order: [['CreatedAt', 'DESC']],
        limit: 100
      });
      return Result.success(reports);
    } catch (error) {
      logger.error('Get PV reports error:', error);
      return Result.failure(error.message || 'Failed to get PV reports');
    }
  }

  async getVehicleHistoryReportCountAsync() {
    try {
      const count = await VehicleDetail.count();
      return Result.success({ count });
    } catch (error) {
      logger.error('Get count error:', error);
      return Result.failure(error.message || 'Failed to get count');
    }
  }

  async getListOfReportsGeneratedByUserAsync(userId) {
    try {
      const reports = await VehicleDetail.findAll({
        where: { UserId: userId },
        order: [['CreatedAt', 'DESC']]
      });
      return Result.success(reports);
    } catch (error) {
      logger.error('Get user reports error:', error);
      return Result.failure(error.message || 'Failed to get user reports');
    }
  }
}

module.exports = new VehicleReportService();
