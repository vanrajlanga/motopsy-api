const Razorpay = require('razorpay');
const crypto = require('crypto');
const Result = require('../utils/result');
const logger = require('../config/logger');
require('dotenv').config();

// Initialize Razorpay instance
const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET
});

class PaymentService {
  /**
   * Create Razorpay order
   */
  async createOrder(request, userEmail) {
    try {
      const { amount, paymentFor, currency = 'INR' } = request;

      // Validate required fields
      if (!amount) {
        return Result.failure('Amount is required');
      }

      if (!paymentFor && paymentFor !== 0) {
        return Result.failure('PaymentFor is required');
      }

      // Use provided amount or default from config
      const orderAmount = amount || parseInt(process.env.RAZORPAY_AMOUNT) || 799;

      const options = {
        amount: orderAmount * 100, // Amount in paise (multiply by 100)
        currency: currency,
        receipt: `order_${Date.now()}`,
        payment_capture: 1, // Auto capture
        notes: {
          paymentFor: paymentFor,
          userEmail: userEmail
        }
      };

      const order = await razorpay.orders.create(options);

      logger.info(`Razorpay order created for ${userEmail}: ${order.id}, paymentFor: ${paymentFor}`);

      return Result.success({
        orderId: order.id,
        amount: order.amount,
        currency: order.currency,
        receipt: order.receipt,
        status: order.status,
        paymentFor: paymentFor,
        createdAt: order.created_at
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
      const {
        razorpay_order_id,
        razorpay_payment_id,
        razorpay_signature
      } = request;

      // Validate required fields
      if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
        return Result.failure('Missing payment verification parameters');
      }

      // Create signature for verification
      const body = razorpay_order_id + '|' + razorpay_payment_id;
      const expectedSignature = crypto
        .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
        .update(body.toString())
        .digest('hex');

      // Verify signature
      const isValid = expectedSignature === razorpay_signature;

      if (!isValid) {
        logger.warn(`Payment verification failed for order: ${razorpay_order_id}`);
        return Result.failure('Payment verification failed');
      }

      // Fetch payment details from Razorpay
      const payment = await razorpay.payments.fetch(razorpay_payment_id);

      logger.info(`Payment verified successfully: ${razorpay_payment_id}`);

      // TODO: Save payment details to database
      // TODO: Update order status
      // TODO: Send confirmation email

      return Result.success({
        verified: true,
        paymentId: razorpay_payment_id,
        orderId: razorpay_order_id,
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
