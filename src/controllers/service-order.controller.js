const ApiController = require('./base.controller');
const serviceOrderService = require('../services/service-order.service');

class ServiceOrderController extends ApiController {
  /**
   * POST /api/service-orders
   * Create service order (called after payment verification)
   * Note: This is primarily called internally by payment service
   */
  async createServiceOrder(req, res, next) {
    try {
      const userId = req.user?.id || req.user?.user_id;
      const orderData = {
        ...req.body,
        user_id: userId
      };

      const order = await serviceOrderService.createServiceOrderAsync(
        orderData,
        req.body.payment_history_id
      );

      return this.ok({
        success: true,
        data: order,
        message: 'Service order created successfully'
      }, res);
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/service-orders/my-orders
   * Get logged-in user's orders
   */
  async getMyOrders(req, res, next) {
    try {
      const userId = req.user?.id || req.user?.user_id;
      const orders = await serviceOrderService.getOrdersByUserIdAsync(userId);
      return this.ok({ success: true, data: orders }, res);
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/admin/service-orders
   * Admin: Get all orders with pagination
   */
  async getAllOrders(req, res, next) {
    try {
      const { take = 10, skip = 0, filters = {} } = req.body;
      const result = await serviceOrderService.getAllOrdersAsync(take, skip, filters);
      return this.ok({
        success: true,
        data: result.orders,
        totalCount: result.totalCount
      }, res);
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/admin/service-orders/:id
   * Admin: Get order details
   */
  async getOrderById(req, res, next) {
    try {
      const { id } = req.params;
      const order = await serviceOrderService.getOrderByIdAsync(id);
      return this.ok({ success: true, data: order }, res);
    } catch (error) {
      next(error);
    }
  }

  /**
   * PUT /api/admin/service-orders/:id/status
   * Admin: Update order status
   */
  async updateOrderStatus(req, res, next) {
    try {
      const { id } = req.params;
      const { status } = req.body;

      if (status === undefined || status === null) {
        return this.badRequest('Status is required', res);
      }

      const order = await serviceOrderService.updateOrderStatusAsync(id, status);
      return this.ok({
        success: true,
        data: order,
        message: 'Order status updated successfully'
      }, res);
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new ServiceOrderController();
