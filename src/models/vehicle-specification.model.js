const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const VehicleSpecification = sequelize.define('vehiclespecifications', {
  Id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: false
  },
  naming_make: DataTypes.TEXT,
  naming_model: DataTypes.TEXT,
  naming_version: DataTypes.TEXT,
  naming_price: DataTypes.TEXT,
  keydata_key_price: DataTypes.TEXT,
  keydata_key_mileage_arai: DataTypes.TEXT,
  keydata_key_engine: DataTypes.TEXT,
  keydata_key_transmission: DataTypes.TEXT,
  keydata_key_fueltype: DataTypes.TEXT,
  keydata_key_seatingcapacity: DataTypes.TEXT,
  enginetransmission_engine: DataTypes.TEXT,
  enginetransmission_fueltype: DataTypes.TEXT,
  enginetransmission_maxpower: DataTypes.TEXT,
  enginetransmission_maxtorque: DataTypes.TEXT,
  enginetransmission_mileage_arai: DataTypes.TEXT,
  dimensionweight_length: DataTypes.TEXT,
  dimensionweight_width: DataTypes.TEXT,
  dimensionweight_height: DataTypes.TEXT,
  dimensionweight_wheelbase: DataTypes.TEXT,
  capacity_seating_capacity: DataTypes.TEXT,
  capacity_bootspace: DataTypes.TEXT,
  Description: DataTypes.TEXT
}, {
  tableName: 'vehiclespecifications',
  timestamps: false
});

module.exports = VehicleSpecification;
