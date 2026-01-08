const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

/**
 * CustomVehicleEntry model
 * Stores user-provided vehicle data when vehicle not found in database
 * Allows for future verification and addition to main vehicle_specifications table
 */
const CustomVehicleEntry = sequelize.define('custom_vehicle_entries', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  user_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    field: 'user_id'
  },
  vehicle_detail_id: {
    type: DataTypes.INTEGER,
    allowNull: true,
    field: 'vehicle_detail_id'
  },
  custom_make: {
    type: DataTypes.STRING(255),
    allowNull: false,
    field: 'custom_make'
  },
  custom_model: {
    type: DataTypes.STRING(255),
    allowNull: false,
    field: 'custom_model'
  },
  custom_version: {
    type: DataTypes.STRING(255),
    allowNull: false,
    field: 'custom_version'
  },
  ex_showroom_price: {
    type: DataTypes.DECIMAL(15, 2),
    allowNull: false,
    field: 'ex_showroom_price'
  },
  kms_driven: {
    type: DataTypes.INTEGER,
    allowNull: true,
    field: 'kms_driven'
  },
  status: {
    type: DataTypes.ENUM('pending', 'approved', 'rejected'),
    defaultValue: 'pending',
    allowNull: false
  },
  admin_notes: {
    type: DataTypes.TEXT,
    allowNull: true,
    field: 'admin_notes'
  },
  created_at: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW,
    field: 'created_at'
  },
  updated_at: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW,
    field: 'updated_at'
  }
}, {
  tableName: 'custom_vehicle_entries',
  timestamps: true,
  underscored: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at'
});

module.exports = CustomVehicleEntry;
