const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const PhysicalVerification = sequelize.define('physicalverifications', {
  Id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  UserId: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  Name: {
    type: DataTypes.STRING(50),
    allowNull: false,
    defaultValue: ''
  },
  VehicleDetailId: {
    type: DataTypes.INTEGER,
    allowNull: true
  },
  RegistrationNumber: {
    type: DataTypes.STRING(255),
    allowNull: true
  },
  Status: {
    type: DataTypes.STRING(100),
    allowNull: true
  },
  Address: {
    type: DataTypes.STRING(1000),
    allowNull: false,
    defaultValue: ''
  },
  City: {
    type: DataTypes.STRING(50),
    allowNull: false,
    defaultValue: ''
  },
  State: {
    type: DataTypes.STRING(50),
    allowNull: false,
    defaultValue: ''
  },
  Pincode: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0
  },
  Country: {
    type: DataTypes.STRING(50),
    allowNull: false,
    defaultValue: ''
  },
  Description: {
    type: DataTypes.STRING(1000),
    allowNull: false,
    defaultValue: ''
  },
  ReportPath: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  Report: {
    type: DataTypes.BLOB('long'),
    allowNull: true
  },
  ReportGeneratedAt: {
    type: DataTypes.DATE,
    allowNull: true
  },
  AppointmentAt: {
    type: DataTypes.DATE,
    allowNull: true
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
  tableName: 'physicalverifications',
  timestamps: false
});

module.exports = PhysicalVerification;
