const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const UserActivityLog = sequelize.define('UserActivityLogs', {
  Id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  UserId: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  Action: {
    type: DataTypes.STRING(500),
    allowNull: true
  },
  Details: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  IPAddress: {
    type: DataTypes.STRING(100),
    allowNull: true
  },
  UserAgent: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  CreatedAt: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW
  }
}, {
  tableName: 'UserActivityLogs',
  timestamps: false
});

module.exports = UserActivityLog;
