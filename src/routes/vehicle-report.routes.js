const express = require('express');
const router = express.Router();
const vehicleReportController = require('../controllers/vehicle-report.controller');
const { authenticate, requireAdmin } = require('../middlewares/auth.middleware');
const upload = require('../middlewares/upload.middleware');

router.get('/get-vehicle-report/:registrationNumber', authenticate, vehicleReportController.getVehicleReport.bind(vehicleReportController));
router.get('/get-vehicle-history-report', authenticate, requireAdmin, vehicleReportController.getVehicleHistoryReport.bind(vehicleReportController));
router.get('/get-physical-verification-reports', authenticate, requireAdmin, vehicleReportController.getPhysicalVerificationReports.bind(vehicleReportController));
router.get('/get-vehicle-history-report-count', authenticate, requireAdmin, vehicleReportController.getVehicleHistoryReportCount.bind(vehicleReportController));
router.get('/get-list-of-reports-generated-by-user', authenticate, vehicleReportController.getListOfReportsGeneratedByUser.bind(vehicleReportController));
router.post('/upload-ncrb-report', authenticate, requireAdmin, upload.single('file'), vehicleReportController.uploadNcrbReport.bind(vehicleReportController));

module.exports = router;
