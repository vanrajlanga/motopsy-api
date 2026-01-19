const express = require('express');
const router = express.Router();
const discrepancyController = require('../controllers/discrepancy.controller');
const { authenticate, requireAdmin } = require('../middlewares/auth.middleware');

// User routes (authenticated)
router.post('/', authenticate, discrepancyController.create.bind(discrepancyController));
router.get('/by-vehicle/:vehicleDetailId', authenticate, discrepancyController.getByVehicleDetailId.bind(discrepancyController));

// Admin routes
router.post('/list', authenticate, requireAdmin, discrepancyController.list.bind(discrepancyController));

module.exports = router;
