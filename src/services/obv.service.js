const Result = require('../utils/result');
const logger = require('../config/logger');
const droomService = require('./droom.service');
const VehicleDetail = require('../models/vehicle-detail.model');

class ObvService {
  async getEnterpriseCatalogAsync(request) {
    try {
      logger.info('Enterprise catalog requested');

      // Call Droom API to get enterprise catalog
      const catalogResult = await droomService.getEnterpriseCatalogAsync(request);

      if (!catalogResult.isSuccess) {
        return catalogResult;
      }

      return Result.success(catalogResult.value);
    } catch (error) {
      logger.error('Get enterprise catalog error:', error);
      return Result.failure(error.message || 'Failed to get enterprise catalog');
    }
  }

  async getEnterpriseUsedPriceRangeAsync(request, userEmail) {
    try {
      logger.info(`Used price range requested by user: ${userEmail}`);

      // Call Droom API to get used price range
      const priceRangeResult = await droomService.getEnterpriseUsedPriceRangeAsync(request, userEmail);

      if (!priceRangeResult.isSuccess) {
        return priceRangeResult;
      }

      return Result.success(priceRangeResult.value);
    } catch (error) {
      logger.error('Get used price range error:', error);
      return Result.failure(error.message || 'Failed to get used price range');
    }
  }

  async getByVehicleDetailIdAsync(vehicleDetailId, userEmail) {
    try {
      logger.info(`Get OBV for vehicle detail ID: ${vehicleDetailId} by user: ${userEmail}`);

      // Get vehicle details from database
      const vehicleDetail = await VehicleDetail.findByPk(vehicleDetailId);

      if (!vehicleDetail) {
        return Result.failure('Vehicle detail not found');
      }

      // Prepare vehicle data for Droom API
      const vehicleData = {
        make: vehicleDetail.Manufacturer,
        model: vehicleDetail.Model,
        variant: vehicleDetail.Variant,
        year: vehicleDetail.YearOfManufacture,
        fuelType: vehicleDetail.FuelType,
        registrationYear: new Date(vehicleDetail.RegistrationDate).getFullYear(),
        city: vehicleDetail.RegisteredCity || 'Delhi'
      };

      // Call Droom API to get OBV
      const obvResult = await droomService.getOBVByVehicleDetailIdAsync(vehicleDetailId, vehicleData);

      if (!obvResult.isSuccess) {
        return obvResult;
      }

      return Result.success(obvResult.value);
    } catch (error) {
      logger.error('Get OBV by vehicle detail ID error:', error);
      return Result.failure(error.message || 'Failed to get OBV');
    }
  }
}

module.exports = new ObvService();
