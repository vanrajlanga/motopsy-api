const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const ServiceOrder = sequelize.define('service_orders', {
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
    allowNull: false
  },
  service_plan_id: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  service_plan_option_id: {
    type: DataTypes.INTEGER,
    allowNull: true,
    comment: 'NULL when using default pricing'
  },
  service_package_name: {
    type: DataTypes.STRING(100),
    allowNull: true,
    comment: 'Name of the service package selected (e.g., Safety Pack, Inspection Only)'
  },
  amount: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
    defaultValue: 0.00,
    comment: 'Amount paid at time of order'
  },
  // Customer details
  name: {
    type: DataTypes.STRING(255),
    allowNull: false
  },
  mobile_number: {
    type: DataTypes.STRING(20),
    allowNull: false
  },
  email: {
    type: DataTypes.STRING(255),
    allowNull: false
  },
  // Vehicle details
  car_company: {
    type: DataTypes.STRING(100)
  },
  car_model: {
    type: DataTypes.STRING(100)
  },
  chassis_number: {
    type: DataTypes.STRING(100)
  },
  registration_number: {
    type: DataTypes.STRING(20)
  },
  car_model_year: {
    type: DataTypes.INTEGER
  },
  // Address
  state: {
    type: DataTypes.STRING(100),
    allowNull: false
  },
  city: {
    type: DataTypes.STRING(100)
  },
  address: {
    type: DataTypes.TEXT,
    allowNull: false
  },
  postcode: {
    type: DataTypes.STRING(20),
    allowNull: false
  },
  order_notes: {
    type: DataTypes.TEXT
  },
  // Appointment details - SCHEDULE APPOINTMENT DISABLED
  // appointment_date: {
  //   type: DataTypes.DATEONLY,
  //   allowNull: true,
  //   field: 'appointment_date'
  // },
  // appointment_time_slot: {
  //   type: DataTypes.STRING(20),
  //   allowNull: true,
  //   field: 'appointment_time_slot'
  // },
  // Status
  status: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0,
    comment: '0=Pending, 1=InProgress, 2=Completed, 3=Cancelled'
  },
  created_at: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW
  },
  modified_at: {
    type: DataTypes.DATE
  }
}, {
  tableName: 'service_orders',
  timestamps: false
});

module.exports = ServiceOrder;
