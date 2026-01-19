const express = require('express');
const router = express.Router();
const vehicleSpecificationController = require('../controllers/vehicle-specification.controller');

// Public routes - Order matters! More specific routes first
router.get('/makes', (req, res, next) => vehicleSpecificationController.getMakes(req, res, next));
router.get('/models/:make', (req, res, next) => vehicleSpecificationController.getModelsByMake(req, res, next));
router.get('/versions/:make/:model', (req, res, next) => vehicleSpecificationController.getVersionsByMakeModel(req, res, next));
router.post('/vehicles-from-specs', (req, res, next) => vehicleSpecificationController.getVehiclesFromSpecs(req, res, next));
router.get('/:model', (req, res, next) => vehicleSpecificationController.getByModel(req, res, next));

module.exports = router;
