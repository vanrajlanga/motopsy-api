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
const servicePlanService = require('./service-plan.service');
const serviceOrderService = require('./service-order.service');
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
      const { amount, paymentFor, currency = 'INR', couponCode, originalAmount: clientOriginalAmount, registrationNumber, kmsDriven, servicePlanOptionId, servicePlanId, serviceData } = request;

      // Validate required fields
      if (!amount && amount !== 0) {
        return Result.failure('Amount is required');
      }

      if (paymentFor === undefined || paymentFor === null) {
        return Result.failure('PaymentFor is required');
      }

      let configuredAmount;

      // Check if this is a service order (payment_for >= 3)
      if (paymentFor >= 3) {
        // This is a service order (PDI or Service History Report)
        if (servicePlanOptionId) {
          // Brand-specific pricing
          try {
            const pricingOption = await servicePlanService.getPricingOptionByIdAsync(servicePlanOptionId);
            if (!pricingOption) {
              logger.error(`Pricing option not found for ID: ${servicePlanOptionId}`);
              return Result.failure(`Pricing option with ID ${servicePlanOptionId} not found`);
            }
            configuredAmount = parseFloat(pricingOption.amount);
          } catch (error) {
            logger.error(`Error fetching pricing option ${servicePlanOptionId}:`, error.message);
            return Result.failure(`Invalid pricing option: ${error.message}`);
          }
        } else if (servicePlanId) {
          // Using default pricing (for brands without specific pricing)
          const servicePlan = await servicePlanService.getServicePlanByIdAsync(servicePlanId);
          if (!servicePlan) {
            return Result.failure('Service plan not found');
          }
          // If default_amount is 0, it means dynamic pricing (e.g., combo plans)
          // When a coupon is applied, use the originalAmount (pre-discount) sent by the frontend
          // so coupon re-validation is done against the correct base price.
          if (servicePlan.default_amount === 0 || servicePlan.default_amount === '0' || servicePlan.default_amount === null) {
            configuredAmount = (couponCode && clientOriginalAmount) ? parseFloat(clientOriginalAmount) : amount;
          } else {
            configuredAmount = parseFloat(servicePlan.default_amount);
          }
        } else {
          return Result.failure('Either service plan option ID or service plan ID is required');
        }
      } else {
        // Get configured amount from pricing service (dynamic pricing) for vehicle history reports
        const pricingResult = await pricingService.getVehicleHistoryPriceAsync();
        configuredAmount = pricingResult.isSuccess ? pricingResult.value.amount : (parseInt(process.env.RAZORPAY_AMOUNT) || 799);
      }

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
          logger.error(`Amount mismatch: Frontend sent ${amount}, Backend expects ${configuredAmount}, servicePlanOptionId: ${servicePlanOptionId}, servicePlanId: ${servicePlanId}`);
          return Result.failure(`Amount does not match. Expected: ₹${configuredAmount}, Received: ₹${amount}`);
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
        kms_driven: kmsDriven ? parseInt(kmsDriven) : null,
        // Store service data temporarily for service orders
        service_plan_option_id: servicePlanOptionId || null,
        service_plan_id: servicePlanId || null,
        service_data: serviceData ? JSON.stringify(serviceData) : null
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

      // Registration number only required for vehicle history reports, not service orders
      // Note: We'll check payment_for after fetching payment history

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

      // Check if this is a service order (payment_for >= 3)
      const isServiceOrder = existingPaymentHistory && existingPaymentHistory.payment_for >= 3;
      let vehicleDetailRequest = null;
      let serviceOrder = null;

      // For vehicle history reports, registration number is required
      if (!isServiceOrder && !registrationNumber) {
        logger.error('Payment verification error: registrationNumber is required for vehicle history reports');
        return Result.failure('Missing required field: registrationNumber');
      }

      if (isServiceOrder) {
        // Handle service order creation
        try {
          const serviceData = existingPaymentHistory.service_data ? JSON.parse(existingPaymentHistory.service_data) : {};
          const servicePlanOptionId = existingPaymentHistory.service_plan_option_id;
          const servicePlanId = existingPaymentHistory.service_plan_id;

          let finalServicePlanId = servicePlanId;
          let pricingOption = null;

          // If servicePlanOptionId exists, get the service plan from the option
          if (servicePlanOptionId) {
            pricingOption = await servicePlanService.getPricingOptionByIdAsync(servicePlanOptionId);
            if (pricingOption) {
              finalServicePlanId = pricingOption.service_plan_id;
            }
          }

          // FALLBACK: If no service plan ID found, try to determine from servicePackageName
          if (!finalServicePlanId && serviceData.servicePackageName) {
            logger.info(`Attempting to find service plan from package name: ${serviceData.servicePackageName}`);

            // Check if it's the combo plan
            if (serviceData.servicePackageName.includes('Vehicle Intelligence') &&
                serviceData.servicePackageName.includes('Service History')) {
              try {
                const comboPlan = await servicePlanService.getServicePlanByKeyAsync('vehicle_intelligence_service_history');
                if (comboPlan) {
                  finalServicePlanId = comboPlan.id;
                  logger.info(`Found combo service plan with ID: ${finalServicePlanId}`);
                }
              } catch (error) {
                logger.error('Failed to find combo service plan:', error);
              }
            }
            // Check if it's Safety Pack
            else if (serviceData.servicePackageName.includes('Safety Pack')) {
              try {
                const safetyPackPlan = await servicePlanService.getServicePlanByKeyAsync('safety_pack');
                if (safetyPackPlan) {
                  finalServicePlanId = safetyPackPlan.id;
                  logger.info(`Found Safety Pack service plan with ID: ${finalServicePlanId}`);
                }
              } catch (error) {
                logger.error('Failed to find Safety Pack service plan:', error);
              }
            }
            // Check if it's Inspection Only
            else if (serviceData.servicePackageName.includes('Inspection Only')) {
              try {
                const inspectionOnlyPlan = await servicePlanService.getServicePlanByKeyAsync('inspection_only');
                if (inspectionOnlyPlan) {
                  finalServicePlanId = inspectionOnlyPlan.id;
                  logger.info(`Found Inspection Only service plan with ID: ${finalServicePlanId}`);
                }
              } catch (error) {
                logger.error('Failed to find Inspection Only service plan:', error);
              }
            }
          }

          // If still no service plan ID found, throw error
          if (!finalServicePlanId) {
            logger.error('Service plan ID not found. servicePlanId:', servicePlanId, 'servicePlanOptionId:', servicePlanOptionId, 'servicePackageName:', serviceData.servicePackageName);
            throw new Error('Service plan ID not found');
          }

          // Map camelCase to snake_case for service order creation
          serviceOrder = await serviceOrderService.createServiceOrderAsync({
            user_id: userId,
            service_plan_id: finalServicePlanId,
            service_plan_option_id: servicePlanOptionId, // Can be null for default pricing
            service_package_name: serviceData.servicePackageName || null,
            amount: existingPaymentHistory.amount, // Store the amount paid at time of order
            name: serviceData.name,
            mobile_number: serviceData.mobileNumber,
            email: serviceData.email,
            car_company: serviceData.carCompany || null,
            car_model: serviceData.carModel || null,
            chassis_number: serviceData.chassisNumber || null,
            registration_number: serviceData.registrationNumber || null,
            car_model_year: serviceData.carModelYear || null,
            // Address (defaults to empty string when UI collection is disabled)
            state: serviceData.state || '',
            city: serviceData.city || null,
            address: serviceData.address || '',
            postcode: serviceData.postcode || '',
            order_notes: serviceData.orderNotes || null,
            // Appointment applies to physical inspection plans (Inspection Only, Safety Pack, PDI).
            // Vehicle Intelligence + Service History has no appointment form, so selectedDate is null there.
            appointment_date: serviceData.selectedDate ? serviceData.selectedDate.substring(0, 10) : null,
            appointment_time_slot: serviceData.selectedTimeSlot || null
          }, paymentHistoryId);

          logger.info(`Service order created: ${serviceOrder.id} for payment ${paymentHistoryId}`);

          // For combo plan (Vehicle Intelligence + Service History), also create a VehicleDetailRequest
          // so the Vehicle Intelligence report is generated and appears in Report History
          const isCombo = serviceData.servicePackageName &&
            serviceData.servicePackageName.includes('Vehicle Intelligence') &&
            serviceData.servicePackageName.includes('Service History');

          if (isCombo && serviceData.carNumber) {
            try {
              const maxVehicleRequest = await VehicleDetailRequest.findOne({
                attributes: [[sequelize.fn('MAX', sequelize.col('id')), 'maxId']],
                raw: true
              });
              const nextVehicleRequestId = (maxVehicleRequest && maxVehicleRequest.maxId) ? maxVehicleRequest.maxId + 1 : 1;

              vehicleDetailRequest = await VehicleDetailRequest.create({
                id: nextVehicleRequestId,
                user_id: userId,
                payment_history_id: paymentHistoryId,
                registration_number: serviceData.carNumber.toUpperCase().replace(/\s/g, ''),
                make: serviceData.carCompany || null,
                model: serviceData.carModel || null,
                created_at: new Date()
              });
              logger.info(`Combo plan: VehicleDetailRequest created: ${vehicleDetailRequest.id} for payment ${paymentHistoryId}`);
            } catch (comboError) {
              logger.error('Failed to create VehicleDetailRequest for combo plan:', comboError);
              // Don't fail the payment if this fails
            }
          }

          // Send email notifications for service order
          try {
            const user = await User.findByPk(userId);
            const servicePlan = await servicePlanService.getServicePlanByIdAsync(finalServicePlanId);

            if (user && servicePlan) {
              // Determine tier name (use brand name for default pricing)
              let tierName = 'Standard';
              if (pricingOption) {
                tierName = pricingOption.option_name;
              } else if (serviceData.carCompany) {
                tierName = serviceData.carCompany + ' (Default Pricing)';
              }

              const emailOrderDetails = {
                email: serviceData.email || user.email,
                name: serviceData.name || [user.first_name, user.last_name].filter(Boolean).join(' ') || user.user_name,
                serviceName: servicePlan.service_name,
                tierName: tierName,
                servicePackageName: serviceData.servicePackageName || null,
                amount: existingPaymentHistory.amount,
                orderId: serviceOrder.id,
                mobileNumber: serviceData.mobileNumber || serviceData.mobile_number || user.phone_number,
                // SERVICE ADDRESS DISABLED
                // address: serviceData.address,
                // city: serviceData.city,
                // state: serviceData.state,
                // postcode: serviceData.postcode,
                carCompany: serviceData.carCompany || serviceData.car_company,
                carModel: serviceData.carModel || serviceData.car_model,
                carModelYear: serviceData.carModelYear || serviceData.car_model_year,
                chassisNumber: serviceData.chassisNumber || serviceData.chassis_number,
                registrationNumber: serviceData.registrationNumber || serviceData.registration_number || serviceData.carNumber,
                orderNotes: serviceData.orderNotes || serviceData.order_notes,
                userId: userId,
                appointmentDate: serviceData.selectedDate || null,
                appointmentTimeSlot: serviceData.selectedTimeSlot || null
              };

              // Send confirmation email to user
              await emailService.sendServiceOrderConfirmationToUserAsync(emailOrderDetails);

              // Send notification email to admin
              await emailService.sendServiceOrderNotificationToAdminAsync(emailOrderDetails);

              logger.info(`Service order emails sent for order ${serviceOrder.id}`);
            }
          } catch (emailError) {
            logger.error('Failed to send service order emails:', emailError);
            // Don't fail the payment if emails fail
          }
        } catch (error) {
          logger.error('Failed to create service order:', error);
          // Continue with payment verification even if service order creation fails
        }
      } else {
        // Create VehicleDetailRequest record for vehicle history reports
        const maxVehicleRequest = await VehicleDetailRequest.findOne({
          attributes: [[sequelize.fn('MAX', sequelize.col('id')), 'maxId']],
          raw: true
        });
        const nextVehicleRequestId = (maxVehicleRequest && maxVehicleRequest.maxId) ? maxVehicleRequest.maxId + 1 : 1;

        vehicleDetailRequest = await VehicleDetailRequest.create({
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
      }

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
      // Store vehicle details in payment history for tracking
      paymentHistory.registration_number = registrationNumber ? registrationNumber.toUpperCase().replace(/\s/g, '') : null;
      paymentHistory.kms_driven = request.KmsDriven || request.kmsDriven || null;
      await paymentHistory.save();

      // Log based on payment type
      if (isServiceOrder) {
        logger.info(`Payment verified successfully: ${razorpayPaymentId}, ServiceOrderId: ${serviceOrder?.id || 'N/A'}`);
      } else {
        logger.info(`Payment verified successfully: ${razorpayPaymentId}, VehicleDetailRequestId: ${vehicleDetailRequest?.id || 'N/A'}`);
      }

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

      // Send email notifications for vehicle history reports only
      // Service order emails were already sent during service order creation
      if (!isServiceOrder) {
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
      }

      // Return response matching .NET API format
      const response = {
        success: true,
        paymentHistoryId: paymentHistory.id
      };

      if (vehicleDetailRequest) {
        response.vehicleDetailRequestId = vehicleDetailRequest.id;
      }

      if (serviceOrder) {
        response.serviceOrderId = serviceOrder.id;
      }

      return Result.success(response);
    } catch (error) {
      logger.error('Verify payment error:', error);
      return Result.failure(error.message || 'Payment verification failed');
    }
  }
}

module.exports = new PaymentService();
