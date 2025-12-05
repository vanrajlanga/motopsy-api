const UserActivityLog = require('../models/user-activity-log.model');
const User = require('../models/user.model');
const { sequelize } = require('../config/database');
const Result = require('../utils/result');
const logger = require('../config/logger');

class UserActivityLogService {
  /**
   * Get all activity logs grouped by user
   * Matches .NET API response: List<UserActivityLogResponseDto>
   * where UserActivityLogResponseDto = { userId, userEmail, activityLogs: ActivityLogDto[] }
   */
  async getAllAsync() {
    try {
      // Get all logs with user info
      const logs = await UserActivityLog.findAll({
        include: [{
          model: User,
          as: 'User',
          attributes: ['Id', 'Email']
        }],
        order: [['CreatedAt', 'DESC']]
      });

      // Group by user (matching .NET GroupBy logic)
      const groupedByUser = {};

      for (const log of logs) {
        const userId = log.UserId;
        const userEmail = log.User?.Email || 'Unknown';

        if (!groupedByUser[userId]) {
          groupedByUser[userId] = {
            userId: userId,
            userEmail: userEmail,
            activityLogs: []
          };
        }

        groupedByUser[userId].activityLogs.push({
          createdAt: log.CreatedAt,
          logAction: log.Action,
          logScreen: log.Screen
        });
      }

      // Convert to array (matching .NET ToListAsync)
      const result = Object.values(groupedByUser);

      return Result.success(result);
    } catch (error) {
      logger.error('Get activity logs error:', error);
      return Result.failure(error.message || 'Failed to get activity logs');
    }
  }

  async logActivityAsync(userId, action, screen, req) {
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
        Screen: screen,
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
