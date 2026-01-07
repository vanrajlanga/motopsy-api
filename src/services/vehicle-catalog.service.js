const VehicleSpecification = require('../models/vehicle-specification.model');
const droomService = require('./droom.service');
const Result = require('../utils/result');
const logger = require('../config/logger');
const { Op } = require('sequelize');

/**
 * Vehicle Catalog Service
 * Fetches vehicle makes/models/versions from database first, with Droom API as fallback
 */
class VehicleCatalogService {
  /**
   * Get vehicle catalog (makes, models, versions)
   * Primary: Database (vehicle_specifications table)
   * Fallback: Droom API
   */
  async getCatalogAsync(request) {
    try {
      const { make, model } = request;

      // Case 1: No params - fetch all makes from DB
      if (!make && !model) {
        return await this.getMakesFromDB();
      }

      // Case 2: Make provided - fetch models for that make from DB
      if (make && !model) {
        return await this.getModelsFromDB(make);
      }

      // Case 3: Make + Model provided - fetch versions from DB
      if (make && model) {
        return await this.getVersionsFromDB(make, model);
      }

      return Result.failure('Invalid request parameters');
    } catch (error) {
      logger.error('Get catalog error:', error);
      return Result.failure(error.message || 'Failed to get catalog');
    }
  }

  /**
   * Get all unique makes from database
   * Fallback to Droom API if DB has no data
   */
  async getMakesFromDB() {
    try {
      const makes = await VehicleSpecification.findAll({
        attributes: ['naming_make'],
        where: {
          naming_make: {
            [Op.ne]: null,
            [Op.ne]: ''
          }
        },
        group: ['naming_make'],
        order: [['naming_make', 'ASC']],
        raw: true
      });

      if (makes && makes.length > 0) {
        const makeList = makes.map(m => m.naming_make).filter(Boolean);
        logger.info(`Found ${makeList.length} makes in database`);
        return Result.success({ code: 'success', data: makeList });
      }

      // Fallback to Droom API
      logger.info('No makes found in DB, falling back to Droom API');
      return await droomService.getEnterpriseCatalogAsync({ category: 'car' });
    } catch (error) {
      logger.error('Get makes from DB error:', error);
      // Fallback to Droom on error
      return await droomService.getEnterpriseCatalogAsync({ category: 'car' });
    }
  }

  /**
   * Get all unique models for a given make from database
   * Fallback to Droom API if DB has no data
   */
  async getModelsFromDB(make) {
    try {
      const models = await VehicleSpecification.findAll({
        attributes: ['naming_model'],
        where: {
          naming_make: {
            [Op.like]: `%${make}%`
          },
          naming_model: {
            [Op.ne]: null,
            [Op.ne]: ''
          }
        },
        group: ['naming_model'],
        order: [['naming_model', 'ASC']],
        raw: true
      });

      if (models && models.length > 0) {
        const modelList = models.map(m => m.naming_model).filter(Boolean);
        logger.info(`Found ${modelList.length} models for make ${make} in database`);
        return Result.success({ code: 'success', data: modelList });
      }

      // Fallback to Droom API
      logger.info(`No models found in DB for make ${make}, falling back to Droom API`);
      return await droomService.getEnterpriseCatalogAsync({ make });
    } catch (error) {
      logger.error('Get models from DB error:', error);
      // Fallback to Droom on error
      return await droomService.getEnterpriseCatalogAsync({ make });
    }
  }

  /**
   * Get all unique versions for a given make and model from database
   * Fallback to Droom API if DB has no data
   */
  async getVersionsFromDB(make, model) {
    try {
      const versions = await VehicleSpecification.findAll({
        attributes: ['naming_version'],
        where: {
          naming_make: {
            [Op.like]: `%${make}%`
          },
          naming_model: {
            [Op.like]: `%${model}%`
          },
          naming_version: {
            [Op.ne]: null,
            [Op.ne]: ''
          }
        },
        group: ['naming_version'],
        order: [['naming_version', 'ASC']],
        raw: true
      });

      if (versions && versions.length > 0) {
        const versionList = versions.map(v => v.naming_version).filter(Boolean);
        logger.info(`Found ${versionList.length} versions for ${make} ${model} in database`);
        return Result.success({ code: 'success', data: versionList });
      }

      // Fallback to Droom API
      logger.info(`No versions found in DB for ${make} ${model}, falling back to Droom API`);
      return await droomService.getEnterpriseCatalogAsync({ make, model });
    } catch (error) {
      logger.error('Get versions from DB error:', error);
      // Fallback to Droom on error
      return await droomService.getEnterpriseCatalogAsync({ make, model });
    }
  }
}

module.exports = new VehicleCatalogService();
