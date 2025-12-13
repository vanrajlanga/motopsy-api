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
          attributes: ['id', 'email']
        }],
        order: [['created_at', 'DESC']]
      });

      // Group by user (matching .NET GroupBy logic)
      const groupedByUser = {};

      for (const log of logs) {
        const userId = log.user_id;
        const userEmail = log.User?.email || 'Unknown';

        if (!groupedByUser[userId]) {
          groupedByUser[userId] = {
            userId: userId,
            userEmail: userEmail,
            activityLogs: []
          };
        }

        groupedByUser[userId].activityLogs.push({
          createdAt: log.created_at,
          logAction: log.action,
          logScreen: log.screen
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
        attributes: [[sequelize.fn('MAX', sequelize.col('id')), 'maxId']],
        raw: true
      });
      const nextId = (maxLog && maxLog.maxId) ? maxLog.maxId + 1 : 1;

      await UserActivityLog.create({
        id: nextId,
        user_id: userId,
        action: action,
        screen: screen,
        ip_address: req.ip || req.connection?.remoteAddress || '0.0.0.0',
        user_agent: req.get ? req.get('user-agent') : null,
        created_at: new Date()
      });

      logger.info(`Activity logged: ${action} for user ${userId}`);
    } catch (error) {
      logger.error('Log activity error:', error);
    }
  }
}

module.exports = new UserActivityLogService();
