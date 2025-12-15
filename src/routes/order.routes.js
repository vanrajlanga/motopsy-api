const express = require('express');
const router = express.Router();
const orderController = require('../controllers/order.controller');
const { authenticate, requireAdmin } = require('../middlewares/auth.middleware');

// All routes under /api/order (admin only)

// POST /api/order/list - Get order list with pagination and filtering
router.post('/list', authenticate, requireAdmin, orderController.getOrderList.bind(orderController));

// GET /api/order/stats - Get order statistics
router.get('/stats', authenticate, requireAdmin, orderController.getOrderStats.bind(orderController));

// GET /api/order/:id - Get order by ID
router.get('/:id', authenticate, requireAdmin, orderController.getOrderById.bind(orderController));

// PUT /api/order/:id/status - Update order status
router.put('/:id/status', authenticate, requireAdmin, orderController.updateOrderStatus.bind(orderController));

module.exports = router;

