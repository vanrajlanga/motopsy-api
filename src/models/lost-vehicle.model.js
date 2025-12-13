const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const LostVehicle = sequelize.define('lost_vehicles', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  registration_number: {
    type: DataTypes.STRING(255),
    allowNull: false
  }
}, {
  tableName: 'lost_vehicles',
  timestamps: false
});

module.exports = LostVehicle;
