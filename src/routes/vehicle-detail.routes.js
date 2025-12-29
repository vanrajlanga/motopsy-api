const express = require('express');
const router = express.Router();
const vehicleDetailController = require('../controllers/vehicle-detail.controller');
const { authenticate, requireAdmin } = require('../middlewares/auth.middleware');

// Get vehicle details by RC number (requires authentication)
router.post('/', authenticate, (req, res, next) => vehicleDetailController.getVehicleDetails(req, res, next));

// Get vehicle detail by ID
router.get('/vehicle-detail-by-id/:id/:userId', authenticate, (req, res, next) => vehicleDetailController.getVehicleDetailById(req, res, next));

// Admin routes
router.get('/paid-vehicle-detail-failed-reports', authenticate, requireAdmin, (req, res, next) => vehicleDetailController.getFailedReports(req, res, next));

// Get pending reports
router.get('/pending-reports', authenticate, (req, res, next) => vehicleDetailController.getPendingReports(req, res, next));

// Calculate resale value manually (when auto-calculation fails)
router.post('/calculate-resale', authenticate, (req, res, next) => vehicleDetailController.calculateResale(req, res, next));

module.exports = router;
