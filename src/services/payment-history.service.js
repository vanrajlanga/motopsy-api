const PaymentHistory = require('../models/payment-history.model');
const Result = require('../utils/result');
const logger = require('../config/logger');

class PaymentHistoryService {
  /**
   * Get payment history by user ID
   */
  async getByUserIdAsync(userId) {
    try {
      const payments = await PaymentHistory.findAll({
        where: { UserId: userId },
        order: [['CreatedAt', 'DESC']]
      });

      logger.info(`Found ${payments.length} payments for user: ${userId}`);
      return Result.success(payments);
    } catch (error) {
      logger.error('Get payment history error:', error);
      return Result.failure(error.message || 'Failed to get payment history');
    }
  }

  /**
   * Create payment history record
   */
  async createAsync(request) {
    try {
      const { userId, amount, orderId, paymentId, signature, status } = request;

      const payment = await PaymentHistory.create({
        UserId: userId,
        Amount: amount,
        OrderId: orderId,
        PaymentId: paymentId,
        Signature: signature,
        Status: status,
        CreatedAt: new Date()
      });

      logger.info(`Payment history created: ${payment.Id}`);
      return Result.success(payment);
    } catch (error) {
      logger.error('Create payment history error:', error);
      return Result.failure(error.message || 'Failed to create payment history');
    }
  }
}

module.exports = new PaymentHistoryService();
