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
        order: [['created_at', 'DESC']],
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
        order: [['created_at', 'DESC']],
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
      id: pv.id,
      userId: pv.user_id,
      name: pv.name,
      registrationNumber: pv.registration_number,
      appointmentAt: pv.appointment_at,
      status: pv.status,
      address: pv.address,
      city: pv.city,
      state: pv.state,
      pincode: pv.pincode,
      country: pv.country,
      description: pv.description,
      reportGeneratedAt: pv.report_generated_at,
      createdAt: pv.created_at
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
      const user = await User.findOne({ where: { email: userEmail } });
      if (!user) {
        return Result.failure('User not found');
      }

      const maxVerification = await PhysicalVerification.findOne({
        attributes: [[sequelize.fn('MAX', sequelize.col('id')), 'maxId']],
        raw: true
      });
      const nextId = (maxVerification && maxVerification.maxId) ? maxVerification.maxId + 1 : 1;

      const verification = await PhysicalVerification.create({
        id: nextId,
        user_id: user.id,
        name: name,
        appointment_at: appointmentAt,
        status: status || 'Pending',
        address: address,
        city: city,
        state: state,
        pincode: pincode,
        country: country,
        registration_number: registrationNumber,
        description: description,
        created_at: new Date()
      });

      logger.info(`Physical verification appointment created: ${verification.id}`);
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
        where: { user_id: userId },
        order: [['created_at', 'DESC']]
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

      if (!verification.report_path) {
        return Result.failure('Report not available yet');
      }

      return Result.success({
        id: verification.id,
        reportPath: verification.report_path,
        status: verification.status
      });
    } catch (error) {
      logger.error('Get report error:', error);
      return Result.failure(error.message || 'Failed to get report');
    }
  }
}

module.exports = new PhysicalVerificationService();
