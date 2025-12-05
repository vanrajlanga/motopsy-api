const UserActivityLog = require('../models/user-activity-log.model');
const { sequelize } = require('../config/database');
const Result = require('../utils/result');
const logger = require('../config/logger');

class UserActivityLogService {
  async getAllAsync() {
    try {
      const logs = await UserActivityLog.findAll({
        order: [['CreatedAt', 'DESC']],
        limit: 1000
      });

      return Result.success(logs);
    } catch (error) {
      logger.error('Get activity logs error:', error);
      return Result.failure(error.message || 'Failed to get activity logs');
    }
  }

  async logActivityAsync(userId, action, details, req) {
    try {
      const maxLog = await UserActivityLog.findOne({
        attributes: [[sequelize.fn('MAX', sequelize.col('Id')), 'maxId']],
        raw: true
      });
      const nextId = (maxLog && maxLog.maxId) ? maxLog.maxId + 1 : 1;

      await UserActivityLog.create({
        Id: nextId,
        UserId: userId,
        Action: action,
        Details: JSON.stringify(details),
        IPAddress: req.ip || req.connection.remoteAddress,
        UserAgent: req.get('user-agent'),
        CreatedAt: new Date()
      });

      logger.info(`Activity logged: ${action} for user ${userId}`);
    } catch (error) {
      logger.error('Log activity error:', error);
    }
  }
}

module.exports = new UserActivityLogService();
