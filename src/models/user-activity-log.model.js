const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const UserActivityLog = sequelize.define('user_activity_logs', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  user_id: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  action: {
    type: DataTypes.STRING(500),
    allowNull: true
  },
  screen: {
    type: DataTypes.STRING(500),
    allowNull: true
  },
  details: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  ip_address: {
    type: DataTypes.STRING(100),
    allowNull: true
  },
  user_agent: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  created_at: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW
  }
}, {
  tableName: 'user_activity_logs',
  timestamps: false
});

// Define association with User model
const User = require('./user.model');
UserActivityLog.belongsTo(User, { foreignKey: 'user_id', as: 'User' });

module.exports = UserActivityLog;
