const PaymentHistory = require('../models/payment-history.model');
const User = require('../models/user.model');
const VehicleDetailRequest = require('../models/vehicle-detail-request.model');
const VehicleDetail = require('../models/vehicle-detail.model');
const Coupon = require('../models/coupon.model');
const Result = require('../utils/result');
const logger = require('../config/logger');
const { Op } = require('sequelize');
const { sequelize } = require('../config/database');

// Import models index to ensure associations are loaded
const models = require('../models/index');

class OrderService {
  /**
   * Get status name from status code
   */
  getStatusName(status) {
    const statusMap = {
      0: 'Pending',
      1: 'Successful',
      2: 'Failed',
      3: 'Not Verified',
      4: 'Refunded'
    };
    return statusMap[status] || 'Unknown';
  }

  /**
   * Get payment method name from method code
   */
  getMethodName(method) {
    const methodMap = {
      0: 'Card',
      1: 'Netbanking',
      2: 'Wallet',
      3: 'PayLater',
      4: 'UPI'
    };
    return methodMap[method] || 'Unknown';
  }

  /**
   * Get payment for name from payment_for code
   */
  getPaymentForName(paymentFor) {
    const paymentForMap = {
      0: 'Vehicle History Report',
      1: 'Physical Verification'
    };
    return paymentForMap[paymentFor] || 'Unknown';
  }

  /**
   * Transform payment history to Order DTO matching frontend interface
   * @param {Object} payment - Payment history with associations
   * @param {number|null} vehicleDetailId - Optional vehicleDetailId from lookup
   */
  transformToOrderDto(payment, vehicleDetailId = null) {
    const user = payment.User || null;
    // VehicleDetailRequests is an array (hasMany), get the first one
    const vehicleRequest = (payment.VehicleDetailRequests && payment.VehicleDetailRequests.length > 0)
      ? payment.VehicleDetailRequests[0]
      : null;
    const coupon = payment.Coupon || null;

    return {
      id: payment.id,
      orderId: payment.order_id || '',
      transactionId: payment.transaction_id || null,
      amount: parseFloat(payment.amount || 0),
      originalAmount: payment.original_amount ? parseFloat(payment.original_amount) : null,
      discountAmount: payment.discount_amount ? parseFloat(payment.discount_amount) : null,
      paymentFor: payment.payment_for,
      paymentForName: this.getPaymentForName(payment.payment_for),
      method: payment.method || 0,
      methodName: this.getMethodName(payment.method),
      status: payment.status,
      statusName: this.getStatusName(payment.status),
      paymentDate: payment.payment_date,
      createdAt: payment.created_at,
      userId: payment.user_id,
      customerName: user ? `${user.first_name || ''} ${user.last_name || ''}`.trim() || user.email : 'N/A',
      customerEmail: user?.email || 'N/A',
      customerPhone: user?.phone_number || null,
      vehicleRequestId: vehicleRequest?.id || null,
      vehicleDetailId: vehicleDetailId,
      registrationNumber: vehicleRequest?.registration_number || null,
      vehicleMake: vehicleRequest?.make || null,
      vehicleModel: vehicleRequest?.model || null,
      couponId: payment.coupon_id || null,
      couponCode: coupon?.coupon_code || null,
      couponName: coupon?.coupon_name || null
    };
  }

