const PaymentHistory = require('../models/payment-history.model');
const Result = require('../utils/result');
const logger = require('../config/logger');
const { Op } = require('sequelize');
const { sequelize } = require('../config/database');

class DashboardService {
  /**
   * Get total monthly earning (admin only)
   */
  async getTotalMonthlyEarningAsync() {
    try {
      const currentMonth = new Date();
      currentMonth.setDate(1);
      currentMonth.setHours(0, 0, 0, 0);

      const nextMonth = new Date(currentMonth);
      nextMonth.setMonth(nextMonth.getMonth() + 1);

      const result = await PaymentHistory.findOne({
        attributes: [
          [sequelize.fn('SUM', sequelize.col('Amount')), 'totalEarning'],
          [sequelize.fn('COUNT', sequelize.col('Id')), 'totalTransactions']
        ],
        where: {
          CreatedAt: {
            [Op.gte]: currentMonth,
            [Op.lt]: nextMonth
          },
          Status: 'Success'
        },
        raw: true
      });

      return Result.success({
        totalEarning: parseFloat(result.totalEarning || 0),
        totalTransactions: parseInt(result.totalTransactions || 0),
        month: currentMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
      });
    } catch (error) {
      logger.error('Get monthly earning error:', error);
      return Result.failure(error.message || 'Failed to get monthly earning');
    }
  }

  /**
   * Get revenue report by filter (daily, weekly, monthly, yearly)
   */
  async getRevenueReportAsync(filter) {
    try {
      let startDate = new Date();
      const endDate = new Date();

      switch (filter.toLowerCase()) {
        case 'daily':
          startDate.setHours(0, 0, 0, 0);
          break;
        case 'weekly':
          startDate.setDate(startDate.getDate() - 7);
          break;
        case 'monthly':
          startDate.setMonth(startDate.getMonth() - 1);
          break;
        case 'yearly':
          startDate.setFullYear(startDate.getFullYear() - 1);
          break;
        default:
          startDate.setMonth(startDate.getMonth() - 1); // Default to monthly
      }

      const payments = await PaymentHistory.findAll({
        where: {
          CreatedAt: {
            [Op.gte]: startDate,
            [Op.lte]: endDate
          },
          Status: 'Success'
        },
        order: [['CreatedAt', 'DESC']]
      });

      const totalRevenue = payments.reduce((sum, payment) => sum + parseFloat(payment.Amount), 0);

      return Result.success({
        filter: filter,
        startDate: startDate,
        endDate: endDate,
        totalRevenue: totalRevenue,
        totalTransactions: payments.length,
        payments: payments
      });
    } catch (error) {
      logger.error('Get revenue report error:', error);
      return Result.failure(error.message || 'Failed to get revenue report');
    }
  }
}

module.exports = new DashboardService();
