const express = require('express');
const router = express.Router();
const certificateController = require('../controllers/certificate.controller');

// Public route - no authentication required
router.get('/verify/:certNumber', certificateController.verify.bind(certificateController));

module.exports = router;
