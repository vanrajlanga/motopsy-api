const BaseController = require('./base.controller');
const userActivityLogService = require('../services/user-activity-log.service');

class UserActivityLogController extends BaseController {
  async getAll(req, res, next) {
    try {
      const result = await userActivityLogService.getAllAsync();
      return this.fromResult(result, res);
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new UserActivityLogController();
