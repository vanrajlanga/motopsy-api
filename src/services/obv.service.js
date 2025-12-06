const Result = require('../utils/result');
const logger = require('../config/logger');
const droomService = require('./droom.service');
const VehicleDetail = require('../models/vehicle-detail.model');
const User = require('../models/user.model');
const StateMapping = require('../models/state-mapping.model');

class ObvService {
  /**
   * Make name mapping - same as vehicle-detail.service.js
   * Maps Surepass MakerDescription to Droom make name
   */
  extractMakeFromDescription(description) {
    if (!description) return null;

    const makeMap = {
      'KIA': 'Kia',
      'MARUTI': 'Maruti Suzuki',
      'HYUNDAI': 'Hyundai',
      'TATA': 'Tata',
      'MAHINDRA': 'Mahindra',
      'HONDA': 'Honda',
      'TOYOTA': 'Toyota',
      'FORD': 'Ford',
      'VOLKSWAGEN': 'Volkswagen',
      'SKODA': 'Skoda',
      'RENAULT': 'Renault',
      'NISSAN': 'Nissan',
      'MG': 'MG',
      'JEEP': 'Jeep',
      'MERCEDES': 'Mercedes-Benz',
      'BMW': 'BMW',
      'AUDI': 'Audi',
      'JAGUAR': 'Jaguar',
      'LAND ROVER': 'Land Rover',
      'PORSCHE': 'Porsche',
      'LEXUS': 'Lexus',
      'VOLVO': 'Volvo',
      'MINI': 'Mini',
      'BAJAJ': 'Bajaj',
      'HERO': 'Hero',
      'TVS': 'TVS',
      'ROYAL ENFIELD': 'Royal Enfield',
      'YAMAHA': 'Yamaha',
      'SUZUKI': 'Suzuki',
      'KAWASAKI': 'Kawasaki',
      'KTM': 'KTM',
      'HARLEY': 'Harley-Davidson',
      'DUCATI': 'Ducati',
      'TRIUMPH': 'Triumph',
      'BENELLI': 'Benelli',
      'APRILIA': 'Aprilia',
      'PIAGGIO': 'Piaggio',
      'VESPA': 'Vespa',
      'ATHER': 'Ather',
      'OLA': 'Ola Electric',
      'SIMPLE': 'Simple Energy',
      'CHEVROLET': 'Chevrolet',
      'FIAT': 'Fiat',
      'DATSUN': 'Datsun',
      'ISUZU': 'Isuzu',
      'FORCE': 'Force Motors',
      'EICHER': 'Eicher'
    };

    const upper = description.toUpperCase();
    for (const [key, value] of Object.entries(makeMap)) {
      if (upper.includes(key)) {
        return value;
      }
    }

    // Return first word capitalized if no match
    const firstWord = description.split(/\s+/)[0];
    return firstWord.charAt(0).toUpperCase() + firstWord.slice(1).toLowerCase();
  }

  /**
   * Extract model name from MakerModel
   * E.g., "SELTOS G1.5 6MT HTE" -> "Seltos"
   */
  extractModelFromDescription(description) {
    if (!description) return null;
    const firstWord = description.split(/\s+/)[0];
    return firstWord.charAt(0).toUpperCase() + firstWord.slice(1).toLowerCase();
  }

  /**
   * Extract year from ManufacturingDateFormatted or RegistrationDate
   */
  extractYear(vehicleDetail) {
    // Try ManufacturingDateFormatted first (e.g., "06/2021")
    if (vehicleDetail.ManufacturingDateFormatted) {
      const parts = vehicleDetail.ManufacturingDateFormatted.split('/');
      if (parts.length === 2) {
        return parts[1]; // Return year part
      }
    }
    // Fallback to RegistrationDate
    if (vehicleDetail.RegistrationDate) {
      try {
        return new Date(vehicleDetail.RegistrationDate).getFullYear().toString();
      } catch (e) {
        return null;
      }
    }
    return null;
  }

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

