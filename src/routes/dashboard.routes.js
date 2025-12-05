const express = require('express');
const router = express.Router();
const dashboardController = require('../controllers/dashboard.controller');
const { authenticate, requireAdmin } = require('../middlewares/auth.middleware');

// Admin only routes
router.get('/total-monthly-earning', authenticate, requireAdmin, (req, res, next) => dashboardController.getTotalMonthlyEarning(req, res, next));
router.get('/revenue-report/:filter', authenticate, requireAdmin, (req, res, next) => dashboardController.getRevenueReport(req, res, next));

module.exports = router;
