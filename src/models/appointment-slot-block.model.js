const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const AppointmentSlotBlock = sequelize.define('appointment_slot_blocks', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  block_date: { type: DataTypes.DATEONLY, allowNull: false },
  time_slot: { type: DataTypes.STRING(20), allowNull: true },
  reason: { type: DataTypes.STRING(255), allowNull: true },
  created_at: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
  modified_at: { type: DataTypes.DATE, defaultValue: DataTypes.NOW }
}, { timestamps: false });

module.exports = AppointmentSlotBlock;
