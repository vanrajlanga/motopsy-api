const express = require('express');
const router = express.Router();
const vehicleSpecificationController = require('../controllers/vehicle-specification.controller');

// Public routes
router.get('/:model', (req, res, next) => vehicleSpecificationController.getByModel(req, res, next));
router.post('/vehicles-from-specs', (req, res, next) => vehicleSpecificationController.getVehiclesFromSpecs(req, res, next));

module.exports = router;
