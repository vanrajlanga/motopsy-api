const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const User = sequelize.define('users', {
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
  is_admin: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: false
  },
  user_name: {
    type: DataTypes.STRING(256),
    allowNull: true
  },
  normalized_user_name: {
    type: DataTypes.STRING(256),
    allowNull: true
  },
  email: {
    type: DataTypes.STRING(256),
    allowNull: true,
    unique: true
  },
  normalized_email: {
    type: DataTypes.STRING(256),
    allowNull: true
  },
  email_confirmed: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: false
  },
  password_hash: {
    type: DataTypes.TEXT('long'),
    allowNull: true
  },
  security_stamp: {
    type: DataTypes.TEXT('long'),
    allowNull: true
  },
  concurrency_stamp: {
    type: DataTypes.TEXT('long'),
    allowNull: true
  },
  phone_number: {
    type: DataTypes.TEXT('long'),
    allowNull: true
  },
  phone_number_confirmed: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: false
  },
  two_factor_enabled: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: false
  },
  lockout_end: {
    type: DataTypes.DATE(6),
    allowNull: true
  },
  lockout_enabled: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: true
  },
  access_failed_count: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0
  },
  first_name: {
    type: DataTypes.STRING(250),
    allowNull: true
  },
  last_name: {
    type: DataTypes.STRING(255),
    allowNull: true
  }
}, {
  tableName: 'users',
  timestamps: false
});

module.exports = User;
