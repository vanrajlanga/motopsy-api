const LostVehicle = require('../models/lost-vehicle.model');
const Result = require('../utils/result');
const logger = require('../config/logger');

class LostCarService {
  /**
   * Check if vehicle is stolen
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
          RegistrationNumber: cleanRegNo
        }
      });

      const isStolen = !!stolenVehicle;

      logger.info(`Stolen status check for ${registrationNumber}: ${isStolen}`);

      return Result.success({
        registrationNumber: registrationNumber,
        isStolen: isStolen,
        message: isStolen
          ? 'WARNING: This vehicle is reported as stolen/lost'
          : 'Vehicle not found in stolen vehicle database'
      });
    } catch (error) {
      logger.error('Check stolen status error:', error);
      return Result.failure(error.message || 'Failed to check stolen status');
    }
  }
}

module.exports = new LostCarService();
