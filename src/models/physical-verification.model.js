const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const PhysicalVerification = sequelize.define('physical_verifications', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  user_id: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  name: {
    type: DataTypes.STRING(50),
    allowNull: false,
    defaultValue: ''
  },
  vehicle_detail_id: {
    type: DataTypes.INTEGER,
    allowNull: true
  },
  registration_number: {
    type: DataTypes.STRING(255),
    allowNull: true
  },
  status: {
    type: DataTypes.STRING(100),
    allowNull: true
  },
  address: {
    type: DataTypes.STRING(1000),
    allowNull: false,
    defaultValue: ''
  },
  city: {
    type: DataTypes.STRING(50),
    allowNull: false,
    defaultValue: ''
  },
  state: {
    type: DataTypes.STRING(50),
    allowNull: false,
    defaultValue: ''
  },
  pincode: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0
  },
  country: {
    type: DataTypes.STRING(50),
    allowNull: false,
    defaultValue: ''
  },
  description: {
    type: DataTypes.STRING(1000),
    allowNull: false,
    defaultValue: ''
  },
  report_path: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  report: {
    type: DataTypes.BLOB('long'),
    allowNull: true
  },
  report_generated_at: {
    type: DataTypes.DATE,
    allowNull: true
  },
  appointment_at: {
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
  tableName: 'physical_verifications',
  timestamps: false
});

module.exports = PhysicalVerification;
