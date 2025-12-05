const BaseController = require('./base.controller');
const dashboardService = require('../services/dashboard.service');

class DashboardController extends BaseController {
  /**
   * GET /api/dashboard/total-monthly-earning (admin only)
   */
  async getTotalMonthlyEarning(req, res, next) {
    try {
      const result = await dashboardService.getTotalMonthlyEarningAsync();
      return this.fromResult(result, res);
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/dashboard/revenue-report/:filter (admin only)
   */
  async getRevenueReport(req, res, next) {
    try {
      const { filter } = req.params;
      const result = await dashboardService.getRevenueReportAsync(filter);
      return this.fromResult(result, res);
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new DashboardController();
