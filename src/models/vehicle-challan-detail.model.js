const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

/**
 * VehicleChallanDetail model - matches .NET VehicleChallanDetail entity
 * Contains all fields from Surepass challan API response
 */
const VehicleChallanDetail = sequelize.define('vehiclechallandetails', {
  Id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  VehicleDetailId: {
    type: DataTypes.INTEGER,
    allowNull: true
  },
  ChallanNumber: {
    type: DataTypes.STRING(255),
    allowNull: true
  },
  ChallanDate: {
    type: DataTypes.STRING(100),
    allowNull: true
  },
  ChallanPlace: {
    type: DataTypes.STRING(500),
    allowNull: true
  },
  State: {
    type: DataTypes.STRING(100),
    allowNull: true
  },
  Rto: {
    type: DataTypes.STRING(255),
    allowNull: true
  },
  OffenseDetails: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  AccusedName: {
    type: DataTypes.STRING(500),
    allowNull: true
  },
  Amount: {
    type: DataTypes.DECIMAL(18, 2),
    allowNull: true
  },
  Status: {
    type: DataTypes.STRING(100),
    allowNull: true
  },
  CourtChallan: {
    type: DataTypes.BOOLEAN,
    allowNull: true,
    defaultValue: false
  },
  UpstreamCode: {
    type: DataTypes.STRING(100),
    allowNull: true
  },
  // Legacy field for backward compatibility
  ViolationType: {
    type: DataTypes.STRING(500),
    allowNull: true
  },
  CreatedAt: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW
  }
}, {
  tableName: 'vehiclechallandetails',
  timestamps: false
});

module.exports = VehicleChallanDetail;
