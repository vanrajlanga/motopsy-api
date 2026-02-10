const express = require('express');
const router = express.Router();
const serviceOrderController = require('../controllers/service-order.controller');
const { authenticate, requireAdmin } = require('../middlewares/auth.middleware');

// Authenticated user routes
router.post('/service-orders', authenticate, (req, res, next) => serviceOrderController.createServiceOrder(req, res, next));
router.get('/service-orders/my-orders', authenticate, (req, res, next) => serviceOrderController.getMyOrders(req, res, next));

// Admin routes
router.post('/admin/service-orders', authenticate, requireAdmin, (req, res, next) => serviceOrderController.getAllOrders(req, res, next));
router.get('/admin/service-orders/:id', authenticate, requireAdmin, (req, res, next) => serviceOrderController.getOrderById(req, res, next));
router.put('/admin/service-orders/:id/status', authenticate, requireAdmin, (req, res, next) => serviceOrderController.updateOrderStatus(req, res, next));

module.exports = router;
