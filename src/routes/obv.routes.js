const express = require('express');
const router = express.Router();
const obvController = require('../controllers/obv.controller');
const vehicleCatalogController = require('../controllers/vehicle-catalog.controller');

// Public routes (matches .NET - no [Authorize] on any)
// New endpoint: Fetches from DB first, falls back to Droom API
router.post('/vehicle-catalog', vehicleCatalogController.getCatalog.bind(vehicleCatalogController));

// Legacy Droom API endpoints
router.post('/enterprise-catalog', obvController.getEnterpriseCatalog.bind(obvController));
router.post('/enterprise-used-price-range', obvController.getEnterpriseUsedPriceRange.bind(obvController));
router.get('/enterprise-used-price-range-by-vehicle-detail-id', obvController.getByVehicleDetailId.bind(obvController));

module.exports = router;
