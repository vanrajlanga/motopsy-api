const express = require('express');
const router = express.Router();
const physicalVerificationController = require('../controllers/physical-verification.controller');
const { authenticate, requireAdmin } = require('../middlewares/auth.middleware');

// Public route (matches .NET - no [Authorize])
router.post('/get-physical-verifications', physicalVerificationController.getPhysicalVerifications.bind(physicalVerificationController));
router.get('/:id', authenticate, physicalVerificationController.getById.bind(physicalVerificationController));
router.post('/create-physical-verification-appointment', authenticate, physicalVerificationController.createAppointment.bind(physicalVerificationController));
// .NET has [Authorize] only (NOT admin) for these endpoints
router.get('/get-physical-verification-count', authenticate, physicalVerificationController.getCount.bind(physicalVerificationController));
router.post('/physical-verifications', authenticate, physicalVerificationController.getAllVerifications.bind(physicalVerificationController));
router.get('/physical-verification-report-by-id', authenticate, physicalVerificationController.getReportById.bind(physicalVerificationController));

module.exports = router;
