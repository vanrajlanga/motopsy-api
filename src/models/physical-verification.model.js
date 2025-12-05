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
  ReportPath: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  AppointmentDate: {
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
