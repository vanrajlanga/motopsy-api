const express = require('express');
const router = express.Router();
const physicalVerificationController = require('../controllers/physical-verification.controller');
const { authenticate, requireAdmin } = require('../middlewares/auth.middleware');

router.post('/get-physical-verifications', authenticate, physicalVerificationController.getPhysicalVerifications.bind(physicalVerificationController));
router.get('/:id', authenticate, physicalVerificationController.getById.bind(physicalVerificationController));
router.post('/create-physical-verification-appointment', authenticate, physicalVerificationController.createAppointment.bind(physicalVerificationController));
router.get('/get-physical-verification-count', authenticate, requireAdmin, physicalVerificationController.getCount.bind(physicalVerificationController));
router.post('/physical-verifications', authenticate, requireAdmin, physicalVerificationController.getAllVerifications.bind(physicalVerificationController));
router.get('/physical-verification-report-by-id', authenticate, physicalVerificationController.getReportById.bind(physicalVerificationController));

module.exports = router;
