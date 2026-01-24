const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const ServiceHistory = sequelize.define('ServiceHistory', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  client_id: {
    type: DataTypes.STRING(100),
    allowNull: true,
  },
  id_number: {
    type: DataTypes.STRING(50),
    allowNull: false,
    field: 'id_number',
  },
  maker: {
    type: DataTypes.STRING(50),
    allowNull: false,
  },
  service_history_details: {
    type: DataTypes.JSON,
    allowNull: true,
    field: 'service_history_details',
  },
  status_code: {
    type: DataTypes.INTEGER,
    allowNull: true,
  },
  success: {
    type: DataTypes.BOOLEAN,
    allowNull: true,
    defaultValue: false,
  },
  message: {
    type: DataTypes.STRING(255),
    allowNull: true,
  },
  searched_by: {
    type: DataTypes.INTEGER,
    allowNull: true,
    field: 'searched_by',
  },
  created_at: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW,
    field: 'created_at',
  },
}, {
  tableName: 'service_history',
  timestamps: false,
  underscored: true,
});

module.exports = ServiceHistory;
