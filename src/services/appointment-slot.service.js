const db = require('../models');
const { ServiceOrder, AppointmentSlotBlock } = db;
const { Op } = require('sequelize');

const ALL_SLOTS = [
  '09:00-10:00', '10:00-11:00', '11:00-12:00',
  '12:00-13:00', '13:00-14:00', '14:00-15:00',
  '15:00-16:00', '16:00-17:00', '17:00-18:00'
];

class AppointmentSlotService {

  // Returns available slots for a given date (YYYY-MM-DD)
  async getAvailableSlotsAsync(date) {
    // 1. Check if entire day is blocked
    const dayBlock = await AppointmentSlotBlock.findOne({
      where: { block_date: date, time_slot: null }
    });
    if (dayBlock) return { available: [], fullyBlocked: true, reason: dayBlock.reason };

    // 2. Get all booked slots for that date (non-cancelled orders)
    const bookedOrders = await ServiceOrder.findAll({
      where: {
        appointment_date: date,
        appointment_time_slot: { [Op.ne]: null },
        status: { [Op.notIn]: [3, 4] } // exclude cancelled/rejected
      },
      attributes: ['appointment_time_slot']
    });
    const bookedSlots = new Set(bookedOrders.map(o => o.appointment_time_slot));

    // 3. Get admin-blocked specific slots for that date
    const blockedSlots = await AppointmentSlotBlock.findAll({
      where: { block_date: date, time_slot: { [Op.ne]: null } },
      attributes: ['time_slot']
    });
    const adminBlockedSlots = new Set(blockedSlots.map(b => b.time_slot));

    // 4. Return available slots
    const available = ALL_SLOTS.filter(s => !bookedSlots.has(s) && !adminBlockedSlots.has(s));
    return { available, fullyBlocked: false };
  }

  // Admin: get all slots with their status for a date
  async getSlotStatusForDateAsync(date) {
    const bookedOrders = await ServiceOrder.findAll({
      where: {
        appointment_date: date,
        appointment_time_slot: { [Op.ne]: null },
        status: { [Op.notIn]: [3, 4] }
      },
      attributes: ['appointment_time_slot']
    });
    const bookedSlots = new Set(bookedOrders.map(o => o.appointment_time_slot));

    const dayBlock = await AppointmentSlotBlock.findOne({
      where: { block_date: date, time_slot: null }
    });

    const blockedRecords = await AppointmentSlotBlock.findAll({
      where: { block_date: date, time_slot: { [Op.ne]: null } }
    });
    const blockedMap = new Map(blockedRecords.map(b => [b.time_slot, b]));

    return ALL_SLOTS.map(slot => ({
      time_slot: slot,
      status: bookedSlots.has(slot) ? 'booked'
              : blockedMap.has(slot) ? 'blocked'
              : dayBlock ? 'blocked'
              : 'available',
      block_id: blockedMap.get(slot)?.id || (dayBlock?.id),
      reason: blockedMap.get(slot)?.reason || dayBlock?.reason
    }));
  }

  async blockSlotAsync(date, timeSlot, reason) {
    return AppointmentSlotBlock.create({ block_date: date, time_slot: timeSlot || null, reason });
  }

  async unblockSlotAsync(blockId) {
    return AppointmentSlotBlock.destroy({ where: { id: blockId } });
  }

  async getBlockedDatesAsync() {
    return AppointmentSlotBlock.findAll({ order: [['block_date', 'ASC']] });
  }
}

module.exports = new AppointmentSlotService();
