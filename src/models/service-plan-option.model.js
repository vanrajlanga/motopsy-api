const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const ServicePlanOption = sequelize.define('service_plan_options', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  service_plan_id: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  option_key: {
    type: DataTypes.STRING(100),
    allowNull: false
  },
  option_name: {
    type: DataTypes.STRING(255),
    allowNull: false
  },
  amount: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
    get() {
      const value = this.getDataValue('amount');
      return value ? parseFloat(value) : 0;
    }
  },
  currency: {
    type: DataTypes.STRING(10),
    allowNull: false,
    defaultValue: 'INR'
  },
  description: {
    type: DataTypes.TEXT
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
  tableName: 'service_plan_options',
  timestamps: false
});

module.exports = ServicePlanOption;
