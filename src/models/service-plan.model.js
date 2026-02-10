const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const ServicePlan = sequelize.define('service_plans', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  service_key: {
    type: DataTypes.STRING(100),
    allowNull: false,
    unique: true
  },
  service_name: {
    type: DataTypes.STRING(255),
    allowNull: false
  },
  description: {
    type: DataTypes.TEXT
  },
  service_type: {
    type: DataTypes.INTEGER,
    allowNull: false,
    comment: '3=UsedVehiclePDI, 4=NewVehiclePDI, 5=ServiceHistoryReport'
  },
  default_amount: {
    type: DataTypes.DECIMAL(10, 2),
    defaultValue: 0.00,
    comment: 'Default price for brands without specific pricing',
    get() {
      const value = this.getDataValue('default_amount');
      return value ? parseFloat(value) : 0;
    }
  },
  is_active: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: true
  },
  display_order: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  },
  created_at: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW
  },
  modified_at: {
    type: DataTypes.DATE
  },
  modified_by: {
    type: DataTypes.INTEGER
  }
}, {
  tableName: 'service_plans',
  timestamps: false
});

module.exports = ServicePlan;
