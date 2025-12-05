const express = require('express');
const router = express.Router();
const paymentHistoryController = require('../controllers/payment-history.controller');
const { authenticate } = require('../middlewares/auth.middleware');

// Authenticated route
router.get('/:userId', authenticate, (req, res, next) => paymentHistoryController.getByUserId(req, res, next));

module.exports = router;
