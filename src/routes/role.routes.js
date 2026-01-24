const express = require('express');
const router = express.Router();
const roleController = require('../controllers/role.controller');
const { authenticate, requireAdmin } = require('../middlewares/auth.middleware');

// All routes require admin authentication
router.use(authenticate);
router.use(requireAdmin);

// GET /api/admin/roles - Get all roles
router.get('/', (req, res) => roleController.getAllRoles(req, res));

// POST /api/admin/roles/users - Get users with their roles (paginated)
router.post('/users', (req, res) => roleController.getUsersWithRoles(req, res));

// POST /api/admin/roles/assign - Assign role to user
router.post('/assign', (req, res) => roleController.assignRole(req, res));

// POST /api/admin/roles/remove - Remove role from user
router.post('/remove', (req, res) => roleController.removeRole(req, res));

// GET /api/admin/roles/user/:userId - Get roles for a specific user
router.get('/user/:userId', (req, res) => roleController.getUserRoles(req, res));

// POST /api/admin/roles/create-user - Create a new admin user with a specific role
router.post('/create-user', (req, res) => roleController.createAdminUser(req, res));

// POST /api/admin/roles/update-password - Update password for an admin user
router.post('/update-password', (req, res) => roleController.updateAdminUserPassword(req, res));

module.exports = router;
