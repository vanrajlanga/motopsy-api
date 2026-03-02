const ApiController = require('./base.controller');
const serviceOrderService = require('../services/service-order.service');

class ServiceOrderController extends ApiController {
  /**
   * POST /api/service-orders
   * Create service order (called after payment verification)
   */
  async createServiceOrder(req, res, next) {
    try {
      const userId = req.user?.userId || req.user?.id;
      const orderData = { ...req.body, user_id: userId };

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
      const userId = req.user?.userId || req.user?.id;
      const orders = await serviceOrderService.getOrdersByUserIdAsync(userId);
      return this.ok({ success: true, data: orders }, res);
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/mechanic/my-orders
   * Get all service orders assigned to the authenticated mechanic
   */
  async getMechanicOrders(req, res, next) {
    try {
      const mechanicId = req.user?.userId || req.user?.id;
      const orders = await serviceOrderService.getMechanicOrdersAsync(mechanicId);
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

  /**
   * PUT /api/admin/service-orders/:id/assign-mechanic
   * Admin: Manually assign a mechanic to a service order
   */
  async assignMechanic(req, res, next) {
    try {
      const { id } = req.params;
      const { mechanic_id } = req.body;

      if (!mechanic_id) {
        return this.badRequest('mechanic_id is required', res);
      }

      const order = await serviceOrderService.assignMechanicAsync(id, mechanic_id);
      return this.ok({
        success: true,
        data: order,
        message: 'Mechanic assigned successfully'
      }, res);
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/service-orders/:id/share-link
   * Mechanic/Admin: Generate (or retrieve) a public share token for an order
   */
  async generateShareLink(req, res, next) {
    try {
      const { id } = req.params;
      const token = await serviceOrderService.generateShareLink(id);
      return this.ok({ success: true, shareToken: token }, res);
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/admin/mechanics
   * Admin: Get all users with Mechanic role
   */
  async getAllMechanics(req, res, next) {
    try {
      const mechanics = await serviceOrderService.getAllMechanicsAsync();
      return this.ok({ success: true, data: mechanics }, res);
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new ServiceOrderController();
