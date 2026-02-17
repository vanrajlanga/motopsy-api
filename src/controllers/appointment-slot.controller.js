const ApiController = require('./base.controller');
const appointmentSlotService = require('../services/appointment-slot.service');

class AppointmentSlotController extends ApiController {

  // PUBLIC: GET /api/appointment/available-slots?date=YYYY-MM-DD
  async getAvailableSlots(req, res, next) {
    try {
      const { date } = req.query;
      if (!date) return this.badRequest('date query param required', res);
      const result = await appointmentSlotService.getAvailableSlotsAsync(date);
      return this.ok({ success: true, data: result }, res);
    } catch (error) { next(error); }
  }

  // ADMIN: GET /api/appointment/admin/slot-status?date=YYYY-MM-DD
  async getSlotStatus(req, res, next) {
    try {
      const { date } = req.query;
      if (!date) return this.badRequest('date query param required', res);
      const slots = await appointmentSlotService.getSlotStatusForDateAsync(date);
      return this.ok({ success: true, data: slots }, res);
    } catch (error) { next(error); }
  }

  // ADMIN: POST /api/appointment/admin/block
  async blockSlot(req, res, next) {
    try {
      const { date, time_slot, reason } = req.body;
      if (!date) return this.badRequest('date is required', res);
      const block = await appointmentSlotService.blockSlotAsync(date, time_slot, reason);
      return this.ok({ success: true, data: block, message: 'Slot blocked successfully' }, res);
    } catch (error) { next(error); }
  }

  // ADMIN: DELETE /api/appointment/admin/block/:id
  async unblockSlot(req, res, next) {
    try {
      const { id } = req.params;
      await appointmentSlotService.unblockSlotAsync(id);
      return this.ok({ success: true, message: 'Slot unblocked successfully' }, res);
    } catch (error) { next(error); }
  }

  // ADMIN: GET /api/appointment/admin/blocked
  async getBlockedSlots(req, res, next) {
    try {
      const blocks = await appointmentSlotService.getBlockedDatesAsync();
      return this.ok({ success: true, data: blocks }, res);
    } catch (error) { next(error); }
  }
}

module.exports = new AppointmentSlotController();
