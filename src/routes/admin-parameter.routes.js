const express = require('express');
const router = express.Router();
const adminParameterController = require('../controllers/admin-parameter.controller');
const { authenticate, requireAdmin } = require('../middlewares/auth.middleware');

// All routes require admin authentication
router.use(authenticate);
router.use(requireAdmin);

// GET /api/admin/parameters/hierarchy
router.get('/hierarchy', (req, res) => adminParameterController.getHierarchy(req, res));

// GET /api/admin/parameters/modules  — module list only (for tabs)
router.get('/modules', (req, res) => adminParameterController.getModules(req, res));

// GET /api/admin/parameters/modules/:moduleId  — lazy load parameters for one module
router.get('/modules/:moduleId', (req, res) => adminParameterController.getModuleParameters(req, res));

// GET /api/admin/parameters/:id
router.get('/:id', (req, res) => adminParameterController.getParameter(req, res));

// PUT /api/admin/parameters/:id
router.put('/:id', (req, res) => adminParameterController.updateParameter(req, res));

// PATCH /api/admin/parameters/:id/status
router.patch('/:id/status', (req, res) => adminParameterController.toggleParameterStatus(req, res));

// PATCH /api/admin/parameters/sub-group/:id/bulk-status
router.patch('/sub-group/:id/bulk-status', (req, res) => adminParameterController.toggleSubGroupStatus(req, res));

// PATCH /api/admin/parameters/module/:id/bulk-status
router.patch('/module/:id/bulk-status', (req, res) => adminParameterController.toggleModuleStatus(req, res));


// GET /api/admin/parameters/module/:id/weight-summary
router.get('/module/:id/weight-summary', (req, res) => adminParameterController.getModuleWeightSummary(req, res));

module.exports = router;
