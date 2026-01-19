const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

/**
 * VehicleSpecDiscrepancy model
 * Stores user-flagged discrepancies when matched vehicle spec is incorrect
 */
const VehicleSpecDiscrepancy = sequelize.define('vehicle_spec_discrepancies', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  user_id: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  registration_number: {
    type: DataTypes.STRING(50),
    allowNull: true
  },

  // OLD vehicle detail (original report - preserved)
  old_vehicle_detail_id: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  old_matched_spec_id: {
    type: DataTypes.INTEGER,
    allowNull: true
  },
  old_make: {
    type: DataTypes.STRING(255),
    allowNull: true
  },
  old_model: {
    type: DataTypes.STRING(255),
    allowNull: true
  },
  old_version: {
    type: DataTypes.STRING(255),
    allowNull: true
  },

  // NEW vehicle detail (regenerated report) - NULL if car_not_found=true
  new_vehicle_detail_id: {
    type: DataTypes.INTEGER,
    allowNull: true
  },
  new_matched_spec_id: {
    type: DataTypes.INTEGER,
    allowNull: true
  },
  new_make: {
    type: DataTypes.STRING(255),
    allowNull: true
  },
  new_model: {
    type: DataTypes.STRING(255),
    allowNull: true
  },
  new_version: {
    type: DataTypes.STRING(255),
    allowNull: true
  },

  // For "My car doesn't exist" scenario
  car_not_found: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },

  // Optional notes from user
  user_notes: {
    type: DataTypes.TEXT,
    allowNull: true
  }
}, {
  tableName: 'vehicle_spec_discrepancies',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: false
});

module.exports = VehicleSpecDiscrepancy;
