const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const InspectionCertificate = sequelize.define('inspection_certificates', {
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
  certificate_number: {
    type: DataTypes.STRING(30),
    allowNull: false,
    unique: true
  },
  qr_code_data: {
    type: DataTypes.STRING(500),
    allowNull: true
  },
  rating: {
    type: DataTypes.DECIMAL(3, 2),
    allowNull: true
  },
  certification: {
    type: DataTypes.ENUM('Gold', 'Silver', 'Verified', 'Not Certified'),
    allowNull: true
  },
  issued_at: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW
  },
  expires_at: {
    type: DataTypes.DATE,
    allowNull: true
  },
  created_at: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW
  }
}, {
  tableName: 'inspection_certificates',
  timestamps: false
});

module.exports = InspectionCertificate;
