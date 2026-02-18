const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const InspectionScore = sequelize.define('inspection_scores', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  inspection_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    unique: true
  },
  engine_risk: {
    type: DataTypes.DECIMAL(5, 4),
    allowNull: true,
    defaultValue: 0
  },
  structural_risk: {
    type: DataTypes.DECIMAL(5, 4),
    allowNull: true,
    defaultValue: 0
  },
  transmission_risk: {
    type: DataTypes.DECIMAL(5, 4),
    allowNull: true,
    defaultValue: 0
  },
  paint_risk: {
    type: DataTypes.DECIMAL(5, 4),
    allowNull: true,
    defaultValue: 0
  },
  suspension_risk: {
    type: DataTypes.DECIMAL(5, 4),
    allowNull: true,
    defaultValue: 0
  },
  electrical_risk: {
    type: DataTypes.DECIMAL(5, 4),
    allowNull: true,
    defaultValue: 0
  },
  interior_risk: {
    type: DataTypes.DECIMAL(5, 4),
    allowNull: true,
    defaultValue: 0
  },
  road_test_risk: {
    type: DataTypes.DECIMAL(5, 4),
    allowNull: true,
    defaultValue: 0
  },
  documents_risk: {
    type: DataTypes.DECIMAL(5, 4),
    allowNull: true,
    defaultValue: 0
  },
  vri: {
    type: DataTypes.DECIMAL(5, 4),
    allowNull: true,
    defaultValue: 0
  },
  rating: {
    type: DataTypes.DECIMAL(3, 2),
    allowNull: true,
    defaultValue: 0
  },
  certification: {
    type: DataTypes.ENUM('Gold', 'Silver', 'Verified', 'Not Certified'),
    allowNull: true
  },
  has_red_flags: {
    type: DataTypes.TINYINT(1),
    allowNull: false,
    defaultValue: 0
  },
  red_flag_params: {
    type: DataTypes.JSON,
    allowNull: true
  },
  total_repair_cost: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: true,
    defaultValue: 0
  },
  repair_cost_breakdown: {
    type: DataTypes.JSON,
    allowNull: true
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
  tableName: 'inspection_scores',
  timestamps: false
});

module.exports = InspectionScore;
