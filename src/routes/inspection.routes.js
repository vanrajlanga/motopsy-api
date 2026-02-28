const express = require('express');
const router = express.Router();
const inspectionController = require('../controllers/inspection.controller');
const upload = require('../middlewares/upload.middleware');
const { optionalAuth } = require('../middlewares/auth.middleware');
const reportService = require('../services/report.service');

// Create inspection — optionalAuth so mechanics get technician_id auto-filled from token
router.post('/', optionalAuth, inspectionController.create.bind(inspectionController));
router.get('/', inspectionController.list.bind(inspectionController));
router.get('/:id', inspectionController.getById.bind(inspectionController));
// Batch route MUST come before :parameterId to avoid "batch" being parsed as parameterId
router.put('/:id/responses/batch', inspectionController.saveBatchResponses.bind(inspectionController));
router.put('/:id/responses/:parameterId', inspectionController.saveResponse.bind(inspectionController));
router.patch('/:id/context', inspectionController.updateContext.bind(inspectionController));
router.post('/:id/complete', inspectionController.complete.bind(inspectionController));
router.get('/:id/score', inspectionController.getScore.bind(inspectionController));
router.post('/:id/certificate', inspectionController.generateCertificate.bind(inspectionController));
router.post('/:id/inspector-photo', upload.single('photo'), inspectionController.uploadInspectorPhoto.bind(inspectionController));
router.post('/:id/vehicle-photo', upload.single('photo'), inspectionController.uploadVehiclePhoto.bind(inspectionController));
router.post('/:id/responses/:responseId/photos', upload.single('photo'), inspectionController.uploadPhoto.bind(inspectionController));

// PDF report generation
router.get('/:id/report', async (req, res, next) => {
  try {
    const result = await reportService.generate(parseInt(req.params.id));
    if (!result.isSuccess) {
      return res.status(404).json({ isSuccess: false, error: result.error });
    }
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${result.value.filename}"`);
    res.send(result.value.buffer);
  } catch (error) {
    next(error);
  }
});

module.exports = router;
