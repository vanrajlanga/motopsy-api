const express = require('express');
const router = express.Router();
const inspectionController = require('../controllers/inspection.controller');
const upload = require('../middlewares/upload.middleware');

router.post('/', inspectionController.create.bind(inspectionController));
router.get('/', inspectionController.list.bind(inspectionController));
router.get('/:id', inspectionController.getById.bind(inspectionController));
// Batch route MUST come before :parameterId to avoid "batch" being parsed as parameterId
router.put('/:id/responses/batch', inspectionController.saveBatchResponses.bind(inspectionController));
router.put('/:id/responses/:parameterId', inspectionController.saveResponse.bind(inspectionController));
router.post('/:id/complete', inspectionController.complete.bind(inspectionController));
router.get('/:id/score', inspectionController.getScore.bind(inspectionController));
router.post('/:id/certificate', inspectionController.generateCertificate.bind(inspectionController));
router.post('/:id/inspector-photo', upload.single('photo'), inspectionController.uploadInspectorPhoto.bind(inspectionController));
router.post('/:id/responses/:responseId/photos', upload.single('photo'), inspectionController.uploadPhoto.bind(inspectionController));

module.exports = router;
