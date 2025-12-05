const express = require('express');
const router = express.Router();
const lostCarController = require('../controllers/lost-car.controller');

// Public route - check if vehicle is stolen
router.get('/vehicle-stolen-status/:registrationNumber', (req, res, next) => lostCarController.checkStolenStatus(req, res, next));

module.exports = router;
