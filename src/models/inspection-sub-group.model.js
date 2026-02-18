const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const InspectionSubGroup = sequelize.define('inspection_sub_groups', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  module_id: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  name: {
    type: DataTypes.STRING(100),
    allowNull: false
  },
  check_count: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0
  },
  sort_order: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0
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
  tableName: 'inspection_sub_groups',
  timestamps: false
});

module.exports = InspectionSubGroup;