  /**
   * Get order list with pagination and filtering
   * Matches frontend: POST /api/order/list
   */
  async getOrderListAsync(request) {
    try {
      const { take, skip, filter } = request;

      // Build where clause
      let whereClause = {};
      if (filter && filter.status !== undefined && filter.status !== null) {
        whereClause.status = filter.status;
      }

      // Build query options
      const queryOptions = {
        where: whereClause,
        include: [
          {
            model: User,
            as: 'User',
            attributes: ['id', 'email', 'first_name', 'last_name', 'phone_number'],
            required: false
          },
          {
            model: VehicleDetailRequest,
            as: 'VehicleDetailRequests',
            attributes: ['id', 'registration_number', 'make', 'model'],
            required: false,
            separate: false
          },
          {
            model: Coupon,
            as: 'Coupon',
            attributes: ['id', 'coupon_code', 'coupon_name'],
            required: false // LEFT JOIN
          }
        ],
        order: [['payment_date', 'DESC']],
        offset: skip || 0
      };

      if (take && take > 0) {
        queryOptions.limit = take;
      }

      // Get total count
      const total = await PaymentHistory.count({ where: whereClause });

      // Get data
      const payments = await PaymentHistory.findAll(queryOptions);

      // Get all vehicleRequestIds to look up vehicleDetailIds
      const vehicleRequestIds = payments
        .filter(p => p.VehicleDetailRequests && p.VehicleDetailRequests.length > 0)
        .map(p => p.VehicleDetailRequests[0].id);

      // Look up vehicleDetailIds from vehicle_details table
      let vehicleDetailMap = {};
      if (vehicleRequestIds.length > 0) {
        const vehicleDetails = await VehicleDetail.findAll({
          where: {
            vehicle_detail_request_id: { [Op.in]: vehicleRequestIds }
          },
          attributes: ['id', 'vehicle_detail_request_id']
        });
        // Create map: vehicleRequestId -> vehicleDetailId
        vehicleDetails.forEach(vd => {
          vehicleDetailMap[vd.vehicle_detail_request_id] = vd.id;
        });
      }

      // Transform to Order DTOs with vehicleDetailId
      const orders = payments.map(payment => {
        const vehicleRequestId = (payment.VehicleDetailRequests && payment.VehicleDetailRequests.length > 0)
          ? payment.VehicleDetailRequests[0].id
          : null;
        const vehicleDetailId = vehicleRequestId ? vehicleDetailMap[vehicleRequestId] || null : null;
        return this.transformToOrderDto(payment, vehicleDetailId);
      });

      logger.info(`Found ${orders.length} orders (total: ${total})`);
      return Result.success({
        data: orders,
        total: total
      });
    } catch (error) {
      logger.error('Get order list error:', error);
      return Result.failure(error.message || 'Failed to get order list');
    }
  }

  /**
   * Get order by ID
   * Matches frontend: GET /api/order/:id
   */
  async getOrderByIdAsync(id) {
    try {
      const payment = await PaymentHistory.findByPk(id, {
        include: [
          {
            model: User,
            as: 'User',
            attributes: ['id', 'email', 'first_name', 'last_name', 'phone_number'],
            required: false
          },
          {
            model: VehicleDetailRequest,
            as: 'VehicleDetailRequests',
            attributes: ['id', 'registration_number', 'make', 'model'],
            required: false
          },
          {
            model: Coupon,
            as: 'Coupon',
            attributes: ['id', 'coupon_code', 'coupon_name'],
            required: false
          }
        ]
      });

      if (!payment) {
        return Result.failure('Order not found');
      }

      const order = this.transformToOrderDto(payment);
      return Result.success(order);
    } catch (error) {
      logger.error('Get order by ID error:', error);
      return Result.failure(error.message || 'Failed to get order');
    }
  }

  /**
   * Get order statistics
   * Matches frontend: GET /api/order/stats
   */
  async getOrderStatsAsync() {
    try {
      const stats = await PaymentHistory.findAll({
        attributes: [
          'status',
          [sequelize.fn('COUNT', sequelize.col('id')), 'count']
        ],
        group: ['status'],
        raw: true
      });

      // Initialize counts
      const result = {
        pending: 0,
        successful: 0,
        failed: 0,
        refunded: 0
      };

      // Map status codes to result fields
      stats.forEach(stat => {
        const status = stat.status;
        const count = parseInt(stat.count) || 0;

        switch (status) {
          case 0: // Pending
          case 3: // Not Verified (treated as pending)
            result.pending += count;
            break;
          case 1: // Successful
            result.successful += count;
            break;
          case 2: // Failed
            result.failed += count;
            break;
          case 4: // Refunded
            result.refunded += count;
            break;
        }
      });

      logger.info('Order stats retrieved:', result);
      return Result.success(result);
    } catch (error) {
      logger.error('Get order stats error:', error);
      return Result.failure(error.message || 'Failed to get order stats');
    }
  }

  /**
   * Update order status
   * Matches frontend: PUT /api/order/:id/status
   */
  async updateOrderStatusAsync(id, status) {
    try {
      const payment = await PaymentHistory.findByPk(id);
      if (!payment) {
        return Result.failure('Order not found');
      }

      // Validate status
      if (![0, 1, 2, 3, 4].includes(status)) {
        return Result.failure('Invalid status. Must be 0 (Pending), 1 (Successful), 2 (Failed), 3 (Not Verified), or 4 (Refunded)');
      }

      payment.status = status;
      payment.modified_at = new Date();
      await payment.save();

      logger.info(`Order ${id} status updated to ${status}`);
      return Result.success({ message: 'Order status updated successfully' });
    } catch (error) {
      logger.error('Update order status error:', error);
      return Result.failure(error.message || 'Failed to update order status');
    }
  }
}

module.exports = new OrderService();

