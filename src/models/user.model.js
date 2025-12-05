const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const User = sequelize.define('AspNetUsers', {
  Id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  CreatedAt: {
    type: DataTypes.DATE(6),
    allowNull: false,
    defaultValue: DataTypes.NOW
  },
  ModifiedAt: {
    type: DataTypes.DATE(6),
    allowNull: true
  },
  IsAdmin: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: false
  },
  UserName: {
    type: DataTypes.STRING(256),
    allowNull: true
  },
  NormalizedUserName: {
    type: DataTypes.STRING(256),
    allowNull: true
  },
  Email: {
    type: DataTypes.STRING(256),
    allowNull: true,
    unique: true
  },
  NormalizedEmail: {
    type: DataTypes.STRING(256),
    allowNull: true
  },
  EmailConfirmed: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: false
  },
  PasswordHash: {
    type: DataTypes.TEXT('long'),
    allowNull: true
  },
  SecurityStamp: {
    type: DataTypes.TEXT('long'),
    allowNull: true
  },
  ConcurrencyStamp: {
    type: DataTypes.TEXT('long'),
    allowNull: true
  },
  PhoneNumber: {
    type: DataTypes.TEXT('long'),
    allowNull: true
  },
  PhoneNumberConfirmed: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: false
  },
  TwoFactorEnabled: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: false
  },
  LockoutEnd: {
    type: DataTypes.DATE(6),
    allowNull: true
  },
  LockoutEnabled: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: true
  },
  AccessFailedCount: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0
  },
  FirstName: {
    type: DataTypes.STRING(250),
    allowNull: true
  },
  LastName: {
    type: DataTypes.STRING(255),
    allowNull: true
  }
}, {
  tableName: 'AspNetUsers',
  timestamps: false
});

module.exports = User;
