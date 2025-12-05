const Razorpay = require('razorpay');
const crypto = require('crypto');
const Result = require('../utils/result');
const logger = require('../config/logger');
const PaymentHistory = require('../models/payment-history.model');
const VehicleDetailRequest = require('../models/vehicle-detail-request.model');
const User = require('../models/user.model');
const userActivityLogService = require('./user-activity-log.service');
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
   * Matches .NET API VerifyPayment implementation
   */
  async verifyPayment(request) {
    try {
      // Log request for debugging
      logger.info('Verify payment request:', JSON.stringify(request));

      // Accept multiple formats: .NET (RazorpayOrderId), camelCase (razorpayOrderId), snake_case (razorpay_order_id)
      const razorpayOrderId = request.RazorpayOrderId || request.razorpayOrderId || request.razorpay_order_id || request.orderId;
      const razorpayPaymentId = request.RazorpayPaymentId || request.razorpayPaymentId || request.razorpay_payment_id || request.paymentId;
      const razorpaySignature = request.RazorpaySignature || request.razorpaySignature || request.razorpay_signature || request.signature;
      const paymentHistoryId = request.PaymentHistoryId || request.paymentHistoryId;
      const registrationNumber = request.RegistrationNumber || request.registrationNumber;

      // Validate required fields
      const missingFields = [];
      if (!razorpayOrderId) missingFields.push('razorpayOrderId');
      if (!razorpayPaymentId) missingFields.push('razorpayPaymentId');
      if (!razorpaySignature) missingFields.push('razorpaySignature');
      if (!paymentHistoryId) missingFields.push('paymentHistoryId');
      if (!registrationNumber) missingFields.push('registrationNumber');

      if (missingFields.length > 0) {
        const errorMsg = `Missing required fields: ${missingFields.join(', ')}`;
        logger.error(`Payment verification error: ${errorMsg}`);
        return Result.failure(errorMsg);
      }

      // Fetch payment details from Razorpay to get payment method
      const payment = await razorpay.payments.fetch(razorpayPaymentId);
      const paymentMethodString = payment.method || 'card';

      // Map Razorpay payment method to our enum (0=Card, 1=Netbanking, 2=Wallet, 3=PayLater, 4=UPI)
      const paymentMethodMap = {
        'card': 0,
        'netbanking': 1,
        'wallet': 2,
        'paylater': 3,
        'upi': 4
      };
      const paymentMethod = paymentMethodMap[paymentMethodString.toLowerCase()] || 0;

      // Create signature for verification
      const signaturePayload = `${razorpayOrderId}|${razorpayPaymentId}`;
      const expectedSignature = crypto
        .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
        .update(signaturePayload)
        .digest('hex');

      // Verify signature
      const isValid = expectedSignature.toLowerCase() === razorpaySignature.toLowerCase();

      // Get userId from payment history for activity logging
      const existingPaymentHistory = await PaymentHistory.findByPk(paymentHistoryId);
      const userId = existingPaymentHistory?.UserId || 0;

      if (!isValid) {
        logger.warn(`Payment verification failed for order: ${razorpayOrderId}`);

        // Log failed payment activity (matches .NET)
        if (userId) {
          await userActivityLogService.logActivityAsync(userId, 'PaymentFailed', 'Home', { ip: '0.0.0.0' });
        }

        return Result.failure('Signature verification failed.');
      }

      // Create VehicleDetailRequest record
      const maxVehicleRequest = await VehicleDetailRequest.findOne({
        attributes: [[sequelize.fn('MAX', sequelize.col('Id')), 'maxId']],
        raw: true
      });
      const nextVehicleRequestId = (maxVehicleRequest && maxVehicleRequest.maxId) ? maxVehicleRequest.maxId + 1 : 1;

      const vehicleDetailRequest = await VehicleDetailRequest.create({
        Id: nextVehicleRequestId,
        PaymentHistoryId: paymentHistoryId,
        RegistrationNumber: registrationNumber,
        Make: request.Make || request.make,
        Model: request.Model || request.model,
        Year: request.Year || request.year,
        Trim: request.Trim || request.trim,
        KmsDriven: request.KmsDriven || request.kmsDriven,
        City: request.City || request.city,
        NoOfOwners: request.NoOfOwners || request.noOfOwners,
        Version: request.Version || request.version,
        TransactionType: request.TransactionType || request.transactionType,
        CustomerType: request.CustomerType || request.customerType,
        CreatedAt: new Date()
      });

      // Update PaymentHistory record
      const paymentHistory = await PaymentHistory.findByPk(paymentHistoryId);
      if (!paymentHistory) {
        return Result.failure('Payment history not found');
      }

      paymentHistory.Status = 1; // Successful
      paymentHistory.Method = paymentMethod;
      paymentHistory.TransactionId = razorpayPaymentId;
      paymentHistory.VehicleDetailRequestId = vehicleDetailRequest.Id;
      paymentHistory.ModifiedAt = new Date();
      await paymentHistory.save();

      logger.info(`Payment verified successfully: ${razorpayPaymentId}, VehicleDetailRequestId: ${vehicleDetailRequest.Id}`);

      // Log successful payment activity (matches .NET)
      await userActivityLogService.logActivityAsync(paymentHistory.UserId, 'PaymentSuccess', 'Home', { ip: '0.0.0.0' });

      // Return response matching .NET API format
      return Result.success({
        success: true,
        paymentHistoryId: paymentHistory.Id,
        vehicleDetailRequestId: vehicleDetailRequest.Id
      });
    } catch (error) {
      logger.error('Verify payment error:', error);
      return Result.failure(error.message || 'Payment verification failed');
    }
  }
}

module.exports = new PaymentService();
