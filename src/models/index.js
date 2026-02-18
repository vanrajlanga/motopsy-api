const { sequelize } = require('../config/database');

// Import all models
const User = require('./user.model');
const Role = require('./role.model');
const UserRole = require('./user-role.model');
const PaymentHistory = require('./payment-history.model');
const VehicleDetailRequest = require('./vehicle-detail-request.model');
const VehicleDetail = require('./vehicle-detail.model');
const PhysicalVerification = require('./physical-verification.model');
const UserActivityLog = require('./user-activity-log.model');
const Coupon = require('./coupon.model');
const CouponUsageHistory = require('./coupon-usage-history.model');
const CouponAuditLog = require('./coupon-audit-log.model');
const PricingSetting = require('./pricing-setting.model');
const Invoice = require('./invoice.model');
const NcrbReport = require('./ncrb-report.model');
const VehicleSpecDiscrepancy = require('./discrepancy.model');
const ServiceHistory = require('./service-history.model');
const ServicePlan = require('./service-plan.model');
const ServicePlanOption = require('./service-plan-option.model');
const ServiceOrder = require('./service-order.model');
const AppointmentSlotBlock = require('./appointment-slot-block.model');
const InspectionModule = require('./inspection-module.model');
const InspectionSubGroup = require('./inspection-sub-group.model');
const InspectionParameter = require('./inspection-parameter.model');
const Inspection = require('./inspection.model');
const InspectionResponse = require('./inspection-response.model');
const InspectionPhoto = require('./inspection-photo.model');
const InspectionScore = require('./inspection-score.model');
const InspectionCertificate = require('./inspection-certificate.model');

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

// Invoice belongs to PaymentHistory
if (!Invoice.associations.PaymentHistory) {
  Invoice.belongsTo(PaymentHistory, {
    foreignKey: 'payment_history_id',
    as: 'PaymentHistory'
  });
}

// Invoice belongs to User
if (!Invoice.associations.User) {
  Invoice.belongsTo(User, {
    foreignKey: 'user_id',
    as: 'User'
  });
}

// PaymentHistory has one Invoice
if (!PaymentHistory.associations.Invoice) {
  PaymentHistory.hasOne(Invoice, {
    foreignKey: 'payment_history_id',
    as: 'Invoice'
  });
}

// NcrbReport belongs to VehicleDetail
if (!NcrbReport.associations.VehicleDetail) {
  NcrbReport.belongsTo(VehicleDetail, {
    foreignKey: 'vehicle_detail_id',
    as: 'VehicleDetail'
  });
}

// VehicleDetail has one NcrbReport
if (!VehicleDetail.associations.NcrbReport) {
  VehicleDetail.hasOne(NcrbReport, {
    foreignKey: 'vehicle_detail_id',
    as: 'NcrbReport'
  });
}

// VehicleSpecDiscrepancy belongs to User
if (!VehicleSpecDiscrepancy.associations.User) {
  VehicleSpecDiscrepancy.belongsTo(User, {
    foreignKey: 'user_id',
    as: 'User'
  });
}

// VehicleSpecDiscrepancy belongs to VehicleDetail (old)
if (!VehicleSpecDiscrepancy.associations.OldVehicleDetail) {
  VehicleSpecDiscrepancy.belongsTo(VehicleDetail, {
    foreignKey: 'old_vehicle_detail_id',
    as: 'OldVehicleDetail'
  });
}

// VehicleSpecDiscrepancy belongs to VehicleDetail (new)
if (!VehicleSpecDiscrepancy.associations.NewVehicleDetail) {
  VehicleSpecDiscrepancy.belongsTo(VehicleDetail, {
    foreignKey: 'new_vehicle_detail_id',
    as: 'NewVehicleDetail'
  });
}

// User-Role many-to-many association
if (!User.associations.Roles) {
  User.belongsToMany(Role, {
    through: UserRole,
    foreignKey: 'user_id',
    otherKey: 'role_id',
    as: 'Roles'
  });
}

if (!Role.associations.Users) {
  Role.belongsToMany(User, {
    through: UserRole,
    foreignKey: 'role_id',
    otherKey: 'user_id',
    as: 'Users'
  });
}

// UserRole belongs to User and Role
if (!UserRole.associations.User) {
  UserRole.belongsTo(User, { foreignKey: 'user_id', as: 'User' });
}

if (!UserRole.associations.Role) {
  UserRole.belongsTo(Role, { foreignKey: 'role_id', as: 'Role' });
}

// ServicePlan has many ServicePlanOptions
if (!ServicePlan.associations.options) {
  ServicePlan.hasMany(ServicePlanOption, {
    foreignKey: 'service_plan_id',
    as: 'options'
  });
}

// ServicePlanOption belongs to ServicePlan
if (!ServicePlanOption.associations.ServicePlan) {
  ServicePlanOption.belongsTo(ServicePlan, {
    foreignKey: 'service_plan_id',
    as: 'ServicePlan'
  });
}

