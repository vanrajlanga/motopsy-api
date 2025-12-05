const express = require('express');
const router = express.Router();
const obvController = require('../controllers/obv.controller');
const { authenticate } = require('../middlewares/auth.middleware');

// Routes matching .NET API exactly
router.post('/enterprise-catalog', authenticate, obvController.getEnterpriseCatalog.bind(obvController));
router.post('/enterprise-used-price-range', authenticate, obvController.getEnterpriseUsedPriceRange.bind(obvController));
router.get('/enterprise-used-price-range-by-vehicle-detail-id', authenticate, obvController.getByVehicleDetailId.bind(obvController));

module.exports = router;
