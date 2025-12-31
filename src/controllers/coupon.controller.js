const BaseController = require('./base.controller');
const couponService = require('../services/coupon.service');

class CouponController extends BaseController {
  /**
   * POST /api/coupon/list - Get all coupons with pagination (admin)
   */
  async getAllCoupons(req, res, next) {
    try {
      const result = await couponService.getAllCouponsAsync(req.body);
      return res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/coupon/:id - Get coupon by ID (admin)
   */
  async getById(req, res, next) {
    try {
      const { id } = req.params;
      const result = await couponService.getByIdAsync(parseInt(id));
      return this.fromResult(result, res);
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/coupon - Create coupon (admin)
   */
  async create(req, res, next) {
    try {
      const userId = req.user.userId;
      const result = await couponService.createAsync(req.body, parseInt(userId));
      return this.fromResult(result, res);
    } catch (error) {
      next(error);
    }
  }

  /**
   * PUT /api/coupon - Update coupon (admin)
   */
  async update(req, res, next) {
    try {
      const userId = req.user.userId;
      const result = await couponService.updateAsync(req.body, parseInt(userId));
      return this.fromResult(result, res);
    } catch (error) {
      next(error);
    }
  }

  /**
   * DELETE /api/coupon/:id - Delete coupon (admin)
   */
  async delete(req, res, next) {
    try {
      const { id } = req.params;
      const userId = req.user.userId;
      const result = await couponService.deleteAsync(parseInt(id), parseInt(userId));
      return this.fromResult(result, res);
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/coupon/validate - Validate coupon code (authenticated)
   */
  async validateCoupon(req, res, next) {
    try {
      const { couponCode, orderAmount } = req.body;
      const userId = req.user?.userId || null;
      const result = await couponService.validateCouponAsync(couponCode, userId, orderAmount);
      return this.fromResult(result, res);
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/coupon/active - Get active coupons for display (public - no auth required)
   */
  async getActiveCoupons(req, res, next) {
    try {
      console.log('>>> getActiveCoupons controller called - PUBLIC ROUTE');
      const result = await couponService.getActiveCouponsAsync();
      return this.fromResult(result, res);
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/coupon/:id/usage-history - Get usage history for a coupon (admin)
   */
  async getUsageHistory(req, res, next) {
    try {
      const { id } = req.params;
      const result = await couponService.getUsageHistoryAsync(parseInt(id), req.body);
      return this.fromResult(result, res);
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/coupon/:id/audit-log - Get audit log for a coupon (admin)
   */
  async getAuditLog(req, res, next) {
    try {
      const { id } = req.params;
      const result = await couponService.getAuditLogAsync(parseInt(id));
      return this.fromResult(result, res);
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new CouponController();
