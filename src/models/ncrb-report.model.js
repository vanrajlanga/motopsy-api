const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const NcrbReport = sequelize.define('ncrb_reports', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  report: {
    type: DataTypes.BLOB('long'),
    allowNull: false
  },
  vehicle_detail_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    unique: true
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
  tableName: 'ncrb_reports',
  timestamps: false
});

module.exports = NcrbReport;
