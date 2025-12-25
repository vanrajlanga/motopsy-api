const ApiController = require('./base.controller');
const userService = require('../services/user.service');

class UserController extends ApiController {
  /**
   * POST /api/user/update-password
   * Update user password (requires auth)
   */
  async updatePassword(req, res, next) {
    try {
      const result = await userService.updatePasswordAsync(req.body, req.user.identity.name);
      return this.fromResult(result, res);
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/user
   * Get users list with pagination
   */
  async getUsers(req, res, next) {
    try {
      const result = await userService.getUsers(req.body);
      return this.ok(result, res);
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/user/total-user-count
   * Get total user count
   * Supports optional startDate and endDate query params for filtering
   */
  async getTotalUserCount(req, res, next) {
    try {
      const { startDate, endDate } = req.query;
      const result = await userService.getTotalUserCountAsync(startDate, endDate);
      return this.fromResult(result, res);
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/user
   * Get logged in user details (requires auth)
   */
  async getLoggedInUser(req, res, next) {
    try {
      const result = await userService.getLoggedInUserAsync(req.user.identity.name);
      return this.fromResult(result, res);
    } catch (error) {
      next(error);
    }
  }

  /**
   * PUT /api/user/update-user
   * Update user details (requires auth)
   */
  async updateUser(req, res, next) {
    try {
      const result = await userService.updateUserAsync(req.user.identity.name, req.body);
      return this.fromResult(result, res);
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new UserController();
