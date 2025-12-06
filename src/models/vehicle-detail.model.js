const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

/**
 * VehicleDetail model - matches .NET VehicleDetail entity
 * Contains all fields from Surepass rc-full API response
 */
const VehicleDetail = sequelize.define('VehicleDetails', {
  Id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  UserId: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  VehicleDetailRequestId: {
    type: DataTypes.INTEGER,
    allowNull: true
  },
  // Surepass fields (matches VehicleRcResponse)
  ClientId: {
    type: DataTypes.STRING(255),
    allowNull: true
  },
  RegistrationNumber: {
    type: DataTypes.STRING(255),
    allowNull: true
  },
  RegistrationDate: {
    type: DataTypes.DATE,
    allowNull: true
  },
  OwnerName: {
    type: DataTypes.STRING(500),
    allowNull: true
  },
  FatherName: {
    type: DataTypes.STRING(500),
    allowNull: true
  },
  PresentAddress: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  PermanentAddress: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  MobileNumber: {
    type: DataTypes.STRING(50),
    allowNull: true
  },
  VehicleCategory: {
    type: DataTypes.STRING(255),
    allowNull: true
  },
  ChassisNumber: {
    type: DataTypes.STRING(255),
    allowNull: true
  },
  EngineNumber: {
    type: DataTypes.STRING(255),
    allowNull: true
  },
  MakerDescription: {
    type: DataTypes.STRING(500),
    allowNull: true
  },
  MakerModel: {
    type: DataTypes.STRING(255),
    allowNull: true
  },
  // Legacy fields for backward compatibility
  Manufacturer: {
    type: DataTypes.STRING(255),
    allowNull: true
  },
  Model: {
    type: DataTypes.STRING(255),
    allowNull: true
  },
  VehicleClass: {
    type: DataTypes.STRING(255),
    allowNull: true
  },
  BodyType: {
    type: DataTypes.STRING(100),
    allowNull: true
  },
  FuelType: {
    type: DataTypes.STRING(100),
    allowNull: true
  },
  Color: {
    type: DataTypes.STRING(100),
    allowNull: true
  },
  NormsType: {
    type: DataTypes.STRING(100),
    allowNull: true
  },
  FitUpTo: {
    type: DataTypes.STRING(100),
    allowNull: true
  },
  Financer: {
    type: DataTypes.STRING(500),
    allowNull: true
  },
  Financed: {
    type: DataTypes.BOOLEAN,
    allowNull: true,
    defaultValue: false
  },
  InsuranceCompany: {
    type: DataTypes.STRING(500),
    allowNull: true
  },
  InsurancePolicyNumber: {
    type: DataTypes.STRING(255),
    allowNull: true
  },
  InsuranceValidUpto: {
    type: DataTypes.STRING(100),
    allowNull: true
  },
  ManufacturingDate: {
    type: DataTypes.STRING(100),
    allowNull: true
  },
  ManufacturingDateFormatted: {
    type: DataTypes.STRING(50),
    allowNull: true
  },
  RegisteredAt: {
    type: DataTypes.STRING(255),
    allowNull: true
  },
  LatestBy: {
    type: DataTypes.STRING(255),
    allowNull: true
  },
  LessInfo: {
    type: DataTypes.BOOLEAN,
    allowNull: true,
    defaultValue: false
  },
  TaxUpto: {
    type: DataTypes.STRING(100),
    allowNull: true
  },
  TaxPaidUpto: {
    type: DataTypes.STRING(100),
    allowNull: true
  },
  CubicCapacity: {
    type: DataTypes.STRING(50),
    allowNull: true
  },
  VehicleGrossWeight: {
    type: DataTypes.STRING(50),
    allowNull: true
  },
  NoCylinders: {
    type: DataTypes.STRING(20),
    allowNull: true
  },
  SeatCapacity: {
    type: DataTypes.STRING(20),
    allowNull: true
  },
  SleeperCapacity: {
    type: DataTypes.STRING(20),
    allowNull: true
  },
  StandingCapacity: {
    type: DataTypes.STRING(20),
    allowNull: true
  },
  Wheelbase: {
    type: DataTypes.STRING(50),
    allowNull: true
  },
  UnladenWeight: {
    type: DataTypes.STRING(50),
    allowNull: true
  },
  VehicleCategoryDescription: {
    type: DataTypes.STRING(500),
    allowNull: true
  },
  PUCCNumber: {
    type: DataTypes.STRING(100),
    allowNull: true
  },
  PUCCUpto: {
    type: DataTypes.STRING(100),
    allowNull: true
  },
  PermitNumber: {
    type: DataTypes.STRING(100),
    allowNull: true
  },
  PermitIssueDate: {
    type: DataTypes.STRING(100),
    allowNull: true
  },
  PermitValidFrom: {
    type: DataTypes.STRING(100),
    allowNull: true
  },
  PermitValidUpto: {
    type: DataTypes.STRING(100),
    allowNull: true
  },
  PermitType: {
    type: DataTypes.STRING(100),
    allowNull: true
  },
  NationalPermitNumber: {
    type: DataTypes.STRING(100),
    allowNull: true
  },
  NationalPermitUpto: {
    type: DataTypes.STRING(100),
    allowNull: true
  },
  NationalPermitIssuedBy: {
    type: DataTypes.STRING(255),
    allowNull: true
  },
  NonUseStatus: {
    type: DataTypes.STRING(100),
    allowNull: true
  },
  NonUseFrom: {
    type: DataTypes.STRING(100),
    allowNull: true
  },
  NonUseTo: {
    type: DataTypes.STRING(100),
    allowNull: true
  },
  BlacklistStatus: {
    type: DataTypes.STRING(100),
    allowNull: true
  },
  NocDetails: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  OwnerNumber: {
    type: DataTypes.STRING(20),
    allowNull: true
  },
  RcStatus: {
    type: DataTypes.STRING(100),
    allowNull: true
  },
  MaskedName: {
    type: DataTypes.STRING(500),
    allowNull: true
  },
  ChallanDetails: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  Variant: {
    type: DataTypes.STRING(255),
    allowNull: true
  },
  // Ex-showroom price for resale value calculation
  ExShowroomPrice: {
    type: DataTypes.DECIMAL(12, 2),
    allowNull: true
  },
  // Legacy fields
  FitnessUpto: {
    type: DataTypes.DATE,
    allowNull: true
  },
  InsuranceUpto: {
    type: DataTypes.DATE,
    allowNull: true
  },
  PurchaseDate: {
    type: DataTypes.DATE,
    allowNull: true
  },
  Status: {
    type: DataTypes.STRING(100),
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
  tableName: 'VehicleDetails',
  timestamps: false
});

module.exports = VehicleDetail;
