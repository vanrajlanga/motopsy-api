const ApiController = require('./base.controller');
const paymentService = require('../services/payment.service');
const logger = require('../config/logger');

class PaymentController extends ApiController {
  /**
   * POST /api/payment/create-order
   * Create Razorpay payment order (requires auth)
   */
  async createOrder(req, res, next) {
    try {
      logger.info('Create order request body:', JSON.stringify(req.body));
      const result = await paymentService.createOrder(req.body, req.user.identity.name);
      return this.fromResult(result, res);
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/payment/verify-payment
   * Verify Razorpay payment
   */
  async verifyPayment(req, res, next) {
    try {
      const result = await paymentService.verifyPayment(req.body);
      return this.fromResult(result, res);
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/payment/validate-coupon
   * Validate coupon code and return discount details
   */
  async validateCoupon(req, res, next) {
    try {
      const { couponCode, amount } = req.body;
      const result = await paymentService.validateCoupon(couponCode, null, amount || null);
      return this.fromResult(result, res);
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new PaymentController();
