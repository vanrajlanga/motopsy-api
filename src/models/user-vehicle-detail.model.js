const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const UserVehicleDetail = sequelize.define('uservehicledetails', {
  Id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  UserId: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  VehicleDetailId: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  IsPrimary: {
    type: DataTypes.BOOLEAN,
    allowNull: true,
    defaultValue: false
  },
  CreatedAt: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW
  }
}, {
  tableName: 'uservehicledetails',
  timestamps: false
});

module.exports = UserVehicleDetail;
