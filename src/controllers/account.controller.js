const ApiController = require('./base.controller');
const accountService = require('../services/account.service');

class AccountController extends ApiController {
  /**
   * POST /api/account/register
   * Register new user
   */
  async register(req, res, next) {
    try {
      const result = await accountService.registerAsync(req.body);
      return this.fromResult(result, res);
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/account/email/confirm
   * Confirm email address
   */
  async confirmEmail(req, res, next) {
    try {
      const result = await accountService.confirmEmailAsync(req.body);
      return this.fromResult(result, res);
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/account/login
   * User login
   */
  async login(req, res, next) {
    try {
      const result = await accountService.loginAsync(req.body);
      return this.fromResult(result, res);
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/account/forgot-password
   * Forgot password
   */
  async forgotPassword(req, res, next) {
    try {
      const result = await accountService.forgetPasswordAsync(req.body);
      return this.fromResult(result, res);
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/account/reset-password
   * Reset password
   */
  async resetPassword(req, res, next) {
    try {
      const result = await accountService.resetPasswordAsync(req.body);
      return this.fromResult(result, res);
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/account/contact-us
   * Contact us form
   */
  async contactUs(req, res, next) {
    try {
      const result = await accountService.contactUsAsync(req.body);
      return this.fromResult(result, res);
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new AccountController();
