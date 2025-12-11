const express = require('express');
const router = express.Router();
const paymentController = require('../controllers/payment.controller');
const { authenticate } = require('../middlewares/auth.middleware');

// All routes under /api/payment

router.post('/create-order', authenticate, (req, res, next) => paymentController.createOrder(req, res, next));
router.post('/verify-payment', (req, res, next) => paymentController.verifyPayment(req, res, next));
router.post('/validate-coupon', authenticate, (req, res, next) => paymentController.validateCoupon(req, res, next));

module.exports = router;
