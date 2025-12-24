const PaymentHistory = require('../models/payment-history.model');
const User = require('../models/user.model');
const Result = require('../utils/result');
const logger = require('../config/logger');

class PaymentHistoryService {
  /**
   * Transform payment history to match .NET API PaymentHistoryDto
   */
  transformPaymentHistory(payment, user) {
    return {
      id: payment.id,
      paymentDate: payment.payment_date,
      amount: parseFloat(payment.amount),
      paymentFor: payment.payment_for,
      method: payment.method,
      status: payment.status,
      reportGenerated: payment.vehicle_detail_request_id ? true : false,
      registrationNumber: payment.registration_number || null,
      userId: payment.user_id,
      user: user ? {
        id: user.id,
        name: `${user.first_name || ''} ${user.last_name || ''}`.trim() || user.email,
        emailAddress: user.email,
        phoneNumber: user.phone_number,
        isAdmin: user.is_admin,
        createdAt: user.created_at
      } : null
    };
  }

  /**
   * Get payment history by user ID
   * Returns array of PaymentHistoryDto matching .NET API
   */
  async getByUserIdAsync(userId) {
    try {
      // Check if user exists
      const user = await User.findByPk(userId);
      if (!user) {
        return Result.failure('User not found');
      }

      const payments = await PaymentHistory.findAll({
        where: { user_id: userId },
        order: [['payment_date', 'DESC']]
      });

      // Transform to camelCase DTOs with user data
      const paymentDtos = payments.map(payment => {
        return this.transformPaymentHistory(payment, user);
      });

      logger.info(`Found ${paymentDtos.length} payments for user: ${userId}`);
      return Result.success(paymentDtos);
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
        user_id: userId,
        amount: amount,
        order_id: orderId,
        payment_id: paymentId,
        signature: signature,
        status: status,
        created_at: new Date()
      });

      logger.info(`Payment history created: ${payment.id}`);
      return Result.success(payment);
    } catch (error) {
      logger.error('Create payment history error:', error);
      return Result.failure(error.message || 'Failed to create payment history');
    }
  }
}

module.exports = new PaymentHistoryService();
