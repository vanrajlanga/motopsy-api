const express = require('express');
const router = express.Router();
const pricingController = require('../controllers/pricing.controller');
const { authenticate, requireAdmin } = require('../middlewares/auth.middleware');

// Public routes (for frontend to get pricing)
router.get('/vehicle-history-price', (req, res, next) => pricingController.getVehicleHistoryPrice(req, res, next));
router.get('/:key', (req, res, next) => pricingController.getPricingByKey(req, res, next));

// Protected routes (admin only)
router.get('/', authenticate, requireAdmin, (req, res, next) => pricingController.getAllPricing(req, res, next));
router.post('/', authenticate, requireAdmin, (req, res, next) => pricingController.createPricing(req, res, next));
router.put('/:id', authenticate, requireAdmin, (req, res, next) => pricingController.updatePricing(req, res, next));

module.exports = router;
