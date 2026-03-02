const express = require('express');
const router = express.Router();
const publicController = require('../controllers/public.controller');

// No authentication on any of these routes — they are intentionally public

// GET /api/public/order/:token — load order vehicle details from share token
router.get('/order/:token', (req, res, next) => publicController.getOrderByToken(req, res, next));

// POST /api/public/inspection — create an inspection via share token (no login required)
router.post('/inspection', (req, res, next) => publicController.startInspection(req, res, next));

module.exports = router;
