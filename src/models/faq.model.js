const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Faq = sequelize.define('faqs', {
  Id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  Question: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  Answer: {
    type: DataTypes.TEXT,
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
  tableName: 'faqs',
  timestamps: false
});

module.exports = Faq;
