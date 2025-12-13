const express = require('express');
const router = express.Router();
const vehicleReportController = require('../controllers/vehicle-report.controller');
const { authenticate, requireAdmin } = require('../middlewares/auth.middleware');
const upload = require('../middlewares/upload.middleware');

// .NET uses POST for get-vehicle-report
router.post('/get-vehicle-report/:registrationNumber', authenticate, vehicleReportController.getVehicleReport.bind(vehicleReportController));

// Physical verification report by vehicle report ID (public - matches .NET - no [Authorize])
router.get('/vehicle-report/:physicalVerificationId/physical-verification-report', vehicleReportController.getPhysicalVerificationReportByVehicleReportId.bind(vehicleReportController));

// Upload NCRB report with userId path param (public - matches .NET - no [Authorize])
router.post('/upload-ncrbReport/:userId', upload.single('NcrbReport'), vehicleReportController.uploadNcrbReport.bind(vehicleReportController));

// Get vehicle history reports (uses User.Identity.Name)
router.get('/get-vehicle-history-report', authenticate, vehicleReportController.getVehicleHistoryReport.bind(vehicleReportController));

// Get physical verification reports (uses User.Identity.Name)
router.get('/get-physical-verification-reports', authenticate, vehicleReportController.getPhysicalVerificationReports.bind(vehicleReportController));

// Get vehicle history report count
router.get('/get-vehicle-history-report-count', authenticate, vehicleReportController.getVehicleHistoryReportCount.bind(vehicleReportController));

// Get physical verification report by ID (returns PDF)
router.get('/get-physical-verifications-report-by-id', authenticate, vehicleReportController.getPhysicalVerificationReportById.bind(vehicleReportController));

// Get list of reports by user (uses query param userId)
router.get('/get-list-of-reports-generated-by-user', authenticate, vehicleReportController.getListOfReportsGeneratedByUser.bind(vehicleReportController));

// Upload and send physical verification report
router.post('/upload-and-send-physical-verification-report', authenticate, upload.single('File'), vehicleReportController.uploadAndSendPhysicalVerificationReport.bind(vehicleReportController));

// Get NCRB report by ID
router.get('/ncrb-report-by-id', authenticate, vehicleReportController.getNcrbReportById.bind(vehicleReportController));

module.exports = router;
