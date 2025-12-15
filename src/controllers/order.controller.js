const BaseController = require('./base.controller');
const orderService = require('../services/order.service');

class OrderController extends BaseController {
  /**
   * POST /api/order/list - Get order list with pagination and filtering (admin)
   */
  async getOrderList(req, res, next) {
    try {
      const { take, skip, filter } = req.body;
      const result = await orderService.getOrderListAsync({ take, skip, filter });
      // Return the value directly (data and total) to match frontend expectations
      if (result.isSuccess) {
        return res.status(200).json(result.value);
      }
      return this.fromResult(result, res);
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/order/:id - Get order by ID (admin)
   */
  async getOrderById(req, res, next) {
    try {
      const { id } = req.params;
      const result = await orderService.getOrderByIdAsync(parseInt(id));
      return this.fromResult(result, res);
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/order/stats - Get order statistics (admin)
   */
  async getOrderStats(req, res, next) {
    try {
      const result = await orderService.getOrderStatsAsync();
      return this.fromResult(result, res);
    } catch (error) {
      next(error);
    }
  }

  /**
   * PUT /api/order/:id/status - Update order status (admin)
   */
  async updateOrderStatus(req, res, next) {
    try {
      const { id } = req.params;
      const { status } = req.body;
      const result = await orderService.updateOrderStatusAsync(parseInt(id), status);
      return this.fromResult(result, res);
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new OrderController();

