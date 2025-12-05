const BaseController = require('./base.controller');
const faqService = require('../services/faq.service');

class FaqController extends BaseController {
  /**
   * GET /api/faq - Get all FAQs
   */
  async getAll(req, res, next) {
    try {
      const result = await faqService.getAllAsync();
      return this.fromResult(result, res);
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/faq - Create FAQ (admin only)
   */
  async create(req, res, next) {
    try {
      const result = await faqService.createAsync(req.body);
      return this.fromResult(result, res);
    } catch (error) {
      next(error);
    }
  }

  /**
   * PUT /api/faq - Update FAQ (admin only)
   */
  async update(req, res, next) {
    try {
      const result = await faqService.updateAsync(req.body);
      return this.fromResult(result, res);
    } catch (error) {
      next(error);
    }
  }

  /**
   * DELETE /api/faq?faqId={id} - Delete FAQ (admin only)
   * Matches .NET API: Delete(int faqId)
   */
  async delete(req, res, next) {
    try {
      const { faqId } = req.query;
      const result = await faqService.deleteAsync(parseInt(faqId));
      return this.fromResult(result, res);
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new FaqController();
