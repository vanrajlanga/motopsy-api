const PhysicalVerification = require('../models/physical-verification.model');
const { sequelize } = require('../config/database');
const Result = require('../utils/result');
const logger = require('../config/logger');

class PhysicalVerificationService {
  /**
   * Get physical verifications list
   */
  async getPhysicalVerificationsAsync(request) {
    try {
      const { skip = 0, take = 10 } = request;

      const verifications = await PhysicalVerification.findAndCountAll({
        offset: skip,
        limit: take,
        order: [['CreatedAt', 'DESC']]
      });

      return Result.success({
        data: verifications.rows,
        total: verifications.count
      });
    } catch (error) {
      logger.error('Get physical verifications error:', error);
      return Result.failure(error.message || 'Failed to get physical verifications');
    }
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
   */
  async createAppointmentAsync(request) {
    try {
      const { userId, registrationNumber, appointmentDate } = request;

      const maxVerification = await PhysicalVerification.findOne({
        attributes: [[sequelize.fn('MAX', sequelize.col('Id')), 'maxId']],
        raw: true
      });
      const nextId = (maxVerification && maxVerification.maxId) ? maxVerification.maxId + 1 : 1;

      const verification = await PhysicalVerification.create({
        Id: nextId,
        UserId: userId,
        RegistrationNumber: registrationNumber,
        AppointmentDate: appointmentDate,
        Status: 'Scheduled',
        CreatedAt: new Date()
      });

      logger.info(`Physical verification appointment created: ${verification.Id}`);
      return Result.success(verification);
    } catch (error) {
      logger.error('Create appointment error:', error);
      return Result.failure(error.message || 'Failed to create appointment');
    }
  }

  /**
   * Get physical verification count
   */
  async getCountAsync() {
    try {
      const count = await PhysicalVerification.count();
      return Result.success({ count });
    } catch (error) {
      logger.error('Get count error:', error);
      return Result.failure(error.message || 'Failed to get count');
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
