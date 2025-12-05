const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const PaymentHistory = sequelize.define('paymenthistories', {
  Id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  UserId: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  Amount: {
    type: DataTypes.DECIMAL(18, 2),
    allowNull: false
  },
  OrderId: {
    type: DataTypes.STRING(255),
    allowNull: true
  },
  PaymentId: {
    type: DataTypes.STRING(255),
    allowNull: true
  },
  Signature: {
    type: DataTypes.STRING(500),
    allowNull: true
  },
  Status: {
    type: DataTypes.STRING(50),
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
  tableName: 'paymenthistories',
  timestamps: false
});

module.exports = PaymentHistory;
