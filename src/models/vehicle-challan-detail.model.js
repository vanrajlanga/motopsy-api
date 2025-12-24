const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

/**
 * VehicleChallanDetail model
 * Contains all fields from Surepass challan API response
 */
const VehicleChallanDetail = sequelize.define('vehicle_challan_details', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  vehicle_detail_id: {
    type: DataTypes.INTEGER,
    allowNull: true
  },
  challan_number: {
    type: DataTypes.STRING(255),
    allowNull: true
  },
  challan_date: {
    type: DataTypes.STRING(100),
    allowNull: true
  },
  challan_place: {
    type: DataTypes.STRING(500),
    allowNull: true
  },
  state: {
    type: DataTypes.STRING(100),
    allowNull: true
  },
  rto: {
    type: DataTypes.STRING(255),
    allowNull: true
  },
  offense_details: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  accused_name: {
    type: DataTypes.STRING(500),
    allowNull: true
  },
  amount: {
    type: DataTypes.DECIMAL(18, 2),
    allowNull: true
  },
  status: {
    type: DataTypes.STRING(100),
    allowNull: true
  },
  court_challan: {
    type: DataTypes.BOOLEAN,
    allowNull: true,
    defaultValue: false
  },
  upstream_code: {
    type: DataTypes.STRING(100),
    allowNull: true
  },
  violation_type: {
    type: DataTypes.STRING(500),
    allowNull: true
  },
  created_at: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW
  },
  // API source tracking
  api_source: {
    type: DataTypes.STRING(50),
    allowNull: true,
    comment: 'API source: surepass, apiclub'
  }
}, {
  tableName: 'vehicle_challan_details',
  timestamps: false
});

module.exports = VehicleChallanDetail;
