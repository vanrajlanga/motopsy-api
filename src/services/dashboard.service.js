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

    const result = await PaymentHistory.sum('amount', {
      where: {
        [Op.and]: [
          sequelize.where(sequelize.fn('MONTH', sequelize.col('payment_date')), currentMonth),
          sequelize.where(sequelize.fn('YEAR', sequelize.col('payment_date')), currentYear),
          { status: 1 } // Successful
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

    const result = await PaymentHistory.sum('amount', {
      where: {
        [Op.and]: [
          sequelize.where(sequelize.fn('MONTH', sequelize.col('payment_date')), previousMonth),
          sequelize.where(sequelize.fn('YEAR', sequelize.col('payment_date')), previousYear),
          { status: 1 } // Successful
        ]
      }
    });

    return result || 0;
  }

  /**
   * Get earnings for a specific date range
   */
  async getEarningsForDateRangeAsync(startDate, endDate) {
    const whereClause = {
      status: 1 // Successful
    };

    if (startDate && endDate) {
      whereClause.payment_date = {
        [Op.between]: [new Date(startDate), new Date(endDate + ' 23:59:59')]
      };
    }

    const result = await PaymentHistory.sum('amount', { where: whereClause });
    return result || 0;
  }

  /**
   * Get total monthly earning (admin only)
   * Returns MonthlyRevenueDto { currentMonthRevenue, monthlyRelativeRevenue }
   * Matches .NET API: GetMonthlyRevenue
   * Supports optional date range filtering
   */
  async getTotalMonthlyEarningAsync(startDate = null, endDate = null) {
    try {
      let currentEarnings;
      let prevEarnings;

      if (startDate && endDate) {
        // If date range is provided, calculate earnings for that range
        currentEarnings = await this.getEarningsForDateRangeAsync(startDate, endDate);

        // Calculate previous period earnings (same duration before start date)
        const start = new Date(startDate);
        const end = new Date(endDate);
        const duration = end.getTime() - start.getTime();
        const prevEndDate = new Date(start.getTime() - 1);
        const prevStartDate = new Date(prevEndDate.getTime() - duration);

        prevEarnings = await this.getEarningsForDateRangeAsync(
          prevStartDate.toISOString().split('T')[0],
          prevEndDate.toISOString().split('T')[0]
        );
      } else {
        // Default behavior - current month vs previous month
        currentEarnings = await this.getCurrentMonthEarningsAsync();
        prevEarnings = await this.getPreviousMonthEarningsAsync();
      }

      let monthlyRelativeRevenue;

      // If previous period revenue is 0, assign current period revenue to monthly relative revenue
      if (prevEarnings === 0) {
        monthlyRelativeRevenue = currentEarnings > 0 ? 100 : 0;
      } else {
        monthlyRelativeRevenue = Math.round(((currentEarnings - prevEarnings) / prevEarnings) * 100 * 100) / 100; // Round to 2 decimal places
      }

      // Handle NaN
      if (isNaN(monthlyRelativeRevenue)) {
        monthlyRelativeRevenue = 0;
      }

      return Result.success({
        currentMonthRevenue: currentEarnings,
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
        [sequelize.fn('MONTH', sequelize.col('payment_date')), 'month'],
        [sequelize.literal(year.toString()), 'year'],
        [sequelize.fn('SUM', sequelize.col('amount')), 'revenue']
      ],
      where: {
        [Op.and]: [
          sequelize.where(sequelize.fn('YEAR', sequelize.col('payment_date')), year),
          { status: 1 } // Successful
        ]
      },
      group: [sequelize.fn('MONTH', sequelize.col('payment_date'))],
      order: [[sequelize.fn('MONTH', sequelize.col('payment_date')), 'ASC']],
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
        [sequelize.fn('YEAR', sequelize.col('payment_date')), 'year'],
        [sequelize.fn('SUM', sequelize.col('amount')), 'revenue']
      ],
      where: {
        status: 1 // Successful
      },
      group: [sequelize.fn('YEAR', sequelize.col('payment_date'))],
      order: [[sequelize.fn('YEAR', sequelize.col('payment_date')), 'ASC']],
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

      // Support both numeric (0, 1) and string ("0", "1", "Month", "Year", "month", "year")
      const normalizedFilter = typeof filter === 'string' ? filter.toLowerCase() : filter;

      if (normalizedFilter === 0 || normalizedFilter === '0' || normalizedFilter === 'month') {
        // Month filter - get monthly report for current year
        value = await this.getMonthlyRevenueReportAsync(new Date().getFullYear());
      } else if (normalizedFilter === 1 || normalizedFilter === '1' || normalizedFilter === 'year') {
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
