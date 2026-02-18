const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const InspectionPhoto = sequelize.define('inspection_photos', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  response_id: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  file_path: {
    type: DataTypes.STRING(500),
    allowNull: false
  },
  file_name: {
    type: DataTypes.STRING(255),
    allowNull: false
  },
  file_size: {
    type: DataTypes.INTEGER,
    allowNull: true
  },
  created_at: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW
  }
}, {
  tableName: 'inspection_photos',
  timestamps: false
});

module.exports = InspectionPhoto;
