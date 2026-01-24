const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Role = sequelize.define('Role', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  created_at: {
    type: DataTypes.DATE(6),
    allowNull: false,
    defaultValue: DataTypes.NOW
  },
  modified_at: {
    type: DataTypes.DATE(6),
    allowNull: true
  },
  name: {
    type: DataTypes.STRING(256),
    allowNull: true
  },
  normalized_name: {
    type: DataTypes.STRING(256),
    allowNull: true
  },
  concurrency_stamp: {
    type: DataTypes.TEXT('long'),
    allowNull: true
  }
}, {
  tableName: 'roles',
  timestamps: false
});

module.exports = Role;
