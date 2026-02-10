const db = require('../models');
const { ServiceOrder, ServicePlan, ServicePlanOption, User, PaymentHistory } = db;
const { Op } = require('sequelize');

class ServiceOrderService {
  /**
   * Create service order after successful payment
   */
  async createServiceOrderAsync(orderData, paymentHistoryId) {
    try {
      const order = await ServiceOrder.create({
        user_id: orderData.user_id,
        payment_history_id: paymentHistoryId,
        service_plan_id: orderData.service_plan_id,
        service_plan_option_id: orderData.service_plan_option_id,
        amount: orderData.amount, // Store the amount paid at time of order
        // Customer details
        name: orderData.name,
        mobile_number: orderData.mobile_number,
        email: orderData.email,
        // Vehicle details
        car_company: orderData.car_company || null,
        car_model: orderData.car_model || null,
        chassis_number: orderData.chassis_number || null,
        registration_number: orderData.registration_number || null,
        car_model_year: orderData.car_model_year || null,
        // Address
        state: orderData.state,
        city: orderData.city || null,
        address: orderData.address,
        postcode: orderData.postcode,
        order_notes: orderData.order_notes || null,
        // Status
        status: 0 // Pending
      });
      return order;
    } catch (error) {
      throw new Error(`Error creating service order: ${error.message}`);
    }
  }

  /**
   * Get all orders for a specific user
   */
  async getOrdersByUserIdAsync(userId) {
    try {
      const orders = await ServiceOrder.findAll({
        where: { user_id: userId },
        include: [
          {
            model: ServicePlan,
            as: 'ServicePlan',
            attributes: ['service_name', 'service_key']
          },
          {
            model: ServicePlanOption,
            as: 'ServicePlanOption',
            attributes: ['option_name', 'amount', 'currency']
          },
          {
            model: PaymentHistory,
            as: 'PaymentHistory',
            attributes: ['order_id', 'status', 'created_at']
          }
        ],
        order: [['created_at', 'DESC']]
      });
      return orders;
    } catch (error) {
      throw new Error(`Error fetching user orders: ${error.message}`);
    }
  }

  /**
   * Admin: Get all orders with pagination and filters
   */
  async getAllOrdersAsync(take, skip, filters = {}) {
    try {
      const whereClause = {};

      // Apply filters
      if (filters.status !== undefined && filters.status !== null) {
        whereClause.status = filters.status;
      }

      if (filters.service_plan_id) {
        whereClause.service_plan_id = filters.service_plan_id;
      }

      if (filters.date_from && filters.date_to) {
        whereClause.created_at = {
          [Op.between]: [new Date(filters.date_from), new Date(filters.date_to)]
        };
      } else if (filters.date_from) {
        whereClause.created_at = {
          [Op.gte]: new Date(filters.date_from)
        };
      } else if (filters.date_to) {
        whereClause.created_at = {
          [Op.lte]: new Date(filters.date_to)
        };
      }

      if (filters.search) {
        whereClause[Op.or] = [
          { name: { [Op.like]: `%${filters.search}%` } },
          { mobile_number: { [Op.like]: `%${filters.search}%` } },
          { email: { [Op.like]: `%${filters.search}%` } },
          { registration_number: { [Op.like]: `%${filters.search}%` } }
        ];
      }

      const { count, rows } = await ServiceOrder.findAndCountAll({
        where: whereClause,
        include: [
          {
            model: User,
            as: 'User',
            attributes: ['id', 'first_name', 'last_name', 'email']
          },
          {
            model: ServicePlan,
            as: 'ServicePlan',
            attributes: ['service_name', 'service_key']
          },
          {
            model: ServicePlanOption,
            as: 'ServicePlanOption',
            attributes: ['option_name', 'amount', 'currency']
          },
          {
            model: PaymentHistory,
            as: 'PaymentHistory',
            attributes: ['order_id', 'status', 'amount', 'created_at']
          }
        ],
        limit: take,
        offset: skip,
        order: [['created_at', 'DESC']]
      });

      return {
        orders: rows,
        totalCount: count
      };
    } catch (error) {
      throw new Error(`Error fetching orders: ${error.message}`);
    }
  }

  /**
   * Get single order by ID
   */
  async getOrderByIdAsync(orderId) {
    try {
      const order = await ServiceOrder.findByPk(orderId, {
        include: [
          {
            model: User,
            as: 'User',
            attributes: ['id', 'first_name', 'last_name', 'email', 'phone_number']
          },
          {
            model: ServicePlan,
            as: 'ServicePlan',
            attributes: ['service_name', 'service_key', 'description']
          },
          {
            model: ServicePlanOption,
            as: 'ServicePlanOption',
            attributes: ['option_name', 'amount', 'currency', 'description']
          },
          {
            model: PaymentHistory,
            as: 'PaymentHistory'
          }
        ]
      });

      if (!order) {
        throw new Error('Order not found');
      }

      return order;
    } catch (error) {
      throw new Error(`Error fetching order: ${error.message}`);
    }
  }

  /**
   * Admin: Update order status
   */
  async updateOrderStatusAsync(orderId, status) {
    try {
      const order = await ServiceOrder.findByPk(orderId);

      if (!order) {
        throw new Error('Order not found');
      }

      await order.update({
        status: status,
        modified_at: new Date()
      });

      return order;
    } catch (error) {
      throw new Error(`Error updating order status: ${error.message}`);
    }
  }

  /**
   * Get order by payment history ID
   */
  async getOrderByPaymentHistoryIdAsync(paymentHistoryId) {
    try {
      const order = await ServiceOrder.findOne({
        where: { payment_history_id: paymentHistoryId },
        include: [
          {
            model: ServicePlan,
            as: 'ServicePlan',
            attributes: ['service_name', 'service_key']
          },
          {
            model: ServicePlanOption,
            as: 'ServicePlanOption',
            attributes: ['option_name', 'amount', 'currency']
          }
        ]
      });

      return order;
    } catch (error) {
      throw new Error(`Error fetching order by payment: ${error.message}`);
    }
  }
}

module.exports = new ServiceOrderService();
