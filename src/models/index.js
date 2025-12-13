const { sequelize } = require('../config/database');

// Import all models
const User = require('./user.model');
const PaymentHistory = require('./payment-history.model');
const VehicleDetailRequest = require('./vehicle-detail-request.model');
const VehicleDetail = require('./vehicle-detail.model');
const PhysicalVerification = require('./physical-verification.model');
const UserActivityLog = require('./user-activity-log.model');

// Setup associations (only if not already defined)

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

module.exports = {
  sequelize,
  User,
  PaymentHistory,
  VehicleDetailRequest,
  VehicleDetail,
  PhysicalVerification,
  UserActivityLog
};
