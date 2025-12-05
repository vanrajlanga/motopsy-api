const express = require('express');
const router = express.Router();
const obvController = require('../controllers/obv.controller');
const { authenticate } = require('../middlewares/auth.middleware');

router.post('/get-enterprise-catalog', authenticate, obvController.getEnterpriseCatalog.bind(obvController));
router.post('/get-enterprise-used-price-range', authenticate, obvController.getEnterpriseUsedPriceRange.bind(obvController));
router.get('/get-by-vehicle-detail-id', authenticate, obvController.getByVehicleDetailId.bind(obvController));

module.exports = router;
