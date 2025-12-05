const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

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
    type: DataTypes.DATE,
    allowNull: true
  },
  ViolationType: {
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
