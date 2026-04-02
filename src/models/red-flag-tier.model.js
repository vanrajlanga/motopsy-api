const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const RedFlagTier = sequelize.define('red_flag_tiers', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  param_number: {
    type: DataTypes.INTEGER,
    allowNull: false,
    comment: 'Maps to inspection_parameters.param_number'
  },
  sub_item_label: {
    type: DataTypes.STRING(255),
    allowNull: false
  },
  tier: {
    type: DataTypes.INTEGER,
    allowNull: false,
    comment: 'Legacy — use tier_uc/tier_pdi instead'
  },
  tier_uc: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0,
    comment: 'UC tier: 0=none, 1=Instant Kill, 2=Hard Cap, 3=Soft Penalty'
  },
  tier_pdi: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0,
    comment: 'PDI tier: 0=none, 1=Instant Kill, 2=Hard Cap, 3=Soft Penalty'
  },
  is_pdi_only: {
    type: DataTypes.TINYINT(1),
    allowNull: false,
    defaultValue: 0,
    comment: 'Legacy — kept for backward compat'
  },
  created_at: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW
  },
  updated_at: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW
  }
}, {
  tableName: 'red_flag_tiers',
  timestamps: false
});

module.exports = RedFlagTier;
