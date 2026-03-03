const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const InspectionTemplate = sequelize.define('inspection_templates', {
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
  description: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  /**
   * Per-module weight overrides keyed by module slug.
   * e.g. { "paint_panel": 0.30, "road_test": 0.00, ... }
   * NULL means use inspection_modules.weight (the global default).
   */
  module_weights: {
    type: DataTypes.JSON,
    allowNull: true
  },
  /**
   * Array of certification levels in descending minRating order.
   * e.g. [{ "label": "Accept Delivery", "minRating": 4.5 }, ...]
   * NULL means use the default used-car Gold/Silver/Verified labels.
   */
  certification_levels: {
    type: DataTypes.JSON,
    allowNull: true
  },
  is_active: {
    type: DataTypes.TINYINT(1),
    allowNull: false,
    defaultValue: 1
  },
  created_at: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW
  }
}, {
  tableName: 'inspection_templates',
  timestamps: false
});

module.exports = InspectionTemplate;
