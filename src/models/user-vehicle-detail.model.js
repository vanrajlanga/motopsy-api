const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const UserVehicleDetail = sequelize.define('user_vehicle_details', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  user_id: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  vehicle_detail_id: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  is_primary: {
    type: DataTypes.BOOLEAN,
    allowNull: true,
    defaultValue: false
  },
  created_at: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW
  }
}, {
  tableName: 'user_vehicle_details',
  timestamps: false
});

module.exports = UserVehicleDetail;
