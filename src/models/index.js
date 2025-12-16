const { sequelize } = require('../config/database');

// Import all models
const User = require('./user.model');
const PaymentHistory = require('./payment-history.model');
const VehicleDetailRequest = require('./vehicle-detail-request.model');
const VehicleDetail = require('./vehicle-detail.model');
const PhysicalVerification = require('./physical-verification.model');
const UserActivityLog = require('./user-activity-log.model');
const Coupon = require('./coupon.model');
const CouponUsageHistory = require('./coupon-usage-history.model');
const CouponAuditLog = require('./coupon-audit-log.model');
const PricingSetting = require('./pricing-setting.model');

// Setup associations (only if not already defined)

// PaymentHistory belongs to User
if (!PaymentHistory.associations.User) {
  PaymentHistory.belongsTo(User, {
    foreignKey: 'user_id',
    as: 'User'
  });
}

// VehicleDetailRequest belongs to PaymentHistory
if (!VehicleDetailRequest.associations.PaymentHistory) {
  VehicleDetailRequest.belongsTo(PaymentHistory, {
    foreignKey: 'payment_history_id',
    as: 'PaymentHistory'
  });
}

// PaymentHistory has many VehicleDetailRequests
if (!PaymentHistory.associations.VehicleDetailRequests) {
  PaymentHistory.hasMany(VehicleDetailRequest, {
    foreignKey: 'payment_history_id',
    as: 'VehicleDetailRequests'
  });
}

// PaymentHistory belongs to Coupon
if (!PaymentHistory.associations.Coupon) {
  PaymentHistory.belongsTo(Coupon, {
    foreignKey: 'coupon_id',
    as: 'Coupon'
  });
}

// Coupon has many PaymentHistories
if (!Coupon.associations.PaymentHistories) {
  Coupon.hasMany(PaymentHistory, {
    foreignKey: 'coupon_id',
    as: 'PaymentHistories'
  });
}

// CouponUsageHistory belongs to Coupon
if (!CouponUsageHistory.associations.Coupon) {
  CouponUsageHistory.belongsTo(Coupon, {
    foreignKey: 'coupon_id',
    as: 'Coupon'
  });
}

// Coupon has many CouponUsageHistories
if (!Coupon.associations.UsageHistories) {
  Coupon.hasMany(CouponUsageHistory, {
    foreignKey: 'coupon_id',
    as: 'UsageHistories'
  });
}

// CouponAuditLog belongs to Coupon
if (!CouponAuditLog.associations.Coupon) {
  CouponAuditLog.belongsTo(Coupon, {
    foreignKey: 'coupon_id',
    as: 'Coupon'
  });
}

module.exports = {
  sequelize,
  User,
  PaymentHistory,
  VehicleDetailRequest,
  VehicleDetail,
  PhysicalVerification,
  UserActivityLog,
  Coupon,
  CouponUsageHistory,
  CouponAuditLog,
  PricingSetting
};
