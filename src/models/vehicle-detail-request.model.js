const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const VehicleDetailRequest = sequelize.define('vehicle_detail_requests', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  user_id: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  payment_history_id: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: {
      model: 'payment_histories',
      key: 'id'
    }
  },
  registration_number: {
    type: DataTypes.STRING(255),
    allowNull: true
  },
  make: {
    type: DataTypes.STRING(100),
    allowNull: true
  },
  model: {
    type: DataTypes.STRING(100),
    allowNull: true
  },
  year: {
    type: DataTypes.STRING(10),
    allowNull: true
  },
  trim: {
    type: DataTypes.STRING(100),
    allowNull: true
  },
  kms_driven: {
    type: DataTypes.STRING(50),
    allowNull: true
  },
  city: {
    type: DataTypes.STRING(100),
    allowNull: true
  },
  no_of_owners: {
    type: DataTypes.STRING(10),
    allowNull: true
  },
  version: {
    type: DataTypes.STRING(100),
    allowNull: true
  },
  transaction_type: {
    type: DataTypes.STRING(50),
    allowNull: true
  },
  customer_type: {
    type: DataTypes.STRING(50),
    allowNull: true
  },
  status: {
    type: DataTypes.STRING(100),
    allowNull: true
  },
  request_data: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  response_data: {
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
  tableName: 'vehicle_detail_requests',
  timestamps: false
});

module.exports = VehicleDetailRequest;
