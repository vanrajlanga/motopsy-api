const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

/**
 * VehicleDetail model - matches .NET VehicleDetail entity
 * Contains all fields from Surepass rc-full API response
 */
const VehicleDetail = sequelize.define('vehicle_details', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  user_id: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  vehicle_detail_request_id: {
    type: DataTypes.INTEGER,
    allowNull: true
  },
  // Surepass fields (matches VehicleRcResponse)
  client_id: {
    type: DataTypes.STRING(255),
    allowNull: true
  },
  registration_number: {
    type: DataTypes.STRING(255),
    allowNull: true
  },
  registration_date: {
    type: DataTypes.DATE,
    allowNull: true
  },
  owner_name: {
    type: DataTypes.STRING(500),
    allowNull: true
  },
  father_name: {
    type: DataTypes.STRING(500),
    allowNull: true
  },
  present_address: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  permanent_address: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  mobile_number: {
    type: DataTypes.STRING(50),
    allowNull: true
  },
  vehicle_category: {
    type: DataTypes.STRING(255),
    allowNull: true
  },
  chassis_number: {
    type: DataTypes.STRING(255),
    allowNull: true
  },
  engine_number: {
    type: DataTypes.STRING(255),
    allowNull: true
  },
  maker_description: {
    type: DataTypes.STRING(500),
    allowNull: true
  },
  maker_model: {
    type: DataTypes.STRING(255),
    allowNull: true
  },
  // Legacy fields for backward compatibility
  manufacturer: {
    type: DataTypes.STRING(255),
    allowNull: true
  },
  model: {
    type: DataTypes.STRING(255),
    allowNull: true
  },
  vehicle_class: {
    type: DataTypes.STRING(255),
    allowNull: true
  },
  body_type: {
    type: DataTypes.STRING(100),
    allowNull: true
  },
  fuel_type: {
    type: DataTypes.STRING(100),
    allowNull: true
  },
  color: {
    type: DataTypes.STRING(100),
    allowNull: true
  },
  norms_type: {
    type: DataTypes.STRING(100),
    allowNull: true
  },
  fit_up_to: {
    type: DataTypes.STRING(100),
    allowNull: true
  },
  financer: {
    type: DataTypes.STRING(500),
    allowNull: true
  },
  financed: {
    type: DataTypes.BOOLEAN,
    allowNull: true,
    defaultValue: false
  },
  insurance_company: {
    type: DataTypes.STRING(500),
    allowNull: true
  },
  insurance_policy_number: {
    type: DataTypes.STRING(255),
    allowNull: true
  },
  insurance_valid_upto: {
    type: DataTypes.STRING(100),
    allowNull: true
  },
  manufacturing_date: {
    type: DataTypes.STRING(100),
    allowNull: true
  },
  manufacturing_date_formatted: {
    type: DataTypes.STRING(50),
    allowNull: true
  },
  registered_at: {
    type: DataTypes.STRING(255),
    allowNull: true
  },
  latest_by: {
    type: DataTypes.STRING(255),
    allowNull: true
  },
  less_info: {
    type: DataTypes.BOOLEAN,
    allowNull: true,
    defaultValue: false
  },
  tax_upto: {
    type: DataTypes.STRING(100),
    allowNull: true
  },
  tax_paid_upto: {
    type: DataTypes.STRING(100),
    allowNull: true
  },
  cubic_capacity: {
    type: DataTypes.STRING(50),
    allowNull: true
  },
  vehicle_gross_weight: {
    type: DataTypes.STRING(50),
    allowNull: true
  },
  no_cylinders: {
    type: DataTypes.STRING(20),
    allowNull: true
  },
  seat_capacity: {
    type: DataTypes.STRING(20),
    allowNull: true
  },
  sleeper_capacity: {
    type: DataTypes.STRING(20),
    allowNull: true
  },
  standing_capacity: {
    type: DataTypes.STRING(20),
    allowNull: true
  },
  wheelbase: {
    type: DataTypes.STRING(50),
    allowNull: true
  },
  unladen_weight: {
    type: DataTypes.STRING(50),
    allowNull: true
  },
  vehicle_category_description: {
    type: DataTypes.STRING(500),
    allowNull: true
  },
  pucc_number: {
    type: DataTypes.STRING(100),
    allowNull: true
  },
  pucc_upto: {
    type: DataTypes.STRING(100),
    allowNull: true
  },
  permit_number: {
    type: DataTypes.STRING(100),
    allowNull: true
  },
  permit_issue_date: {
    type: DataTypes.STRING(100),
    allowNull: true
  },
  permit_valid_from: {
    type: DataTypes.STRING(100),
    allowNull: true
  },
  permit_valid_upto: {
    type: DataTypes.STRING(100),
    allowNull: true
  },
  permit_type: {
    type: DataTypes.STRING(100),
    allowNull: true
  },
  national_permit_number: {
    type: DataTypes.STRING(100),
    allowNull: true
  },
  national_permit_upto: {
    type: DataTypes.STRING(100),
    allowNull: true
  },
  national_permit_issued_by: {
    type: DataTypes.STRING(255),
    allowNull: true
  },
  non_use_status: {
    type: DataTypes.STRING(100),
    allowNull: true
  },
  non_use_from: {
    type: DataTypes.STRING(100),
    allowNull: true
  },
  non_use_to: {
    type: DataTypes.STRING(100),
    allowNull: true
  },
  blacklist_status: {
    type: DataTypes.STRING(100),
    allowNull: true
  },
  noc_details: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  owner_number: {
    type: DataTypes.STRING(20),
    allowNull: true
  },
  rc_status: {
    type: DataTypes.STRING(100),
    allowNull: true
  },
  masked_name: {
    type: DataTypes.STRING(500),
    allowNull: true
  },
  challan_details: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  variant: {
    type: DataTypes.STRING(255),
    allowNull: true
  },
  // Ex-showroom price for resale value calculation
  ex_showroom_price: {
    type: DataTypes.DECIMAL(12, 2),
    allowNull: true
  },
  // Kilometers driven (from user input for OBV calculation)
  kms_driven: {
    type: DataTypes.INTEGER,
    allowNull: true
  },
  // Legacy fields
  fitness_upto: {
    type: DataTypes.DATE,
    allowNull: true
  },
  insurance_upto: {
    type: DataTypes.DATE,
    allowNull: true
  },
  purchase_date: {
    type: DataTypes.DATE,
    allowNull: true
  },
  status: {
    type: DataTypes.STRING(100),
    allowNull: true
  },
  api_source: {
    type: DataTypes.STRING(50),
    allowNull: true,
    comment: 'API used to fetch RC data: surepass, apiclub'
  },
  // Resale calculation fields
  user_provided_resale_data: {
    type: DataTypes.JSON,
    allowNull: true,
    comment: 'User-provided data for manual resale calculation (make, model, year, exShowroomPrice)'
  },
  resale_calculation_source: {
    type: DataTypes.ENUM('system', 'user'),
    allowNull: true,
    comment: 'Source of resale calculation: system (auto) or user (manual)'
  },
  resale_price_range: {
    type: DataTypes.JSON,
    allowNull: true,
    comment: 'Calculated resale price range (Excellent, VeryGood, Good, Fair)'
  },
  // Vehicle Specification Matching Result
  matched_spec_id: {
    type: DataTypes.INTEGER,
    allowNull: true,
    comment: 'Matched vehicle_specifications.id from matching algorithm'
  },
  matching_score: {
    type: DataTypes.INTEGER,
    allowNull: true,
    comment: 'Score achieved by the matched specification'
  },
  matching_log: {
    type: DataTypes.JSON,
    allowNull: true,
    comment: 'Detailed log of matching algorithm (input, breakdown, candidates)'
  },
  created_at: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW
  },
  modified_at: {
    type: DataTypes.DATE,
    allowNull: true
  }
}, {
  tableName: 'vehicle_details',
  timestamps: false
});

module.exports = VehicleDetail;
