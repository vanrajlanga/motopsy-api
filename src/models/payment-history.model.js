const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const PaymentHistory = sequelize.define('payment_histories', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  user_id: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  amount: {
    type: DataTypes.DECIMAL(18, 2),
    allowNull: false
  },
  payment_for: {
    type: DataTypes.INTEGER,
    allowNull: false,
    comment: '0=VehicleHistoryReport, 1=PhysicalVerification'
  },
  method: {
    type: DataTypes.INTEGER,
    allowNull: true,
    comment: '0=Card, 1=Netbanking, 2=Wallet, 3=PayLater, 4=UPI'
  },
  status: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0,
    comment: '0=Pending, 1=Successful, 2=Failed, 3=NotVerified, 4=Refunded'
  },
  order_id: {
    type: DataTypes.STRING(255),
    allowNull: false
  },
  transaction_id: {
    type: DataTypes.STRING(255),
    allowNull: true
  },
  payment_date: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW
  },
  created_at: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW
  },
  modified_at: {
    type: DataTypes.DATE,
    allowNull: true
  },
  // Coupon tracking columns
  coupon_id: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: {
      model: 'coupons',
      key: 'id'
    }
  },
  original_amount: {
    type: DataTypes.DECIMAL(18, 2),
    allowNull: true,
    comment: 'Original amount before coupon discount'
  },
  discount_amount: {
    type: DataTypes.DECIMAL(18, 2),
    allowNull: true,
    comment: 'Discount amount from coupon'
  }
}, {
  tableName: 'payment_histories',
  timestamps: false
});

// Define association
PaymentHistory.associate = (models) => {
  PaymentHistory.belongsTo(models.User, {
    foreignKey: 'user_id',
    as: 'User'
  });
};

module.exports = PaymentHistory;
