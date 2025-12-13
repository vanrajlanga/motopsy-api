const Faq = require('../models/faq.model');
const Result = require('../utils/result');
const logger = require('../config/logger');

class FaqService {
  /**
   * Transform FAQ to match .NET API FaqDto format (camelCase)
   */
  transformFaq(faq) {
    const data = faq.toJSON ? faq.toJSON() : faq;
    return {
      id: data.id,
      question: data.question,
      answer: data.answer,
      order: data.order
    };
  }

  /**
   * Get all FAQs
   * Returns List<FaqDto> ordered by CreatedAt
   */
  async getAllAsync() {
    try {
      const faqs = await Faq.findAll({
        order: [['created_at', 'ASC']]
      });

      // Transform to camelCase
      const faqDtos = faqs.map(faq => this.transformFaq(faq));
      return Result.success(faqDtos);
    } catch (error) {
      logger.error('Get FAQs error:', error);
      return Result.failure(error.message || 'Failed to get FAQs');
    }
  }

  /**
   * Create FAQs (accepts array)
   * Matches .NET API: AddFaqAsync(List<FaqDto> faqs)
   */
  async createAsync(faqsArray) {
    try {
      // Support both single object and array for flexibility
      const faqs = Array.isArray(faqsArray) ? faqsArray : [faqsArray];

      // Create all FAQs
      const createdFaqs = await Promise.all(faqs.map(async (faqDto) => {
        // Support both camelCase (API) and PascalCase (.NET) input
        const question = faqDto.question || faqDto.Question;
        const answer = faqDto.answer || faqDto.Answer;
        const order = faqDto.order !== undefined ? faqDto.order : (faqDto.Order !== undefined ? faqDto.Order : 0);

        const faq = await Faq.create({
          question: question,
          answer: answer,
          order: order,
          created_at: new Date()
        });

        return faq;
      }));

      logger.info(`Created ${createdFaqs.length} FAQ(s)`);

      // Transform to camelCase and return array like .NET API
      const faqDtos = createdFaqs.map(faq => this.transformFaq(faq));
      return Result.success(faqDtos);
    } catch (error) {
      logger.error('Create FAQ error:', error);
      return Result.failure(error.message || 'Failed to create FAQ');
    }
  }

  /**
   * Update FAQ
   * Matches .NET API: EditFaqByIdAsync(FaqDto faqDto)
   */
  async updateAsync(request) {
    try {
      // Support both camelCase and PascalCase input
      const id = request.id || request.Id;
      const question = request.question || request.Question;
      const answer = request.answer || request.Answer;
      const order = request.order !== undefined ? request.order : (request.Order !== undefined ? request.Order : 0);

      const faq = await Faq.findByPk(id);
      if (!faq) {
        return Result.failure('Faq not found');
      }

      faq.question = question;
      faq.answer = answer;
      faq.order = order;
      faq.modified_at = new Date();
      await faq.save();

      logger.info(`FAQ updated: ${id}`);

      // Return transformed DTO like .NET API
      return Result.success(this.transformFaq(faq));
    } catch (error) {
      logger.error('Update FAQ error:', error);
      return Result.failure(error.message || 'Failed to update FAQ');
    }
  }

  /**
   * Delete FAQ by ID
   * Matches .NET API: DeleteFaqByIdAsync(int faqId)
   * Returns the deleted ID on success
   */
  async deleteAsync(faqId) {
    try {
      const faq = await Faq.findByPk(faqId);
      if (!faq) {
        return Result.failure('Faq not found');
      }

      await faq.destroy();

      logger.info(`FAQ deleted: ${faqId}`);

      // Return the ID like .NET API does
      return Result.success(faqId);
    } catch (error) {
      logger.error('Delete FAQ error:', error);
      return Result.failure(error.message || 'Failed to delete FAQ');
    }
  }
}

module.exports = new FaqService();
