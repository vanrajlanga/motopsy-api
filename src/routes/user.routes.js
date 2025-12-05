const express = require('express');
const router = express.Router();
const userController = require('../controllers/user.controller');
const { authenticate } = require('../middlewares/auth.middleware');

// All routes under /api/user

router.post('/update-password', authenticate, (req, res, next) => userController.updatePassword(req, res, next));
router.post('/', (req, res, next) => userController.getUsers(req, res, next));
router.get('/total-user-count', (req, res, next) => userController.getTotalUserCount(req, res, next));
router.get('/', authenticate, (req, res, next) => userController.getLoggedInUser(req, res, next));
router.put('/update-user', authenticate, (req, res, next) => userController.updateUser(req, res, next));

module.exports = router;
