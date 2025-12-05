const VehicleSpecification = require('../models/vehicle-specification.model');
const Result = require('../utils/result');
const logger = require('../config/logger');
const { Op } = require('sequelize');

class VehicleSpecificationService {
  /**
   * Get vehicle specification by model
   */
  async getByModelAsync(model) {
    try {
      if (!model) {
        return Result.failure('Model is required');
      }

      const specifications = await VehicleSpecification.findAll({
        where: {
          naming_model: {
            [Op.like]: `%${model}%`
          }
        },
        limit: 100
      });

      logger.info(`Found ${specifications.length} specifications for model: ${model}`);
      return Result.success(specifications);
    } catch (error) {
      logger.error('Get vehicle specification error:', error);
      return Result.failure(error.message || 'Failed to get vehicle specification');
    }
  }

  /**
   * Get vehicles from specifications
   */
  async getVehiclesFromSpecsAsync(request) {
    try {
      const { make, model, fuelType, minPrice, maxPrice } = request;

      const where = {};

      if (make) {
        where.naming_make = {
          [Op.like]: `%${make}%`
        };
      }

      if (model) {
        where.naming_model = {
          [Op.like]: `%${model}%`
        };
      }

      if (fuelType) {
        where.keydata_key_fueltype = {
          [Op.like]: `%${fuelType}%`
        };
      }

      const specifications = await VehicleSpecification.findAll({
        where,
        limit: 100,
        order: [['naming_make', 'ASC'], ['naming_model', 'ASC']]
      });

      logger.info(`Found ${specifications.length} vehicles matching criteria`);
      return Result.success(specifications);
    } catch (error) {
      logger.error('Get vehicles from specs error:', error);
      return Result.failure(error.message || 'Failed to get vehicles');
    }
  }
}

module.exports = new VehicleSpecificationService();
