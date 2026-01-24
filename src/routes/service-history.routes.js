const express = require('express');
const router = express.Router();
const serviceHistoryController = require('../controllers/service-history.controller');
const { authenticate } = require('../middlewares/auth.middleware');

// All routes require authentication
router.use(authenticate);

// GET /api/service-history/makers - Get supported vehicle makers
router.get('/makers', (req, res) => serviceHistoryController.getSupportedMakers(req, res));

// POST /api/service-history/search - Search vehicle service history
router.post('/search', (req, res) => serviceHistoryController.searchServiceHistory(req, res));

// POST /api/service-history/list - Get paginated list of service history records
router.post('/list', (req, res) => serviceHistoryController.getServiceHistoryList(req, res));

// GET /api/service-history/:id - Get specific service history record
router.get('/:id', (req, res) => serviceHistoryController.getServiceHistoryById(req, res));

module.exports = router;
