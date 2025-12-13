const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const StateMapping = sequelize.define('state_mappings', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  state_code: {
    type: DataTypes.STRING(50),
    allowNull: true
  },
  state_name: {
    type: DataTypes.STRING(255),
    allowNull: true
  },
  created_at: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW
  }
}, {
  tableName: 'state_mappings',
  timestamps: false
});

module.exports = StateMapping;
