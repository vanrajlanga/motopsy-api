const express = require('express');
const router = express.Router();
const obvController = require('../controllers/obv.controller');

// Public routes (matches .NET - no [Authorize] on any)
router.post('/enterprise-catalog', obvController.getEnterpriseCatalog.bind(obvController));
router.post('/enterprise-used-price-range', obvController.getEnterpriseUsedPriceRange.bind(obvController));
router.get('/enterprise-used-price-range-by-vehicle-detail-id', obvController.getByVehicleDetailId.bind(obvController));

module.exports = router;
