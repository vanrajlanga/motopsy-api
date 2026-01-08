const express = require('express');
const router = express.Router();
const customVehicleEntryController = require('../controllers/custom-vehicle-entry.controller');
const authMiddleware = require('../middlewares/auth.middleware');

// Create a new custom vehicle entry
router.post('/', authMiddleware.authenticate, customVehicleEntryController.createEntry.bind(customVehicleEntryController));

// Get custom vehicle entries by user
router.get('/user/:userId', authMiddleware.authenticate, customVehicleEntryController.getEntriesByUser.bind(customVehicleEntryController));

// Get custom vehicle entry by ID
router.get('/:id', authMiddleware.authenticate, customVehicleEntryController.getEntryById.bind(customVehicleEntryController));

module.exports = router;
