const express = require('express');
const router = express.Router();
const paymentHistoryController = require('../controllers/payment-history.controller');

// Public route (matches .NET API - no [Authorize] attribute)
router.get('/:userId', (req, res, next) => paymentHistoryController.getByUserId(req, res, next));

module.exports = router;
