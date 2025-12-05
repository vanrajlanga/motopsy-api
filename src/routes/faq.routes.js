const express = require('express');
const router = express.Router();
const faqController = require('../controllers/faq.controller');
const { authenticate, requireAdmin } = require('../middlewares/auth.middleware');

// Public route
router.get('/', (req, res, next) => faqController.getAll(req, res, next));

// Admin routes
router.post('/', authenticate, requireAdmin, (req, res, next) => faqController.create(req, res, next));
router.put('/', authenticate, requireAdmin, (req, res, next) => faqController.update(req, res, next));
router.delete('/', authenticate, requireAdmin, (req, res, next) => faqController.delete(req, res, next));

module.exports = router;
