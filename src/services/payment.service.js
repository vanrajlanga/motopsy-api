const Razorpay = require('razorpay');
const crypto = require('crypto');
const Result = require('../utils/result');
const logger = require('../config/logger');
const PaymentHistory = require('../models/payment-history.model');
const User = require('../models/user.model');
const { sequelize } = require('../config/database');
require('dotenv').config();

// Initialize Razorpay instance
const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET
});

class PaymentService {
  /**
   * Create Razorpay order
   * Matches .NET API CreateOrder implementation
   */
  async createOrder(request, userEmail) {
    try {
      const { amount, paymentFor, currency = 'INR' } = request;

      // Validate required fields
      if (!amount) {
        return Result.failure('Amount is required');
      }

      if (paymentFor === undefined || paymentFor === null) {
        return Result.failure('PaymentFor is required');
      }

      // Validate amount matches configured amount
      const configuredAmount = parseInt(process.env.RAZORPAY_AMOUNT) || 799;
      if (amount !== configuredAmount) {
        return Result.failure('Amount does not match');
      }

      // Find user
      const user = await User.findOne({
        where: { NormalizedEmail: userEmail.toUpperCase() }
      });

      if (!user) {
        return Result.failure('User not found');
      }

      // Create Razorpay order
      const options = {
        amount: amount * 100, // Amount in paise (multiply by 100)
        currency: currency,
        payment_capture: 1 // Auto capture
      };

      const order = await razorpay.orders.create(options);

      if (!order || !order.id) {
        logger.error('Razorpay order creation returned null or invalid order');
        return Result.failure('Failed to create payment order');
      }

      // Get next available ID for PaymentHistory
      const maxPayment = await PaymentHistory.findOne({
        attributes: [[sequelize.fn('MAX', sequelize.col('Id')), 'maxId']],
        raw: true
      });
      const nextId = (maxPayment && maxPayment.maxId) ? maxPayment.maxId + 1 : 1;

      // Create PaymentHistory record
      const paymentHistory = await PaymentHistory.create({
        Id: nextId,
        UserId: user.Id,
        Amount: amount,
        PaymentFor: paymentFor,
        Status: 0, // Pending
        OrderId: order.id,
        PaymentDate: new Date(),
        CreatedAt: new Date()
      });

      logger.info(`Razorpay order created for ${userEmail}: ${order.id}, paymentFor: ${paymentFor}, paymentHistoryId: ${paymentHistory.Id}`);

      // Return response matching .NET API format
      return Result.success({
        orderId: order.id,
        paymentHistoryId: paymentHistory.Id
      });
    } catch (error) {
      logger.error('Create order error:', error);
      return Result.failure(error.message || 'Failed to create payment order');
    }
  }

  /**
   * Verify Razorpay payment signature
   */
  async verifyPayment(request) {
    try {
      // Log request for debugging
      logger.info('Verify payment request:', JSON.stringify(request));

      // Accept multiple formats: .NET (RazorpayOrderId), camelCase (razorpayOrderId), snake_case (razorpay_order_id)
      const orderId = request.RazorpayOrderId || request.razorpayOrderId || request.razorpay_order_id || request.orderId;
      const paymentId = request.RazorpayPaymentId || request.razorpayPaymentId || request.razorpay_payment_id || request.paymentId;
      const signature = request.RazorpaySignature || request.razorpaySignature || request.razorpay_signature || request.signature;

      // Validate required fields with specific error messages
      const missingFields = [];
      if (!orderId) missingFields.push('razorpayOrderId');
      if (!paymentId) missingFields.push('razorpayPaymentId');
      if (!signature) missingFields.push('razorpaySignature');

      if (missingFields.length > 0) {
        const errorMsg = `Missing required fields: ${missingFields.join(', ')}`;
        logger.error(`Payment verification error: ${errorMsg}`);
        return Result.failure(errorMsg);
      }

      // Create signature for verification
      const body = orderId + '|' + paymentId;
      const expectedSignature = crypto
        .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
        .update(body.toString())
        .digest('hex');

      // Verify signature
      const isValid = expectedSignature === signature;

      if (!isValid) {
        logger.warn(`Payment verification failed for order: ${orderId}`);
        return Result.failure('Payment verification failed');
      }

      // Fetch payment details from Razorpay
      const payment = await razorpay.payments.fetch(paymentId);

      logger.info(`Payment verified successfully: ${paymentId}`);

      // TODO: Save payment details to database
      // TODO: Update order status
      // TODO: Send confirmation email

      return Result.success({
        verified: true,
        paymentId: paymentId,
        orderId: orderId,
        amount: payment.amount,
        status: payment.status,
        method: payment.method,
        email: payment.email,
        contact: payment.contact
      });
    } catch (error) {
      logger.error('Verify payment error:', error);
      return Result.failure(error.message || 'Payment verification failed');
    }
  }
}

module.exports = new PaymentService();
