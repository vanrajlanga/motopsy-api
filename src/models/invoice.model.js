const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Invoice = sequelize.define('invoices', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  invoice_number: {
    type: DataTypes.STRING(50),
    allowNull: false,
    unique: true,
    comment: 'Unique invoice number e.g., INV-2025-0001'
  },
  payment_history_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'payment_histories',
      key: 'id'
    }
  },
  user_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'users',
      key: 'id'
    }
  },
  customer_name: {
    type: DataTypes.STRING(255),
    allowNull: false
  },
  customer_email: {
    type: DataTypes.STRING(255),
    allowNull: false
  },
  customer_gstin: {
    type: DataTypes.STRING(20),
    allowNull: true,
    comment: 'Customer GSTIN if applicable'
  },
  customer_phone: {
    type: DataTypes.STRING(20),
    allowNull: true
  },
  registration_number: {
    type: DataTypes.STRING(20),
    allowNull: false,
    comment: 'Vehicle registration number'
  },
  description: {
    type: DataTypes.STRING(255),
    allowNull: false,
    defaultValue: 'Vehicle History Report'
  },
  quantity: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 1
  },
  unit_price: {
    type: DataTypes.DECIMAL(18, 2),
    allowNull: false,
    comment: 'Base price before GST'
  },
  subtotal: {
    type: DataTypes.DECIMAL(18, 2),
    allowNull: false,
    comment: 'Subtotal before GST (unit_price * quantity)'
  },
  gst_rate: {
    type: DataTypes.DECIMAL(5, 2),
    allowNull: false,
    defaultValue: 18.00,
    comment: 'GST rate percentage'
  },
  gst_amount: {
    type: DataTypes.DECIMAL(18, 2),
    allowNull: false,
    comment: 'GST amount'
  },
  total_amount: {
    type: DataTypes.DECIMAL(18, 2),
    allowNull: false,
    comment: 'Total amount including GST'
  },
  file_path: {
    type: DataTypes.STRING(500),
    allowNull: false,
    comment: 'Path to invoice PDF file'
  },
  file_name: {
    type: DataTypes.STRING(255),
    allowNull: false,
    comment: 'Invoice PDF file name'
  },
  created_at: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW
  }
}, {
  tableName: 'invoices',
  timestamps: false
});

// Define associations
Invoice.associate = (models) => {
  Invoice.belongsTo(models.PaymentHistory, {
    foreignKey: 'payment_history_id',
    as: 'PaymentHistory'
  });
  Invoice.belongsTo(models.User, {
    foreignKey: 'user_id',
    as: 'User'
  });
};

module.exports = Invoice;
