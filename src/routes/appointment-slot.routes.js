const express = require('express');
const router = express.Router();
const controller = require('../controllers/appointment-slot.controller');
const { authenticate, requireAdmin } = require('../middlewares/auth.middleware');

// Public endpoint - website users
router.get('/appointment/available-slots', controller.getAvailableSlots.bind(controller));

// Admin endpoints
router.get('/appointment/admin/slot-status', authenticate, requireAdmin, controller.getSlotStatus.bind(controller));
router.get('/appointment/admin/blocked', authenticate, requireAdmin, controller.getBlockedSlots.bind(controller));
router.post('/appointment/admin/block', authenticate, requireAdmin, controller.blockSlot.bind(controller));
router.delete('/appointment/admin/block/:id', authenticate, requireAdmin, controller.unblockSlot.bind(controller));

module.exports = router;
