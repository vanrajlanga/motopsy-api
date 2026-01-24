const BaseController = require('./base.controller');
const serviceHistoryService = require('../services/service-history.service');

class ServiceHistoryController extends BaseController {
  /**
   * POST /api/service-history/search
   * Search for vehicle service history
   */
  async searchServiceHistory(req, res) {
    const { idNumber, maker } = req.body;

    if (!idNumber || !maker) {
      return res.status(400).json({ error: 'Registration number and maker are required' });
    }

    const validMakers = ['maruti', 'hyundai', 'mahindra'];
    if (!validMakers.includes(maker.toLowerCase())) {
      return res.status(400).json({ error: 'Invalid maker. Supported: Maruti, Hyundai, Mahindra' });
    }

    const userId = req.user?.userId || null;
    const result = await serviceHistoryService.getServiceHistoryAsync(idNumber, maker, userId);
    return this.fromResult(result, res);
  }

  /**
   * POST /api/service-history/list
   * Get paginated list of service history records
   */
  async getServiceHistoryList(req, res) {
    const { page = 1, pageSize = 20, search = '' } = req.body;
    const result = await serviceHistoryService.getServiceHistoryListAsync(page, pageSize, search);
    return this.fromResult(result, res);
  }

  /**
   * GET /api/service-history/:id
   * Get a specific service history record
   */
  async getServiceHistoryById(req, res) {
    const { id } = req.params;
    const result = await serviceHistoryService.getServiceHistoryByIdAsync(id);
    return this.fromResult(result, res);
  }

  /**
   * GET /api/service-history/makers
   * Get list of supported vehicle makers
   */
  async getSupportedMakers(req, res) {
    const makers = serviceHistoryService.getSupportedMakers();
    return res.json(makers);
  }
}

module.exports = new ServiceHistoryController();
