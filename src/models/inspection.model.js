const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Inspection = sequelize.define('inspections', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  uuid: {
    type: DataTypes.CHAR(36),
    allowNull: false,
    unique: true
  },
  technician_id: {
    type: DataTypes.INTEGER,
    allowNull: true
  },
  vehicle_reg_number: {
    type: DataTypes.STRING(20),
    allowNull: true
  },
  vehicle_make: {
    type: DataTypes.STRING(80),
    allowNull: true
  },
  vehicle_model: {
    type: DataTypes.STRING(80),
    allowNull: true
  },
  vehicle_year: {
    type: DataTypes.INTEGER,
    allowNull: true
  },
  fuel_type: {
    type: DataTypes.ENUM('Petrol', 'Diesel', 'CNG', 'Electric', 'Hybrid'),
    allowNull: false
  },
  transmission_type: {
    type: DataTypes.ENUM('Manual', 'Automatic', 'CVT', 'DCT', 'AMT'),
    allowNull: false
  },
  odometer_km: {
    type: DataTypes.INTEGER,
    allowNull: true
  },
  gps_latitude: {
    type: DataTypes.DECIMAL(10, 7),
    allowNull: true
  },
  gps_longitude: {
    type: DataTypes.DECIMAL(10, 7),
    allowNull: true
  },
  gps_address: {
    type: DataTypes.STRING(255),
    allowNull: true
  },
  status: {
    type: DataTypes.ENUM('draft', 'in_progress', 'completed', 'scored', 'certified'),
    allowNull: false,
    defaultValue: 'draft'
  },
  total_applicable_params: {
    type: DataTypes.INTEGER,
    allowNull: true,
    defaultValue: 0
  },
  total_answered_params: {
    type: DataTypes.INTEGER,
    allowNull: true,
    defaultValue: 0
  },
  started_at: {
    type: DataTypes.DATE,
    allowNull: true
  },
  completed_at: {
    type: DataTypes.DATE,
    allowNull: true
  },
  created_at: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW
  },
  modified_at: {
    type: DataTypes.DATE,
    allowNull: true
  }
}, {
  tableName: 'inspections',
  timestamps: false
});

module.exports = Inspection;
