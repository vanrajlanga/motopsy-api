const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const InspectionParameter = sequelize.define('inspection_parameters', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  sub_group_id: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  param_number: {
    type: DataTypes.INTEGER,
    allowNull: false,
    unique: true
  },
  name: {
    type: DataTypes.STRING(150),
    allowNull: false
  },
  detail: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  input_type: {
    type: DataTypes.STRING(50),
    allowNull: true
  },
  option_1: {
    type: DataTypes.STRING(100),
    allowNull: true
  },
  option_2: {
    type: DataTypes.STRING(100),
    allowNull: true
  },
  option_3: {
    type: DataTypes.STRING(100),
    allowNull: true
  },
  option_4: {
    type: DataTypes.STRING(100),
    allowNull: true
  },
  option_5: {
    type: DataTypes.STRING(100),
    allowNull: true
  },
  score_1: {
    type: DataTypes.DECIMAL(3, 2),
    allowNull: true
  },
  score_2: {
    type: DataTypes.DECIMAL(3, 2),
    allowNull: true
  },
  score_3: {
    type: DataTypes.DECIMAL(3, 2),
    allowNull: true
  },
  score_4: {
    type: DataTypes.DECIMAL(3, 2),
    allowNull: true
  },
  score_5: {
    type: DataTypes.DECIMAL(3, 2),
    allowNull: true
  },
  fuel_filter: {
    type: DataTypes.STRING(100),
    allowNull: true,
    defaultValue: 'All'
  },
  transmission_filter: {
    type: DataTypes.STRING(100),
    allowNull: true,
    defaultValue: 'All'
  },
  is_red_flag: {
    type: DataTypes.TINYINT(1),
    allowNull: false,
    defaultValue: 0
  },
  sort_order: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0
  },
  is_active: {
    type: DataTypes.TINYINT(1),
    allowNull: false,
    defaultValue: 1
  },
  weightage: {
    type: DataTypes.DECIMAL(5, 2),
    allowNull: false,
    defaultValue: 1.00
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
  tableName: 'inspection_parameters',
  timestamps: false
});

module.exports = InspectionParameter;
