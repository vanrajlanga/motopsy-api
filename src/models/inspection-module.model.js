const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const InspectionModule = sequelize.define('inspection_modules', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  name: {
    type: DataTypes.STRING(100),
    allowNull: false
  },
  slug: {
    type: DataTypes.STRING(50),
    allowNull: false,
    unique: true
  },
  icon: {
    type: DataTypes.STRING(10),
    allowNull: true
  },
  weight: {
    type: DataTypes.DECIMAL(4, 2),
    allowNull: false
  },
  base_repair_cost: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
    defaultValue: 0
  },
  gamma: {
    type: DataTypes.DECIMAL(4, 2),
    allowNull: false,
    defaultValue: 1.3
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
  tableName: 'inspection_modules',
  timestamps: false
});

module.exports = InspectionModule;
