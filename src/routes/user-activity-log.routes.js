const express = require('express');
const router = express.Router();
const userActivityLogController = require('../controllers/user-activity-log.controller');
const { authenticate, requireAdmin } = require('../middlewares/auth.middleware');

router.get('/', authenticate, requireAdmin, userActivityLogController.getAll.bind(userActivityLogController));

module.exports = router;
