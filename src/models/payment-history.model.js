const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const PaymentHistory = sequelize.define('PaymentHistory', {
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
  PaymentFor: {
    type: DataTypes.INTEGER,
    allowNull: false,
    comment: '0=VehicleHistoryReport, 1=PhysicalVerification'
  },
  Method: {
    type: DataTypes.INTEGER,
    allowNull: true,
    comment: '0=Card, 1=Netbanking, 2=Wallet, 3=PayLater, 4=UPI'
  },
  Status: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0,
    comment: '0=Pending, 1=Successful, 2=Failed, 3=NotVerified, 4=Refunded'
  },
  OrderId: {
    type: DataTypes.STRING(255),
    allowNull: false
  },
  TransactionId: {
    type: DataTypes.STRING(255),
    allowNull: true
  },
  // Note: VehicleDetailRequestId does NOT exist in this table
  // The relationship is reversed: VehicleDetailRequest has PaymentHistoryId
  PaymentDate: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW
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

// Define association
PaymentHistory.associate = (models) => {
  PaymentHistory.belongsTo(models.User, {
    foreignKey: 'UserId',
    as: 'User'
  });
};

module.exports = PaymentHistory;
