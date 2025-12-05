const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const LostVehicle = sequelize.define('LostVehicles', {
  Id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: false
  },
  RegistrationNumber: {
    type: DataTypes.STRING(255),
    allowNull: false
  }
}, {
  tableName: 'LostVehicles',
  timestamps: false
});

module.exports = LostVehicle;
