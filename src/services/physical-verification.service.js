const PhysicalVerification = require('../models/physical-verification.model');
const { sequelize } = require('../config/database');
const Result = require('../utils/result');
const logger = require('../config/logger');
const { toDataSourceResult } = require('../utils/kendo-datasource');

class PhysicalVerificationService {
  /**
   * Get physical verifications list with Kendo DataSource support
   * Matches .NET: DataSourceResult with filtering/sorting
   */
  async getPhysicalVerificationsAsync(request) {
    try {
      const result = await toDataSourceResult(PhysicalVerification, request, {
        order: [['CreatedAt', 'DESC']],
        transform: (pv) => this.transformToDto(pv)
      });

      return Result.success(result);
    } catch (error) {
      logger.error('Get physical verifications error:', error);
      return Result.failure(error.message || 'Failed to get physical verifications');
    }
  }

  /**
   * Get all physical verifications for admin (with Kendo DataSource)
   * Matches .NET: GetPhysicalVerifications (Admin)
   */
  async getAllVerificationsAsync(request) {
    try {
      const result = await toDataSourceResult(PhysicalVerification, request, {
        order: [['CreatedAt', 'DESC']],
        transform: (pv) => this.transformToDto(pv)
      });

      return result;
    } catch (error) {
      logger.error('Get all verifications error:', error);
      throw error;
    }
  }

  /**
   * Transform to DTO (camelCase)
   */
  transformToDto(pv) {
    return {
      id: pv.Id,
      userId: pv.UserId,
      name: pv.Name,
      registrationNumber: pv.RegistrationNumber,
      appointmentAt: pv.AppointmentAt,
      status: pv.Status,
      address: pv.Address,
      city: pv.City,
      state: pv.State,
      pincode: pv.Pincode,
      country: pv.Country,
      description: pv.Description,
      reportGeneratedAt: pv.ReportGeneratedAt,
      createdAt: pv.CreatedAt
    };
  }

  /**
   * Get physical verification by ID
   */
  async getByIdAsync(id) {
    try {
      const verification = await PhysicalVerification.findByPk(id);

      if (!verification) {
        return Result.failure('Physical verification not found');
      }

      return Result.success(verification);
    } catch (error) {
      logger.error('Get physical verification error:', error);
      return Result.failure(error.message || 'Failed to get physical verification');
    }
  }

  /**
   * Create physical verification appointment
   * Matches .NET: CreatePhysicalVerificationAppointmentAsync(request, userName)
   */
  async createAppointmentAsync(request, userEmail) {
    try {
      const { name, appointmentAt, status, address, city, state, pincode, country, registrationNumber, description } = request;

      // Find user by email (matches .NET _userService.FindByNameAsync)
      const User = require('../models/user.model');
      const user = await User.findOne({ where: { Email: userEmail } });
      if (!user) {
        return Result.failure('User not found');
      }

      const maxVerification = await PhysicalVerification.findOne({
        attributes: [[sequelize.fn('MAX', sequelize.col('Id')), 'maxId']],
        raw: true
      });
      const nextId = (maxVerification && maxVerification.maxId) ? maxVerification.maxId + 1 : 1;

      const verification = await PhysicalVerification.create({
        Id: nextId,
        UserId: user.Id,
        Name: name,
        AppointmentAt: appointmentAt,
        Status: status || 'Pending',
        Address: address,
        City: city,
        State: state,
        Pincode: pincode,
        Country: country,
        RegistrationNumber: registrationNumber,
        Description: description,
        CreatedAt: new Date()
      });

      logger.info(`Physical verification appointment created: ${verification.Id}`);
      return Result.success();
    } catch (error) {
      logger.error('Create appointment error:', error);
      return Result.failure(error.message || 'Failed to create appointment');
    }
  }

  /**
   * Get physical verification count
   * Matches .NET: Returns raw integer
   */
  async getCountAsync() {
    try {
      const count = await PhysicalVerification.count();
      return count;  // Return raw number to match .NET
    } catch (error) {
      logger.error('Get count error:', error);
      throw error;
    }
  }

  /**
   * Get physical verifications by user
   */
  async getByUserAsync(userId) {
    try {
      const verifications = await PhysicalVerification.findAll({
        where: { UserId: userId },
        order: [['CreatedAt', 'DESC']]
      });

      return Result.success(verifications);
    } catch (error) {
      logger.error('Get user verifications error:', error);
      return Result.failure(error.message || 'Failed to get user verifications');
    }
  }

  /**
   * Get report by ID
   */
  async getReportByIdAsync(id) {
    try {
      const verification = await PhysicalVerification.findByPk(id);

      if (!verification) {
        return Result.failure('Physical verification not found');
      }

      if (!verification.ReportPath) {
        return Result.failure('Report not available yet');
      }

      return Result.success({
        id: verification.Id,
        reportPath: verification.ReportPath,
        status: verification.Status
      });
    } catch (error) {
      logger.error('Get report error:', error);
      return Result.failure(error.message || 'Failed to get report');
    }
  }
}

module.exports = new PhysicalVerificationService();
