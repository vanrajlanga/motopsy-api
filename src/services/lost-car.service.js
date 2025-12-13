const LostVehicle = require('../models/lost-vehicle.model');
const Result = require('../utils/result');
const logger = require('../config/logger');

class LostCarService {
  /**
   * Check if vehicle is stolen
   * Matches .NET: Returns Result<bool> - just a boolean value
   */
  async checkStolenStatusAsync(registrationNumber) {
    try {
      if (!registrationNumber) {
        return Result.failure('Registration number is required');
      }

      // Clean registration number (remove spaces, convert to uppercase)
      const cleanRegNo = registrationNumber.replace(/\s/g, '').toUpperCase();

      const stolenVehicle = await LostVehicle.findOne({
        where: {
          registration_number: cleanRegNo
        }
      });

      const isStolen = !!stolenVehicle;

      logger.info(`Stolen status check for ${registrationNumber}: ${isStolen}`);

      // .NET returns just boolean wrapped in Result
      return Result.success(isStolen);
    } catch (error) {
      logger.error('Check stolen status error:', error);
      return Result.failure(error.message || 'Failed to check stolen status');
    }
  }
}

module.exports = new LostCarService();
