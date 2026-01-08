const CustomVehicleEntry = require('../models/custom-vehicle-entry.model');
const logger = require('../config/logger');
const Result = require('../utils/result');

class CustomVehicleEntryService {
  /**
   * Create a new custom vehicle entry
   * @param {Object} data - Custom vehicle data
   * @returns {Promise<Result>}
   */
  async createCustomEntry(data) {
    try {
      const {
        userId,
        vehicleDetailId,
        customMake,
        customModel,
        customVersion,
        exShowroomPrice,
        kmsDriven
      } = data;

      logger.info('Creating custom vehicle entry:', {
        userId,
        customMake,
        customModel,
        customVersion
      });

      // Create custom vehicle entry
      const customEntry = await CustomVehicleEntry.create({
        user_id: userId,
        vehicle_detail_id: vehicleDetailId || null,
        custom_make: customMake,
        custom_model: customModel,
        custom_version: customVersion,
        ex_showroom_price: exShowroomPrice,
        kms_driven: kmsDriven || null,
        status: 'pending'
      });

      logger.info('Custom vehicle entry created successfully:', customEntry.id);

      return Result.success({
        id: customEntry.id,
        status: customEntry.status,
        message: 'Custom vehicle entry saved successfully. It will be verified and added to our database soon.'
      });
    } catch (error) {
      logger.error('Error creating custom vehicle entry:', error);
      return Result.failure('Failed to save custom vehicle entry. Please try again.');
    }
  }

  /**
   * Get custom vehicle entries by user ID
   * @param {number} userId - User ID
   * @returns {Promise<Result>}
   */
  async getEntriesByUser(userId) {
    try {
      const entries = await CustomVehicleEntry.findAll({
        where: { user_id: userId },
        order: [['created_at', 'DESC']]
      });

      return Result.success(entries);
    } catch (error) {
      logger.error('Error fetching custom vehicle entries:', error);
      return Result.failure('Failed to fetch custom vehicle entries.');
    }
  }

  /**
   * Get custom vehicle entry by ID
   * @param {number} entryId - Entry ID
   * @returns {Promise<Result>}
   */
  async getEntryById(entryId) {
    try {
      const entry = await CustomVehicleEntry.findByPk(entryId);

      if (!entry) {
        return Result.failure('Custom vehicle entry not found.');
      }

      return Result.success(entry);
    } catch (error) {
      logger.error('Error fetching custom vehicle entry:', error);
      return Result.failure('Failed to fetch custom vehicle entry.');
    }
  }
}

module.exports = new CustomVehicleEntryService();
