const PaymentHistory = require('../models/payment-history.model');
const Result = require('../utils/result');
const logger = require('../config/logger');
const { Op } = require('sequelize');
const { sequelize } = require('../config/database');

class DashboardService {
  /**
   * Get current month earnings
   * Matches .NET: GetCurrentMonthEarningsAsync
   */
  async getCurrentMonthEarningsAsync() {
    const currentMonth = new Date().getMonth() + 1; // 1-12
    const currentYear = new Date().getFullYear();

    const result = await PaymentHistory.sum('Amount', {
      where: {
        [Op.and]: [
          sequelize.where(sequelize.fn('MONTH', sequelize.col('PaymentDate')), currentMonth),
          sequelize.where(sequelize.fn('YEAR', sequelize.col('PaymentDate')), currentYear),
          { Status: 1 } // Successful
        ]
      }
    });

    return result || 0;
  }

  /**
   * Get previous month earnings
   * Matches .NET: GetPreviousMonthEarningsAsync
   */
  async getPreviousMonthEarningsAsync() {
    const currentMonth = new Date().getMonth() + 1;
    const currentYear = new Date().getFullYear();
    const previousMonth = currentMonth === 1 ? 12 : currentMonth - 1;
    const previousYear = currentMonth === 1 ? currentYear - 1 : currentYear;

    const result = await PaymentHistory.sum('Amount', {
      where: {
        [Op.and]: [
          sequelize.where(sequelize.fn('MONTH', sequelize.col('PaymentDate')), previousMonth),
          sequelize.where(sequelize.fn('YEAR', sequelize.col('PaymentDate')), previousYear),
          { Status: 1 } // Successful
        ]
      }
    });

    return result || 0;
  }

  /**
   * Get total monthly earning (admin only)
   * Returns MonthlyRevenueDto { currentMonthRevenue, monthlyRelativeRevenue }
   * Matches .NET API: GetMonthlyRevenue
   */
  async getTotalMonthlyEarningAsync() {
    try {
      const currentMonthEarnings = await this.getCurrentMonthEarningsAsync();
      const prevMonthEarnings = await this.getPreviousMonthEarningsAsync();

      let monthlyRelativeRevenue;

      // If previous month revenue is 0, assign current month revenue to monthly relative revenue
      if (prevMonthEarnings === 0) {
        monthlyRelativeRevenue = currentMonthEarnings;
      } else {
        monthlyRelativeRevenue = Math.round(((currentMonthEarnings - prevMonthEarnings) / prevMonthEarnings) * 100 * 100) / 100; // Round to 2 decimal places
      }

      // Handle NaN
      if (isNaN(monthlyRelativeRevenue)) {
        monthlyRelativeRevenue = 0;
      }

      return Result.success({
        currentMonthRevenue: currentMonthEarnings,
        monthlyRelativeRevenue: monthlyRelativeRevenue
      });
    } catch (error) {
      logger.error('Get monthly earning error:', error);
      return Result.failure(error.message || 'Failed to get monthly earning');
    }
  }

  /**
   * Get monthly revenue report for given year
   * Returns RevenueHistoryDto[] { month, year, revenue }
   * Matches .NET: GetMonthlyRevenueReportAsync
   */
  async getMonthlyRevenueReportAsync(year) {
    const monthlyPayments = await PaymentHistory.findAll({
      attributes: [
        [sequelize.fn('MONTH', sequelize.col('PaymentDate')), 'month'],
        [sequelize.literal(year.toString()), 'year'],
        [sequelize.fn('SUM', sequelize.col('Amount')), 'revenue']
      ],
      where: {
        [Op.and]: [
          sequelize.where(sequelize.fn('YEAR', sequelize.col('PaymentDate')), year),
          { Status: 1 } // Successful
        ]
      },
      group: [sequelize.fn('MONTH', sequelize.col('PaymentDate'))],
      order: [[sequelize.fn('MONTH', sequelize.col('PaymentDate')), 'ASC']],
      raw: true
    });

    return monthlyPayments.map(item => ({
      month: item.month,
      year: item.year,
      revenue: parseFloat(item.revenue)
    }));
  }

  /**
   * Get yearly revenue report
   * Returns RevenueHistoryDto[] { year, revenue }
   * Matches .NET: GetYearlyRevenueReportAsync
   */
  async getYearlyRevenueReportAsync() {
    const yearlyPayments = await PaymentHistory.findAll({
      attributes: [
        [sequelize.fn('YEAR', sequelize.col('PaymentDate')), 'year'],
        [sequelize.fn('SUM', sequelize.col('Amount')), 'revenue']
      ],
      where: {
        Status: 1 // Successful
      },
      group: [sequelize.fn('YEAR', sequelize.col('PaymentDate'))],
      order: [[sequelize.fn('YEAR', sequelize.col('PaymentDate')), 'ASC']],
      raw: true
    });

    return yearlyPayments.map(item => ({
      month: null,
      year: item.year,
      revenue: parseFloat(item.revenue)
    }));
  }

  /**
   * Get revenue report by filter (admin only)
   * Matches .NET API: GetRevenueReportAsync(TimePeriod filter)
   * TimePeriod enum: Month=0, Year=1
   */
  async getRevenueReportAsync(filter) {
    try {
      let value;

      // Support both numeric (0, 1) and string ("Month", "Year", "month", "year")
      const normalizedFilter = typeof filter === 'string' ? filter.toLowerCase() : filter;

      if (normalizedFilter === 0 || normalizedFilter === 'month') {
        // Month filter - get monthly report for current year
        value = await this.getMonthlyRevenueReportAsync(new Date().getFullYear());
      } else if (normalizedFilter === 1 || normalizedFilter === 'year') {
        // Year filter - get yearly report
        value = await this.getYearlyRevenueReportAsync();
      } else {
        return Result.failure('Invalid revenue filter value.');
      }

      return Result.success(value);
    } catch (error) {
      logger.error('Get revenue report error:', error);
      return Result.failure(error.message || 'Failed to get revenue report');
    }
  }
}

module.exports = new DashboardService();
