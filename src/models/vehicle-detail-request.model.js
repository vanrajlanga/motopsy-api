const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const VehicleDetailRequest = sequelize.define('vehicledetailrequests', {
  Id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  PaymentHistoryId: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: {
      model: 'paymenthistories',
      key: 'Id'
    }
  },
  RegistrationNumber: {
    type: DataTypes.STRING(50),
    allowNull: false
  },
  Make: {
    type: DataTypes.STRING(100),
    allowNull: true
  },
  Model: {
    type: DataTypes.STRING(100),
    allowNull: true
  },
  Year: {
    type: DataTypes.STRING(10),
    allowNull: true
  },
  Trim: {
    type: DataTypes.STRING(100),
    allowNull: true
  },
  KmsDriven: {
    type: DataTypes.STRING(50),
    allowNull: true
  },
  City: {
    type: DataTypes.STRING(100),
    allowNull: true
  },
  NoOfOwners: {
    type: DataTypes.STRING(10),
    allowNull: true
  },
  Version: {
    type: DataTypes.STRING(100),
    allowNull: true
  },
  TransactionType: {
    type: DataTypes.STRING(50),
    allowNull: true
  },
  CustomerType: {
    type: DataTypes.STRING(50),
    allowNull: true
  },
  CreatedAt: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW
  },
  ModifiedAt: {
    type: DataTypes.DATE,
    allowNull: true
  }
}, {
  tableName: 'vehicledetailrequests',
  timestamps: false
});

// Define association
VehicleDetailRequest.associate = (models) => {
  VehicleDetailRequest.belongsTo(models.PaymentHistory, {
    foreignKey: 'PaymentHistoryId',
    as: 'PaymentHistory'
  });
};

module.exports = VehicleDetailRequest;
