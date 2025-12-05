const Faq = require('../models/faq.model');
const Result = require('../utils/result');
const logger = require('../config/logger');

class FaqService {
  /**
   * Get all FAQs
   */
  async getAllAsync() {
    try {
      const faqs = await Faq.findAll({
        order: [['Id', 'ASC']]
      });

      return Result.success(faqs);
    } catch (error) {
      logger.error('Get FAQs error:', error);
      return Result.failure(error.message || 'Failed to get FAQs');
    }
  }

  /**
   * Create FAQ
   */
  async createAsync(request) {
    try {
      const { question, answer } = request;

      const faq = await Faq.create({
        Question: question,
        Answer: answer,
        CreatedAt: new Date()
      });

      logger.info(`FAQ created: ${faq.Id}`);
      return Result.success(faq);
    } catch (error) {
      logger.error('Create FAQ error:', error);
      return Result.failure(error.message || 'Failed to create FAQ');
    }
  }

  /**
   * Update FAQ
   */
  async updateAsync(request) {
    try {
      const { id, question, answer } = request;

      const faq = await Faq.findByPk(id);
      if (!faq) {
        return Result.failure('FAQ not found');
      }

      faq.Question = question;
      faq.Answer = answer;
      faq.ModifiedAt = new Date();
      await faq.save();

      logger.info(`FAQ updated: ${id}`);
      return Result.success(faq);
    } catch (error) {
      logger.error('Update FAQ error:', error);
      return Result.failure(error.message || 'Failed to update FAQ');
    }
  }

  /**
   * Delete FAQ
   */
  async deleteAsync(id) {
    try {
      const faq = await Faq.findByPk(id);
      if (!faq) {
        return Result.failure('FAQ not found');
      }

      await faq.destroy();

      logger.info(`FAQ deleted: ${id}`);
      return Result.success({ message: 'FAQ deleted successfully' });
    } catch (error) {
      logger.error('Delete FAQ error:', error);
      return Result.failure(error.message || 'Failed to delete FAQ');
    }
  }
}

module.exports = new FaqService();
