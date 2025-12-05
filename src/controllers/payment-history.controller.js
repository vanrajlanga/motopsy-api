const BaseController = require('./base.controller');
const paymentHistoryService = require('../services/payment-history.service');

class PaymentHistoryController extends BaseController {
  /**
   * GET /api/paymentHistory/:userId
   */
  async getByUserId(req, res, next) {
    try {
      const { userId } = req.params;
      const result = await paymentHistoryService.getByUserIdAsync(parseInt(userId));
      return this.fromResult(result, res);
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new PaymentHistoryController();
