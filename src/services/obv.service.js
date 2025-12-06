const Result = require('../utils/result');
const logger = require('../config/logger');
const resaleValueService = require('./resale-value.service');
const surepassService = require('./surepass.service');
const VehicleDetail = require('../models/vehicle-detail.model');
const User = require('../models/user.model');
const StateMapping = require('../models/state-mapping.model');

class ObvService {
  /**
   * Make name mapping - same as vehicle-detail.service.js
   * Maps Surepass MakerDescription to make name
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
   * Extract state from city string
   * E.g., "RAJKOT, Gujarat" -> "Gujarat"
   */
  extractStateFromCity(city) {
    if (!city) return null;

    // Check if city contains comma (e.g., "RAJKOT, Gujarat")
    if (city.includes(',')) {
      const parts = city.split(',');
      return parts[parts.length - 1].trim();
    }

    // Return as-is if no comma
    return city.trim();
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

  /**
   * Fetch and store ex-showroom price if not already stored
   * Only calls Surepass API if ExShowroomPrice is null
   */
  async fetchAndStoreExShowroomPrice(vehicleDetail) {
    try {
      // Check if price already stored
      if (vehicleDetail.ExShowroomPrice && parseFloat(vehicleDetail.ExShowroomPrice) > 0) {
        logger.info(`Ex-showroom price already stored: ₹${vehicleDetail.ExShowroomPrice}`);
        return parseFloat(vehicleDetail.ExShowroomPrice);
      }

      // Extract vehicle info for price lookup
      const make = this.extractMakeFromDescription(vehicleDetail.MakerDescription || vehicleDetail.Manufacturer);
      const model = this.extractModelFromDescription(vehicleDetail.MakerModel || vehicleDetail.Model);
      const variant = vehicleDetail.Variant || '';
      const fuelType = vehicleDetail.FuelType || '';
      const color = vehicleDetail.Color || '';

      if (!make || !model) {
        logger.warn('Cannot fetch price: make/model not available');
        return null;
      }

      logger.info(`Fetching ex-showroom price for ${make} ${model} ${variant}...`);

      // Call Surepass Vehicle Price Check API
      const priceResult = await surepassService.getVehiclePriceAsync({
        vehicleName: make,
        model: model,
        variant: variant,
        color: color,
        fuelType: fuelType
      });

      if (priceResult.isSuccess && priceResult.value.exShowroomPrice) {
        const exShowroomPrice = parseFloat(priceResult.value.exShowroomPrice);

        // Store in database
        await VehicleDetail.update(
          { ExShowroomPrice: exShowroomPrice },
          { where: { Id: vehicleDetail.Id } }
        );

        logger.info(`Stored ex-showroom price: ₹${exShowroomPrice} for vehicle ${vehicleDetail.Id}`);
        return exShowroomPrice;
      }

      logger.warn(`Could not fetch ex-showroom price for ${make} ${model}`);
      return null;
    } catch (error) {
      logger.error('Error fetching/storing ex-showroom price:', error);
      return null;
    }
  }

  /**
   * Get enterprise used price range using custom calculation
   * Replaces Droom API with internal algorithm
   */
  async getEnterpriseUsedPriceRangeAsync(request, userEmail) {
    try {
      logger.info(`Used price range requested by user: ${userEmail}`);

      let { make, model, year, trim, kmsDriven, city, noOfOwners, vehicleDetailId, originalPrice } = request;
      let vehicleDetail = null;
      let stateCode = null;

      // If vehicleDetailId provided, fetch vehicle details
      if (vehicleDetailId) {
        vehicleDetail = await VehicleDetail.findByPk(vehicleDetailId);
        if (vehicleDetail) {
          // Extract values from vehicle detail if not provided
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
          if (!noOfOwners) {
            noOfOwners = vehicleDetail.OwnerNumber || '1';
          }

          // Get state code from registration number
          stateCode = vehicleDetail.RegistrationNumber ? vehicleDetail.RegistrationNumber.substring(0, 2) : '';

          if (!city) {
            const stateMapping = await StateMapping.findOne({ where: { StateCode: stateCode } });
            city = stateMapping ? stateMapping.StateCapital : 'Delhi';
          }

          // Fetch ex-showroom price if not provided
          if (!originalPrice) {
            originalPrice = await this.fetchAndStoreExShowroomPrice(vehicleDetail);
          }
        }
      }

      // Validate required fields
      if (!make || !model) {
        logger.warn('Make or model not available for price range calculation');
        return Result.success(null);
      }

      if (!year) {
        logger.warn('Year not available for price range calculation');
        return Result.success(null);
      }

      // If still no original price, cannot calculate
      if (!originalPrice || originalPrice <= 0) {
        logger.warn('Original price not available for price range calculation');
        return Result.success(null);
      }

      // Extract state from city if provided (e.g., "RAJKOT, Gujarat" -> "Gujarat")
      const state = this.extractStateFromCity(city);

      // Calculate resale value using custom algorithm
      const resaleResult = resaleValueService.calculateResaleValue({
        originalPrice: parseFloat(originalPrice),
        make: make,
        year: year,
        kmsDriven: kmsDriven ? parseInt(kmsDriven) : null, // Use provided value, null if not provided
        state: state,
        stateCode: stateCode,
        city: city,
        noOfOwners: noOfOwners || '1'
      });

      if (!resaleResult.isSuccess) {
        logger.warn(`Resale calculation failed: ${resaleResult.error}`);
        return Result.success(null);
      }

      return Result.success(resaleResult.value);
    } catch (error) {
      logger.error('Get used price range error:', error);
      return Result.failure(error.message || 'Failed to get used price range');
    }
  }

  /**
   * Get price range by vehicle detail ID
   * Uses custom calculation algorithm
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

      // Get state code from registration number
      const stateCode = vehicleDetail.RegistrationNumber ? vehicleDetail.RegistrationNumber.substring(0, 2) : '';
      const stateMapping = await StateMapping.findOne({ where: { StateCode: stateCode } });
      const city = stateMapping ? stateMapping.StateCapital : 'Delhi';
      const state = stateMapping ? stateMapping.StateName : null;

      // Fetch/get ex-showroom price
      const originalPrice = await this.fetchAndStoreExShowroomPrice(vehicleDetail);

      if (!originalPrice) {
        logger.warn(`No ex-showroom price available for vehicle ${vehicleDetailId}`);
        return Result.success(null);
      }

      // Calculate resale value using custom algorithm
      // Note: kmsDriven is null here as we don't have it from vehicle details alone
      const resaleResult = resaleValueService.calculateResaleValue({
        originalPrice: originalPrice,
        make: make,
        year: year,
        kmsDriven: null, // Not available from vehicle details, will use neutral (no penalty)
        state: state,
        stateCode: stateCode,
        city: city,
        noOfOwners: vehicleDetail.OwnerNumber || '1'
      });

      if (!resaleResult.isSuccess) {
        logger.warn(`Resale calculation failed for vehicle ${vehicleDetailId}: ${resaleResult.error}`);
        return Result.success(null);
      }

      return Result.success(resaleResult.value);
    } catch (error) {
      logger.error('Get OBV by vehicle detail ID error:', error);
      return Result.failure(error.message || 'Failed to get OBV');
    }
  }
}

module.exports = new ObvService();
