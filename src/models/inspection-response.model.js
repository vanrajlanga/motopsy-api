const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const InspectionResponse = sequelize.define('inspection_responses', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  inspection_id: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  parameter_id: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  selected_option: {
    type: DataTypes.TINYINT,
    allowNull: true,
    comment: '1-5 matching option_1..option_5, or null if unanswered'
  },
  severity_score: {
    type: DataTypes.DECIMAL(3, 2),
    allowNull: true,
    defaultValue: null
  },
  notes: {
    type: DataTypes.TEXT,
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
  tableName: 'inspection_responses',
  timestamps: false,
  indexes: [
    {
      unique: true,
      fields: ['inspection_id', 'parameter_id']
    }
  ]
});

module.exports = InspectionResponse;
