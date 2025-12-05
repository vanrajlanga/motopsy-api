const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const VehicleDetail = sequelize.define('VehicleDetails', {
  Id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  UserId: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  RegistrationNumber: {
    type: DataTypes.STRING(255),
    allowNull: true
  },
  ChassisNumber: {
    type: DataTypes.STRING(255),
    allowNull: true
  },
  EngineNumber: {
    type: DataTypes.STRING(255),
    allowNull: true
  },
  OwnerName: {
    type: DataTypes.STRING(500),
    allowNull: true
  },
  VehicleClass: {
    type: DataTypes.STRING(255),
    allowNull: true
  },
  FuelType: {
    type: DataTypes.STRING(100),
    allowNull: true
  },
  Model: {
    type: DataTypes.STRING(255),
    allowNull: true
  },
  Manufacturer: {
    type: DataTypes.STRING(255),
    allowNull: true
  },
  Color: {
    type: DataTypes.STRING(100),
    allowNull: true
  },
  RegistrationDate: {
    type: DataTypes.DATE,
    allowNull: true
  },
  FitnessUpto: {
    type: DataTypes.DATE,
    allowNull: true
  },
  InsuranceUpto: {
    type: DataTypes.DATE,
    allowNull: true
  },
  PurchaseDate: {
    type: DataTypes.DATE,
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
  },
  ModifiedAt: {
    type: DataTypes.DATE,
    allowNull: true
  }
}, {
  tableName: 'VehicleDetails',
  timestamps: false
});

module.exports = VehicleDetail;
