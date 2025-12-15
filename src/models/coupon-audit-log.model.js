const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const CouponAuditLog = sequelize.define('coupon_audit_log', {
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
  action: {
    type: DataTypes.ENUM('created', 'updated', 'deleted', 'activated', 'deactivated'),
    allowNull: false
  },
  changed_by: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: {
      model: 'users',
      key: 'id'
    }
  },
  old_values: {
    type: DataTypes.JSON,
    allowNull: true
  },
  new_values: {
    type: DataTypes.JSON,
    allowNull: true
  },
  ip_address: {
    type: DataTypes.STRING(45),
    allowNull: true
  },
  created_at: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW
  }
}, {
  tableName: 'coupon_audit_log',
  timestamps: false,
  underscored: false
});

module.exports = CouponAuditLog;
