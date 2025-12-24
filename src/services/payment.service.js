const Razorpay = require('razorpay');
const crypto = require('crypto');
const Result = require('../utils/result');
const logger = require('../config/logger');
const PaymentHistory = require('../models/payment-history.model');
const VehicleDetailRequest = require('../models/vehicle-detail-request.model');
const User = require('../models/user.model');
const userActivityLogService = require('./user-activity-log.service');
const couponService = require('./coupon.service');
const emailService = require('./email.service');
const pricingService = require('./pricing.service');
const invoiceService = require('./invoice.service');
const { sequelize } = require('../config/database');
require('dotenv').config();

// Initialize Razorpay instance
const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET
});

class PaymentService {
  /**
   * Validate coupon code and return discount details
   * Now uses dynamic coupon service instead of hardcoded coupons
   */
  async validateCoupon(couponCode, userId = null, orderAmount = null) {
    // Delegate to coupon service for dynamic validation
    return await couponService.validateCouponAsync(couponCode, userId, orderAmount);
  }

  /**
   * Create Razorpay order
   * Matches .NET API CreateOrder implementation
   * Now uses dynamic coupon service for validation and dynamic pricing
   */
  async createOrder(request, userEmail) {
    try {
      const { amount, paymentFor, currency = 'INR', couponCode, registrationNumber, kmsDriven } = request;

      // Validate required fields
      if (!amount && amount !== 0) {
        return Result.failure('Amount is required');
      }

      if (paymentFor === undefined || paymentFor === null) {
        return Result.failure('PaymentFor is required');
      }

      // Get configured amount from pricing service (dynamic pricing)
      const pricingResult = await pricingService.getVehicleHistoryPriceAsync();
      const configuredAmount = pricingResult.isSuccess ? pricingResult.value.amount : (parseInt(process.env.RAZORPAY_AMOUNT) || 799);

      // Variables to store coupon info for tracking
      let couponId = null;
      let originalAmount = configuredAmount;
      let discountAmount = 0;

      if (couponCode) {
        // Validate coupon using dynamic coupon service
        const couponResult = await couponService.validateCouponAsync(couponCode, null, configuredAmount);

        if (!couponResult.isSuccess) {
          return Result.failure(couponResult.error || 'Invalid coupon code');
        }

        const couponData = couponResult.value;
        const expectedAmount = couponData.finalAmount;

        if (amount !== expectedAmount) {
          return Result.failure('Amount does not match with applied coupon');
        }

        // Store coupon info for usage tracking
        couponId = couponData.couponId;
        originalAmount = couponData.originalAmount;
        discountAmount = couponData.discountAmount;

        logger.info(`Order created with coupon: ${couponCode}, couponId: ${couponId}, amount: ${amount}`);
      } else {
        // No coupon - amount must match configured amount
        if (amount !== configuredAmount) {
          return Result.failure('Amount does not match');
        }
      }

      // Find user
      const user = await User.findOne({
        where: { normalized_email: userEmail.toUpperCase() }
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
        attributes: [[sequelize.fn('MAX', sequelize.col('id')), 'maxId']],
        raw: true
      });
      const nextId = (maxPayment && maxPayment.maxId) ? maxPayment.maxId + 1 : 1;

      // Create PaymentHistory record with coupon info and vehicle details
      const paymentHistory = await PaymentHistory.create({
        id: nextId,
        user_id: user.id,
        amount: amount,
        payment_for: paymentFor,
        status: 0, // Pending
        order_id: order.id,
        payment_date: new Date(),
        created_at: new Date(),
        // Store coupon info for tracking after payment verification
        coupon_id: couponId,
        original_amount: originalAmount,
        discount_amount: discountAmount,
        // Store vehicle details for tracking (in case report generation fails)
        registration_number: registrationNumber ? registrationNumber.toUpperCase().replace(/\s/g, '') : null,
        kms_driven: kmsDriven ? parseInt(kmsDriven) : null
      });

      logger.info(`Razorpay order created for ${userEmail}: ${order.id}, paymentFor: ${paymentFor}, paymentHistoryId: ${paymentHistory.id}, couponId: ${couponId}`);

      // Return response matching .NET API format
      return Result.success({
        orderId: order.id,
        paymentHistoryId: paymentHistory.id
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
      const userId = existingPaymentHistory?.user_id || 0;

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
        attributes: [[sequelize.fn('MAX', sequelize.col('id')), 'maxId']],
        raw: true
      });
      const nextVehicleRequestId = (maxVehicleRequest && maxVehicleRequest.maxId) ? maxVehicleRequest.maxId + 1 : 1;

      const vehicleDetailRequest = await VehicleDetailRequest.create({
        id: nextVehicleRequestId,
        user_id: userId,
        payment_history_id: paymentHistoryId,
        registration_number: registrationNumber,
        make: request.Make || request.make,
        model: request.Model || request.model,
        year: request.Year || request.year,
        trim: request.Trim || request.trim,
        kms_driven: request.KmsDriven || request.kmsDriven,
        city: request.City || request.city,
        no_of_owners: request.NoOfOwners || request.noOfOwners,
        version: request.Version || request.version,
        transaction_type: request.TransactionType || request.transactionType,
        customer_type: request.CustomerType || request.customerType,
        created_at: new Date()
      });

      // Update PaymentHistory record
      // Note: In .NET API, PaymentHistory does NOT have VehicleDetailRequestId column
      // The relationship is: VehicleDetailRequest has PaymentHistoryId pointing to PaymentHistory
      const paymentHistory = await PaymentHistory.findByPk(paymentHistoryId);
      if (!paymentHistory) {
        return Result.failure('Payment history not found');
      }

      paymentHistory.status = 1; // Successful
      paymentHistory.method = paymentMethod;
      paymentHistory.transaction_id = razorpayPaymentId;
      paymentHistory.modified_at = new Date();
      await paymentHistory.save();

      logger.info(`Payment verified successfully: ${razorpayPaymentId}, VehicleDetailRequestId: ${vehicleDetailRequest.id}`);

      // Record coupon usage if a coupon was applied
      if (paymentHistory.coupon_id) {
        await couponService.recordUsageAsync(
          paymentHistory.coupon_id,
          paymentHistory.user_id,
          paymentHistory.id,
          paymentHistory.original_amount || paymentHistory.amount,
          paymentHistory.discount_amount || 0,
          paymentHistory.amount
        );
        logger.info(`Coupon usage recorded for payment ${paymentHistory.id}, couponId: ${paymentHistory.coupon_id}`);
      }

      // Log successful payment activity (matches .NET)
      await userActivityLogService.logActivityAsync(paymentHistory.user_id, 'PaymentSuccess', 'Home', { ip: '0.0.0.0' });

      // Send email notifications about the payment
      try {
        const user = await User.findByPk(paymentHistory.user_id);
        if (user) {
          // Construct user name from first_name and last_name
          const userName = [user.first_name, user.last_name].filter(Boolean).join(' ') || user.user_name || null;

          // Generate invoice for the payment
          let invoiceAttachment = null;
          try {
            const invoiceResult = await invoiceService.createInvoice({
              paymentHistoryId: paymentHistory.id,
              userId: user.id,
              customerName: userName || user.email,
              customerEmail: user.email,
              customerPhone: user.phone_number || null,
              registrationNumber: registrationNumber,
              description: 'Vehicle History Report',
              quantity: 1,
              totalAmount: parseFloat(paymentHistory.amount)
            });

            invoiceAttachment = {
              buffer: invoiceResult.pdfBuffer,
              fileName: invoiceResult.fileName
            };
            logger.info(`Invoice generated: ${invoiceResult.invoice.invoice_number} for payment ${paymentHistory.id}`);
          } catch (invoiceError) {
            logger.error('Failed to generate invoice:', invoiceError);
            // Continue with email without invoice attachment
          }

          // Send notification to admin (no button)
          await emailService.sendPaymentNotificationToAdminAsync(
            user.email,
            userName,
            registrationNumber,
            paymentHistory.amount,
            paymentMethod,
            vehicleDetailRequest.id,
            user.id
          );

          // Send notification to user with View Report button and invoice attachment
          await emailService.sendPaymentSuccessToUserAsync(
            user.email,
            userName,
            registrationNumber,
            paymentHistory.amount,
            vehicleDetailRequest.id,
            user.id,
            invoiceAttachment
          );
        }
      } catch (emailError) {
        // Log email error but don't fail the payment verification
        logger.error('Failed to send payment notification emails:', emailError);
      }

      // Return response matching .NET API format
      return Result.success({
        success: true,
        paymentHistoryId: paymentHistory.id,
        vehicleDetailRequestId: vehicleDetailRequest.id
      });
    } catch (error) {
      logger.error('Verify payment error:', error);
      return Result.failure(error.message || 'Payment verification failed');
    }
  }
}

module.exports = new PaymentService();
