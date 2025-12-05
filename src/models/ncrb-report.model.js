const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const NcrbReport = sequelize.define('ncrbreports', {
  Id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  Report: {
    type: DataTypes.BLOB('long'),
    allowNull: false
  },
  VehicleDetailId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    unique: true
  },
  CreatedAt: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW
  },
  ModifiedAt: {
    type: DataTypes.DATE,
    allowNull: true
  }
}, {
  tableName: 'ncrbreports',
  timestamps: false
});

module.exports = NcrbReport;
