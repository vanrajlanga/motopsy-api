const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const CouponUsageHistory = sequelize.define('coupon_usage_history', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  coupon_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'coupons',
      key: 'id'
    }
  },
  user_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'users',
      key: 'id'
    }
  },
  payment_history_id: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: {
      model: 'payment_histories',
      key: 'id'
    }
  },
  original_amount: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false
  },
  discount_amount: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false
  },
  final_amount: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false
  },
  created_at: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW
  }
}, {
  tableName: 'coupon_usage_history',
  timestamps: false,
  underscored: false
});

module.exports = CouponUsageHistory;
