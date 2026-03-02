const db = require('../models');
const { ServiceOrder, ServicePlan, ServicePlanOption, User, PaymentHistory, UserRole, Role } = db;
const { Op } = require('sequelize');
const logger = require('../config/logger');
const emailService = require('./email.service');

class ServiceOrderService {
  /**
   * Create service order after successful payment.
   * Automatically assigns an available mechanic if appointment date/slot provided.
   */
  async createServiceOrderAsync(orderData, paymentHistoryId) {
    try {
      let mechanicId = null;

      // Auto-assign mechanic if appointment details are provided
      if (orderData.appointment_date && orderData.appointment_time_slot) {
        mechanicId = await this.autoAssignMechanicAsync(
          orderData.appointment_date,
          orderData.appointment_time_slot
        );
      }

      const order = await ServiceOrder.create({
        user_id: orderData.user_id,
        payment_history_id: paymentHistoryId,
        service_plan_id: orderData.service_plan_id,
        service_plan_option_id: orderData.service_plan_option_id,
        service_package_name: orderData.service_package_name || null,
        amount: orderData.amount,
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
        state: orderData.state || '',
        city: orderData.city || null,
        address: orderData.address || '',
        postcode: orderData.postcode || '',
        order_notes: orderData.order_notes || null,
        // Appointment details
        appointment_date: orderData.appointment_date || null,
        appointment_time_slot: orderData.appointment_time_slot || null,
        // Auto-assigned mechanic
        mechanic_id: mechanicId,
        // Status
        status: 0 // Pending
      });

      if (mechanicId) {
        logger.info(`Service order ${order.id} auto-assigned to mechanic ${mechanicId} for slot ${orderData.appointment_date} ${orderData.appointment_time_slot}`);

        // Send assignment email to mechanic (fire-and-forget)
        try {
          const mechanic = await User.findByPk(mechanicId, { attributes: ['id', 'first_name', 'last_name', 'email'] });
          if (mechanic) {
            emailService.sendMechanicAssignmentEmailAsync(mechanic, order).catch(err =>
              logger.error('Failed to send mechanic assignment email (auto-assign):', err.message)
            );
          }
        } catch (emailErr) {
          logger.error('Error fetching mechanic for assignment email:', emailErr.message);
        }
      }

      return order;
    } catch (error) {
      throw new Error(`Error creating service order: ${error.message}`);
    }
  }

  /**
   * Auto-assign the first available mechanic for a given date + time slot.
   * A mechanic is "available" if they have no other service order on the same date+slot.
   */
  async autoAssignMechanicAsync(appointmentDate, appointmentTimeSlot) {
    try {
      // Find Mechanic role
      const mechanicRole = await Role.findOne({ where: { normalized_name: 'MECHANIC' } });
      if (!mechanicRole) return null;

      // Get all users with Mechanic role
      const mechanicUserRoles = await UserRole.findAll({
        where: { role_id: mechanicRole.id },
        include: [{ model: User, as: 'User', attributes: ['id', 'first_name', 'last_name', 'email'] }]
      });

      if (!mechanicUserRoles || mechanicUserRoles.length === 0) return null;

      const mechanicIds = mechanicUserRoles.map(ur => ur.user_id);

      // Find mechanics already booked for this slot
      const busyMechanicIds = await ServiceOrder.findAll({
        where: {
          appointment_date: appointmentDate,
          appointment_time_slot: appointmentTimeSlot,
          mechanic_id: { [Op.in]: mechanicIds },
          status: { [Op.notIn]: [3] } // Exclude cancelled orders
        },
        attributes: ['mechanic_id']
      }).then(orders => orders.map(o => o.mechanic_id));

      // Find first free mechanic
      const availableMechanic = mechanicIds.find(id => !busyMechanicIds.includes(id));
      return availableMechanic || null;
    } catch (error) {
      logger.error('Auto-assign mechanic error:', error.message);
      return null;
    }
  }

