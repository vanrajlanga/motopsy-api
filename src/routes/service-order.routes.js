const express = require('express');
const router = express.Router();
const serviceOrderController = require('../controllers/service-order.controller');
const { authenticate, requireAdmin, requireMechanic, requireAdminOrMechanic } = require('../middlewares/auth.middleware');

// --- User routes ---
router.post('/service-orders', authenticate, (req, res, next) => serviceOrderController.createServiceOrder(req, res, next));
router.get('/service-orders/my-orders', authenticate, (req, res, next) => serviceOrderController.getMyOrders(req, res, next));

// --- Mechanic routes ---
router.get('/mechanic/my-orders', authenticate, requireMechanic, (req, res, next) => serviceOrderController.getMechanicOrders(req, res, next));
router.post('/service-orders/:id/share-link', authenticate, requireAdminOrMechanic, (req, res, next) => serviceOrderController.generateShareLink(req, res, next));
router.get('/service-orders/:id', authenticate, requireAdminOrMechanic, (req, res, next) => serviceOrderController.getOrderById(req, res, next));

// --- Admin routes ---
router.post('/admin/service-orders', authenticate, requireAdmin, (req, res, next) => serviceOrderController.getAllOrders(req, res, next));
router.get('/admin/service-orders/:id', authenticate, requireAdmin, (req, res, next) => serviceOrderController.getOrderById(req, res, next));
router.put('/admin/service-orders/:id/status', authenticate, requireAdmin, (req, res, next) => serviceOrderController.updateOrderStatus(req, res, next));
router.put('/admin/service-orders/:id/assign-mechanic', authenticate, requireAdmin, (req, res, next) => serviceOrderController.assignMechanic(req, res, next));
router.get('/admin/mechanics', authenticate, requireAdmin, (req, res, next) => serviceOrderController.getAllMechanics(req, res, next));

module.exports = router;
