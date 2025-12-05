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
      id: payment.Id,
      paymentDate: payment.PaymentDate,
      amount: parseFloat(payment.Amount),
      paymentFor: payment.PaymentFor,
      method: payment.Method,
      status: payment.Status,
      reportGenerated: payment.VehicleDetailRequestId ? true : false,
      userId: payment.UserId,
      user: user ? {
        id: user.Id,
        name: `${user.FirstName || ''} ${user.LastName || ''}`.trim() || user.Email,
        emailAddress: user.Email,
        phoneNumber: user.PhoneNumber,
        isAdmin: user.IsAdmin,
        createdAt: user.CreatedAt
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
        where: { UserId: userId },
        order: [['PaymentDate', 'DESC']]
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