  /**
   * Get enterprise used price range - matches .NET ObvService.GetEnterpriseUsedPriceRangeAsync
   * Uses provided make/model or extracts from vehicleDetail if vehicleDetailId is provided
   */
  async getEnterpriseUsedPriceRangeAsync(request, userEmail) {
    try {
      logger.info(`Used price range requested by user: ${userEmail}`);

      let { make, model, year, trim, kmsDriven, city, noOfOwners, vehicleDetailId, transactionType, customerType } = request;

      // If vehicleDetailId provided but make/model missing, extract from vehicle detail
      if (vehicleDetailId && (!make || !model)) {
        const vehicleDetail = await VehicleDetail.findByPk(vehicleDetailId);
        if (vehicleDetail) {
          // Use provided values first, then extract from Surepass data
          if (!make) {
            make = this.extractMakeFromDescription(vehicleDetail.MakerDescription || vehicleDetail.Manufacturer);
          }
          if (!model) {
            model = this.extractModelFromDescription(vehicleDetail.MakerModel || vehicleDetail.Model);
          }
          if (!year) {
            year = this.extractYear(vehicleDetail);
          }
          if (!trim) {
            trim = vehicleDetail.Variant || '';
          }
          if (!city) {
            // Get city from registration number state code
            const stateCode = vehicleDetail.RegistrationNumber ? vehicleDetail.RegistrationNumber.substring(0, 2) : '';
            const stateMapping = await StateMapping.findOne({ where: { StateCode: stateCode } });
            city = stateMapping ? stateMapping.StateCapital : 'Delhi';
          }
          if (!noOfOwners) {
            noOfOwners = vehicleDetail.OwnerNumber || '1';
          }
        }
      }

      // Validate required fields
      if (!make || !model) {
        logger.warn('Make or model not available for price range calculation');
        return Result.success(null); // Return null like .NET does when data is missing
      }

      // Check if kmsDriven is provided (required by Droom API)
      if (!kmsDriven) {
        logger.warn('KmsDriven not provided, skipping Droom API call');
        return Result.success(null);
      }

      // Call Droom API to get used price range
      const priceRangeResult = await droomService.getEnterpriseUsedPriceRangeAsync({
        make,
        model,
        year,
        trim,
        kmsDriven,
        city: city || 'Delhi',
        noOfOwners: noOfOwners || '1',
        transactionType: transactionType || 'b',
        customerType: customerType || 'individual'
      });

      if (!priceRangeResult.isSuccess) {
        logger.warn(`Droom API error: ${priceRangeResult.error}`);
        return Result.success(null);
      }

      return Result.success(priceRangeResult.value);
    } catch (error) {
      logger.error('Get used price range error:', error);
      return Result.failure(error.message || 'Failed to get used price range');
    }
  }

  /**
   * Get price range by vehicle detail ID - matches .NET ObvService.GetEnterpriseUsedPriceRangeByVehicleDetailIdAsync
   * First checks database cache, then falls back to Droom API
   */
  async getByVehicleDetailIdAsync(vehicleDetailId, userEmail) {
    try {
      logger.info(`Get OBV for vehicle detail ID: ${vehicleDetailId} by user: ${userEmail}`);

      // Get user
      const user = await User.findOne({
        where: { NormalizedEmail: userEmail.toUpperCase() }
      });

      if (!user) {
        return Result.failure('User not found');
      }

      // Get vehicle details from database
      const vehicleDetail = await VehicleDetail.findByPk(vehicleDetailId);

      if (!vehicleDetail) {
        return Result.failure('Vehicle detail not found');
      }

      // Extract make/model from Surepass data
      const make = this.extractMakeFromDescription(vehicleDetail.MakerDescription || vehicleDetail.Manufacturer);
      const model = this.extractModelFromDescription(vehicleDetail.MakerModel || vehicleDetail.Model);
      const year = this.extractYear(vehicleDetail);

      if (!make || !model) {
        logger.warn('Cannot extract make/model from vehicle detail');
        return Result.success(null);
      }

      // Get city from state code
      const stateCode = vehicleDetail.RegistrationNumber ? vehicleDetail.RegistrationNumber.substring(0, 2) : '';
      const stateMapping = await StateMapping.findOne({ where: { StateCode: stateCode } });
      const city = stateMapping ? stateMapping.StateCapital : 'Delhi';

      // Prepare vehicle data for Droom API
      const vehicleData = {
        make: make,
        model: model,
        year: year,
        trim: vehicleDetail.Variant || '',
        kmsDriven: '50000', // Default if not known
        city: city,
        noOfOwners: vehicleDetail.OwnerNumber || '1',
        transactionType: 'b',
        customerType: 'individual'
      };

      // Call Droom API to get used price range
      const priceRangeResult = await droomService.getEnterpriseUsedPriceRangeAsync(vehicleData);

      if (!priceRangeResult.isSuccess) {
        logger.warn(`Droom API error for vehicle ${vehicleDetailId}: ${priceRangeResult.error}`);
        return Result.success(null);
      }

      return Result.success(priceRangeResult.value);
    } catch (error) {
      logger.error('Get OBV by vehicle detail ID error:', error);
      return Result.failure(error.message || 'Failed to get OBV');
    }
  }
}

module.exports = new ObvService();
