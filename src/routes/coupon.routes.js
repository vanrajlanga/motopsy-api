const express = require('express');
const router = express.Router();
const couponController = require('../controllers/coupon.controller');
const { authenticate, requireAdmin } = require('../middlewares/auth.middleware');

// Public route - get active coupons for display (NO AUTH REQUIRED - MUST BE FIRST)
router.get('/active', (req, res, next) => {
  console.log('🔥🔥🔥 HIT /active route - NO AUTH 🔥🔥🔥');
  next();
}, couponController.getActiveCoupons.bind(couponController));

// Authenticated user route (validate coupon during checkout)
router.post('/validate', authenticate, couponController.validateCoupon.bind(couponController));

// Admin routes (require admin authentication)
router.post('/list', authenticate, requireAdmin, couponController.getAllCoupons.bind(couponController));
router.post('/', authenticate, requireAdmin, couponController.create.bind(couponController));
router.put('/', authenticate, requireAdmin, couponController.update.bind(couponController));
router.delete('/:id', authenticate, requireAdmin, couponController.delete.bind(couponController));
router.get('/:id/usage-history', authenticate, requireAdmin, couponController.getUsageHistory.bind(couponController));
router.get('/:id/audit-log', authenticate, requireAdmin, couponController.getAuditLog.bind(couponController));

// Get by ID must come last to avoid catching other routes
router.get('/:id', (req, res, next) => {
  console.log('❌❌❌ HIT /:id route with id:', req.params.id, '❌❌❌');
  next();
}, authenticate, requireAdmin, couponController.getById.bind(couponController));

module.exports = router;