// ServiceOrder belongs to User
if (!ServiceOrder.associations.User) {
  ServiceOrder.belongsTo(User, {
    foreignKey: 'user_id',
    as: 'User'
  });
}

// ServiceOrder belongs to PaymentHistory
if (!ServiceOrder.associations.PaymentHistory) {
  ServiceOrder.belongsTo(PaymentHistory, {
    foreignKey: 'payment_history_id',
    as: 'PaymentHistory'
  });
}

// ServiceOrder belongs to ServicePlan
if (!ServiceOrder.associations.ServicePlan) {
  ServiceOrder.belongsTo(ServicePlan, {
    foreignKey: 'service_plan_id',
    as: 'ServicePlan'
  });
}

// ServiceOrder belongs to ServicePlanOption
if (!ServiceOrder.associations.ServicePlanOption) {
  ServiceOrder.belongsTo(ServicePlanOption, {
    foreignKey: 'service_plan_option_id',
    as: 'ServicePlanOption'
  });
}

// --- Inspection System Associations ---

// InspectionModule has many InspectionSubGroups
if (!InspectionModule.associations.SubGroups) {
  InspectionModule.hasMany(InspectionSubGroup, {
    foreignKey: 'module_id',
    as: 'SubGroups'
  });
}

// InspectionSubGroup belongs to InspectionModule
if (!InspectionSubGroup.associations.Module) {
  InspectionSubGroup.belongsTo(InspectionModule, {
    foreignKey: 'module_id',
    as: 'Module'
  });
}

// InspectionSubGroup has many InspectionParameters
if (!InspectionSubGroup.associations.Parameters) {
  InspectionSubGroup.hasMany(InspectionParameter, {
    foreignKey: 'sub_group_id',
    as: 'Parameters'
  });
}

// InspectionParameter belongs to InspectionSubGroup
if (!InspectionParameter.associations.SubGroup) {
  InspectionParameter.belongsTo(InspectionSubGroup, {
    foreignKey: 'sub_group_id',
    as: 'SubGroup'
  });
}

// Inspection belongs to User (technician)
if (!Inspection.associations.Technician) {
  Inspection.belongsTo(User, {
    foreignKey: 'technician_id',
    as: 'Technician'
  });
}

// Inspection has many InspectionResponses
if (!Inspection.associations.Responses) {
  Inspection.hasMany(InspectionResponse, {
    foreignKey: 'inspection_id',
    as: 'Responses'
  });
}

// Inspection has one InspectionScore
if (!Inspection.associations.Score) {
  Inspection.hasOne(InspectionScore, {
    foreignKey: 'inspection_id',
    as: 'Score'
  });
}

// Inspection has one InspectionCertificate
if (!Inspection.associations.Certificate) {
  Inspection.hasOne(InspectionCertificate, {
    foreignKey: 'inspection_id',
    as: 'Certificate'
  });
}

// InspectionResponse belongs to Inspection
if (!InspectionResponse.associations.Inspection) {
  InspectionResponse.belongsTo(Inspection, {
    foreignKey: 'inspection_id',
    as: 'Inspection'
  });
}

// InspectionResponse belongs to InspectionParameter
if (!InspectionResponse.associations.Parameter) {
  InspectionResponse.belongsTo(InspectionParameter, {
    foreignKey: 'parameter_id',
    as: 'Parameter'
  });
}

// InspectionResponse has many InspectionPhotos
if (!InspectionResponse.associations.Photos) {
  InspectionResponse.hasMany(InspectionPhoto, {
    foreignKey: 'response_id',
    as: 'Photos'
  });
}

// InspectionPhoto belongs to InspectionResponse
if (!InspectionPhoto.associations.Response) {
  InspectionPhoto.belongsTo(InspectionResponse, {
    foreignKey: 'response_id',
    as: 'Response'
  });
}

// InspectionScore belongs to Inspection
if (!InspectionScore.associations.Inspection) {
  InspectionScore.belongsTo(Inspection, {
    foreignKey: 'inspection_id',
    as: 'Inspection'
  });
}

// InspectionCertificate belongs to Inspection
if (!InspectionCertificate.associations.Inspection) {
  InspectionCertificate.belongsTo(Inspection, {
    foreignKey: 'inspection_id',
    as: 'Inspection'
  });
}

module.exports = {
  sequelize,
  User,
  Role,
  UserRole,
  PaymentHistory,
  VehicleDetailRequest,
  VehicleDetail,
  PhysicalVerification,
  UserActivityLog,
  Coupon,
  CouponUsageHistory,
  CouponAuditLog,
  PricingSetting,
  Invoice,
  NcrbReport,
  VehicleSpecDiscrepancy,
  ServiceHistory,
  ServicePlan,
  ServicePlanOption,
  ServiceOrder,
  AppointmentSlotBlock,
  InspectionModule,
  InspectionSubGroup,
  InspectionParameter,
  Inspection,
  InspectionResponse,
  InspectionPhoto,
  InspectionScore,
  InspectionCertificate
};