  /**
   * Admin: Manually assign or re-assign a mechanic to a service order.
   */
  async assignMechanicAsync(orderId, mechanicId) {
    try {
      const order = await ServiceOrder.findByPk(orderId);
      if (!order) throw new Error('Order not found');

      // Verify the user has Mechanic role
      const mechanicRole = await Role.findOne({ where: { normalized_name: 'MECHANIC' } });
      if (!mechanicRole) throw new Error('Mechanic role not found');

      const userRole = await UserRole.findOne({
        where: { user_id: mechanicId, role_id: mechanicRole.id }
      });
      if (!userRole) throw new Error('User does not have Mechanic role');

      await order.update({ mechanic_id: mechanicId, modified_at: new Date() });
      logger.info(`Order ${orderId} manually assigned to mechanic ${mechanicId}`);

      // Send assignment email to mechanic (fire-and-forget)
      try {
        const mechanic = await User.findByPk(mechanicId, { attributes: ['id', 'first_name', 'last_name', 'email'] });
        if (mechanic) {
          emailService.sendMechanicAssignmentEmailAsync(mechanic, order).catch(err =>
            logger.error('Failed to send mechanic assignment email (manual assign):', err.message)
          );
        }
      } catch (emailErr) {
        logger.error('Error fetching mechanic for assignment email:', emailErr.message);
      }

      return order;
    } catch (error) {
      throw new Error(`Error assigning mechanic: ${error.message}`);
    }
  }

  /**
   * Get all service orders assigned to a specific mechanic.
   */
  async getMechanicOrdersAsync(mechanicId) {
    try {
      const orders = await ServiceOrder.findAll({
        where: { mechanic_id: mechanicId },
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
            model: db.Inspection,
            as: 'Inspection',
            attributes: ['id', 'uuid', 'status']
          }
        ],
        order: [
          ['appointment_date', 'ASC'],
          ['appointment_time_slot', 'ASC'],
          ['created_at', 'DESC']
        ]
      });
      return orders;
    } catch (error) {
      throw new Error(`Error fetching mechanic orders: ${error.message}`);
    }
  }

  /**
   * Get all users with Mechanic role (for admin mechanic management).
   */
  async getAllMechanicsAsync() {
    try {
      const mechanicRole = await Role.findOne({ where: { normalized_name: 'MECHANIC' } });
      if (!mechanicRole) return [];

      const userRoles = await UserRole.findAll({
        where: { role_id: mechanicRole.id },
        include: [
          {
            model: User,
            as: 'User',
            attributes: ['id', 'first_name', 'last_name', 'email', 'phone_number', 'created_at']
          }
        ]
      });

      return userRoles.map(ur => ur.User).filter(Boolean);
    } catch (error) {
      throw new Error(`Error fetching mechanics: ${error.message}`);
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

      if (filters.status !== undefined && filters.status !== null) {
        whereClause.status = filters.status;
      }

      if (filters.service_plan_id) {
        whereClause.service_plan_id = filters.service_plan_id;
      }

      if (filters.mechanic_id) {
        whereClause.mechanic_id = filters.mechanic_id;
      }

      if (filters.date_from && filters.date_to) {
        whereClause.created_at = {
          [Op.between]: [new Date(filters.date_from), new Date(filters.date_to)]
        };
      } else if (filters.date_from) {
        whereClause.created_at = { [Op.gte]: new Date(filters.date_from) };
      } else if (filters.date_to) {
        whereClause.created_at = { [Op.lte]: new Date(filters.date_to) };
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
            model: User,
            as: 'Mechanic',
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
          },
          {
            model: db.Inspection,
            as: 'Inspection',
            attributes: ['id', 'status'],
            required: false
          }
        ],
        limit: take,
        offset: skip,
        order: [['created_at', 'DESC']]
      });

      return { orders: rows, totalCount: count };
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
            model: User,
            as: 'Mechanic',
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
          },
          {
            model: db.Inspection,
            as: 'Inspection',
            attributes: ['id', 'uuid', 'status', 'created_at']
          }
        ]
      });

      if (!order) throw new Error('Order not found');
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
      if (!order) throw new Error('Order not found');

      await order.update({ status, modified_at: new Date() });
      return order;
    } catch (error) {
      throw new Error(`Error updating order status: ${error.message}`);
    }
  }

  /**
   * Generate (or return existing) share token for a service order.
   * The token is a UUID stored on the order and used to construct a public inspection link.
   */
  async generateShareLink(orderId) {
    try {
      const { v4: uuidv4 } = require('uuid');
      const order = await ServiceOrder.findByPk(orderId);
      if (!order) throw new Error('Order not found');

      // Reuse existing token if already generated
      if (!order.share_token) {
        await order.update({ share_token: uuidv4(), modified_at: new Date() });
      }

      return order.share_token;
    } catch (error) {
      throw new Error(`Error generating share link: ${error.message}`);
    }
  }

  /**
   * Look up a service order by its public share token.
   */
  async getOrderByShareToken(token) {
    try {
      const order = await ServiceOrder.findOne({ where: { share_token: token } });
      if (!order) throw new Error('Invalid share token');
      return order;
    } catch (error) {
      throw new Error(`Error fetching order by token: ${error.message}`);
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
