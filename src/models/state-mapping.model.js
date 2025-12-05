const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const StateMapping = sequelize.define('statemappings', {
  Id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  StateCode: {
    type: DataTypes.STRING(50),
    allowNull: true
  },
  StateName: {
    type: DataTypes.STRING(255),
    allowNull: true
  },
  CreatedAt: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW
  }
}, {
  tableName: 'statemappings',
  timestamps: false
});

module.exports = StateMapping;
