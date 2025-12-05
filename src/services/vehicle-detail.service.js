const VehicleDetail = require('../models/vehicle-detail.model');
const { sequelize } = require('../config/database');
const Result = require('../utils/result');
const logger = require('../config/logger');
const surepassService = require('./surepass.service');

class VehicleDetailService {
  /**
   * Get vehicle details by registration number (RC number)
   * This would normally call external API (Surepass/Droom)
   */
  async getVehicleDetailsByRCAsync(request) {
    try {
      const { registrationNumber, userId } = request;

      if (!registrationNumber) {
        return Result.failure('Registration number is required');
      }

      // Check if vehicle details already exist in database
      let vehicleDetail = await VehicleDetail.findOne({
        where: { RegistrationNumber: registrationNumber }
      });

      if (vehicleDetail) {
        logger.info(`Vehicle details found in database: ${registrationNumber}`);
        return Result.success(vehicleDetail);
      }

      // Call Surepass API to fetch RC details
      const rcResult = await surepassService.verifyRCAsync(registrationNumber);

      if (!rcResult.isSuccess) {
        return Result.failure(rcResult.error);
      }

      // Save vehicle details to database
      const rcData = rcResult.value;
      const maxVehicle = await VehicleDetail.findOne({
        attributes: [[sequelize.fn('MAX', sequelize.col('Id')), 'maxId']],
        raw: true
      });
      const nextId = (maxVehicle && maxVehicle.maxId) ? maxVehicle.maxId + 1 : 1;

      vehicleDetail = await VehicleDetail.create({
        Id: nextId,
        UserId: userId,
        RegistrationNumber: rcData.registrationNumber,
        OwnerName: rcData.ownerName,
        VehicleClass: rcData.vehicleClass,
        FuelType: rcData.fuelType,
        Manufacturer: rcData.manufacturer,
        Model: rcData.model,
        RegistrationDate: rcData.registrationDate,
        RegisteredAt: rcData.registeredAt,
        ChassisNumber: rcData.chassisNumber,
        EngineNumber: rcData.engineNumber,
        InsuranceCompany: rcData.insuranceCompany,
        InsuranceValidUpto: rcData.insuranceValidUpto,
        FitnessValidUpto: rcData.fitnessValidUpto,
        PUCValidUpto: rcData.pucValidUpto,
        Status: 'Completed',
        CreatedAt: new Date()
      });

      logger.info(`Vehicle details fetched and saved: ${registrationNumber}`);
      return Result.success(vehicleDetail);
    } catch (error) {
      logger.error('Get vehicle details error:', error);
      return Result.failure(error.message || 'Failed to get vehicle details');
    }
  }

  /**
   * Get vehicle detail by ID and user ID
   */
  async getVehicleDetailByIdAsync(id, userId) {
    try {
      const vehicleDetail = await VehicleDetail.findOne({
        where: {
          Id: id,
          UserId: userId
        }
      });

      if (!vehicleDetail) {
        return Result.failure('Vehicle detail not found');
      }

      return Result.success(vehicleDetail);
    } catch (error) {
      logger.error('Get vehicle detail by ID error:', error);
      return Result.failure(error.message || 'Failed to get vehicle detail');
    }
  }

  /**
   * Get failed vehicle detail reports (admin only)
   */
  async getPaidVehicleDetailFailedReportsAsync() {
    try {
      const failedReports = await VehicleDetail.findAll({
        where: { Status: 'Failed' },
        order: [['CreatedAt', 'DESC']],
        limit: 100
      });

      return Result.success(failedReports);
    } catch (error) {
      logger.error('Get failed reports error:', error);
      return Result.failure(error.message || 'Failed to get failed reports');
    }
  }

  /**
   * Get pending vehicle detail reports
   */
  async getPendingReportsAsync() {
    try {
      const pendingReports = await VehicleDetail.findAll({
        where: { Status: 'Pending' },
        order: [['CreatedAt', 'DESC']],
        limit: 100
      });

      return Result.success(pendingReports);
    } catch (error) {
      logger.error('Get pending reports error:', error);
      return Result.failure(error.message || 'Failed to get pending reports');
    }
  }
}

module.exports = new VehicleDetailService();
