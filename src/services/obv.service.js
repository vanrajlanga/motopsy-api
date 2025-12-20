const Result = require('../utils/result');
const logger = require('../config/logger');
const resaleValueService = require('./resale-value.service');
const surepassService = require('./surepass.service');
const droomService = require('./droom.service');
const VehicleDetail = require('../models/vehicle-detail.model');
const VehicleSpecification = require('../models/vehicle-specification.model');
const User = require('../models/user.model');
const StateMapping = require('../models/state-mapping.model');
const { Op } = require('sequelize');

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
    // Try manufacturing_date_formatted first (e.g., "06/2021")
    if (vehicleDetail.manufacturing_date_formatted) {
      const parts = vehicleDetail.manufacturing_date_formatted.split('/');
      if (parts.length === 2) {
        return parts[1]; // Return year part
      }
    }
    // Fallback to registration_date
    if (vehicleDetail.registration_date) {
      try {
        return new Date(vehicleDetail.registration_date).getFullYear().toString();
      } catch (e) {
        return null;
      }
    }
    return null;
  }

  /**
   * Parse price string to number
   * Handles Indian number formats like "? 10,49,000.00" (10.49 lakh) or "Rs. 10,00,000" or "1000000"
   * Note: Indian format uses commas every 2 digits after first 3 (e.g., 10,49,000 = 1049000)
   */
  parsePriceString(priceStr) {
    if (!priceStr) return null;

    // Remove currency symbols and spaces first
    let cleanedPrice = priceStr
      .replace(/[₹?]/g, '')        // Remove rupee symbols (? is often used for ₹)
      .replace(/Rs\.?/gi, '')      // Remove "Rs" or "Rs."
      .replace(/\s/g, '')          // Remove spaces
      .trim();

    // Remove all commas (Indian format: 10,49,000.00 -> 1049000.00)
    cleanedPrice = cleanedPrice.replace(/,/g, '');

    const price = parseFloat(cleanedPrice);
    return isNaN(price) ? null : price;
  }

  /**
   * Look up ex-showroom price from VehicleSpecification table
   * Uses fuzzy matching on make, model, and optionally variant
   */
  async lookupPriceFromSpecifications(make, model, variant = null) {
    try {
      logger.info(`Looking up price from specifications: ${make} ${model} ${variant || ''}`);

      // Build search conditions - require price to exist
      const whereConditions = {
        price_breakdown_ex_showroom_price: {
          [Op.and]: [
            { [Op.ne]: null },
            { [Op.ne]: '' }
          ]
        }
      };

      // Step 1: Try EXACT model match first
      let specs = await VehicleSpecification.findAll({
        where: {
          ...whereConditions,
          naming_make: { [Op.like]: `%${make}%` },
          naming_model: model  // Exact match
        },
        limit: 10,
        order: [['id', 'DESC']]
      });

      // Step 2: If no exact match, try model at START (e.g., "C-Class [2022-2024]")
      if (specs.length === 0) {
        specs = await VehicleSpecification.findAll({
          where: {
            ...whereConditions,
            naming_make: { [Op.like]: `%${make}%` },
            naming_model: { [Op.like]: `${model}%` }  // Starts with model
          },
          limit: 10,
          order: [['id', 'DESC']]
        });
      }

      // Step 3: Fallback to contains match
      if (specs.length === 0) {
        specs = await VehicleSpecification.findAll({
          where: {
            ...whereConditions,
            naming_make: { [Op.like]: `%${make}%` },
            naming_model: { [Op.like]: `%${model}%` }
          },
          limit: 10,
          order: [['id', 'DESC']]
        });
      }

      // If variant provided, filter further
      if (specs.length > 0 && variant) {
        const variantSpecs = specs.filter(s =>
          s.naming_version && s.naming_version.toLowerCase().includes(variant.toLowerCase())
        );
        if (variantSpecs.length > 0) {
          specs = variantSpecs;
        }
      }

      if (specs.length === 0) {
        logger.info(`No specifications found for ${make} ${model}`);
        return null;
      }

      // Get the first matching spec's price
      const spec = specs[0];
      const priceStr = spec.price_breakdown_ex_showroom_price;
      const price = this.parsePriceString(priceStr);

      if (price) {
        logger.info(`Found ex-showroom price from specifications: ₹${price} for ${spec.naming_make} ${spec.naming_model} ${spec.naming_version}`);
        return price;
      }

      return null;
    } catch (error) {
      logger.error('Error looking up price from specifications:', error);
      return null;
    }
  }

  /**
   * Fetch and store ex-showroom price if not already stored
   * 1. First checks if already stored in VehicleDetail
   * 2. Then looks up from VehicleSpecification table
   * 3. Falls back to Surepass API if not found locally
   */
  async fetchAndStoreExShowroomPrice(vehicleDetail) {
    try {
      // Check if price already stored
      if (vehicleDetail.ex_showroom_price && parseFloat(vehicleDetail.ex_showroom_price) > 0) {
        logger.info(`Ex-showroom price already stored: ₹${vehicleDetail.ex_showroom_price}`);
        return parseFloat(vehicleDetail.ex_showroom_price);
      }

      // Extract vehicle info for price lookup
      const make = this.extractMakeFromDescription(vehicleDetail.maker_description || vehicleDetail.manufacturer);
      const model = this.extractModelFromDescription(vehicleDetail.maker_model || vehicleDetail.model);
      const variant = vehicleDetail.variant || '';
      const fuelType = vehicleDetail.fuel_type || '';
      const color = vehicleDetail.color || '';

      if (!make || !model) {
        logger.warn('Cannot fetch price: make/model not available');
        return null;
      }

      logger.info(`Fetching ex-showroom price for ${make} ${model} ${variant}...`);

      // Step 1: Try to look up from VehicleSpecification table (local database)
      let exShowroomPrice = await this.lookupPriceFromSpecifications(make, model, variant);

      // Step 2: If not found locally, try Surepass API as fallback
      if (!exShowroomPrice) {
        logger.info(`Price not found in local DB, trying Surepass API for ${make} ${model}...`);

        const priceResult = await surepassService.getVehiclePriceAsync({
          vehicleName: make,
          model: model,
          variant: variant,
          color: color,
          fuelType: fuelType
        });

        if (priceResult.isSuccess && priceResult.value.exShowroomPrice) {
          exShowroomPrice = parseFloat(priceResult.value.exShowroomPrice);
        }
      }

      if (exShowroomPrice) {
        // Store in database
        await VehicleDetail.update(
          { ex_showroom_price: exShowroomPrice },
          { where: { id: vehicleDetail.id } }
        );

        logger.info(`Stored ex-showroom price: ₹${exShowroomPrice} for vehicle ${vehicleDetail.id}`);
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
   * Note: make, model, year are ALWAYS extracted from Surepass/APIclub API response
   * Only kmsDriven is taken from frontend input for consistency
   */
  async getEnterpriseUsedPriceRangeAsync(request, userEmail) {
    try {
      logger.info(`Used price range requested by user: ${userEmail}`);

      // Only kmsDriven comes from frontend - everything else from API response
      let { kmsDriven, city, vehicleDetailId, originalPrice } = request;
      let make = null;
      let model = null;
      let year = null;
      let trim = null;
      let noOfOwners = null;
      let vehicleDetail = null;
      let stateCode = null;

      // If vehicleDetailId provided, fetch vehicle details
      if (vehicleDetailId) {
        vehicleDetail = await VehicleDetail.findByPk(vehicleDetailId);
        if (vehicleDetail) {
          // ALWAYS extract values from API response (Surepass/APIclub)
          // This ensures consistency regardless of what user fills in modal
          make = this.extractMakeFromDescription(vehicleDetail.maker_description || vehicleDetail.manufacturer);
          model = this.extractModelFromDescription(vehicleDetail.maker_model || vehicleDetail.model);
          year = this.extractYear(vehicleDetail);
          trim = vehicleDetail.variant || '';
          noOfOwners = vehicleDetail.owner_number || '1';

          // Get state code from registration number
          stateCode = vehicleDetail.registration_number ? vehicleDetail.registration_number.substring(0, 2) : '';

          if (!city) {
            const stateMapping = await StateMapping.findOne({ where: { state_code: stateCode } });
            city = stateMapping ? stateMapping.state_capital : 'Delhi';
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

      // If originalPrice not provided, try to fetch from local DB first, then Surepass API
      if (!originalPrice || originalPrice <= 0) {
        logger.info(`Original price not provided, attempting to fetch for ${make} ${model}...`);

        // Step 1: Try local VehicleSpecification lookup
        originalPrice = await this.lookupPriceFromSpecifications(make, model, trim);

        // Step 2: If not found locally, try Surepass API as fallback
        if (!originalPrice) {
          logger.info(`Price not found in local DB, trying Surepass API for ${make} ${model}...`);

          const priceResult = await surepassService.getVehiclePriceAsync({
            vehicleName: make,
            model: model,
            variant: trim || '',
            color: '',
            fuelType: ''
          });

          if (priceResult.isSuccess && priceResult.value.exShowroomPrice) {
            originalPrice = parseFloat(priceResult.value.exShowroomPrice);
            logger.info(`Fetched ex-showroom price from Surepass: ₹${originalPrice}`);
          }
        }

        // Store in database if we have vehicleDetail and found a price
        if (originalPrice && vehicleDetail) {
          await VehicleDetail.update(
            { ex_showroom_price: originalPrice },
            { where: { id: vehicleDetail.id } }
          );
        }
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
      logger.info(`Get OBV for vehicle detail ID: ${vehicleDetailId} by user: ${userEmail || 'anonymous'}`);

      // User lookup is optional for this endpoint (matches .NET - no [Authorize])
      // We proceed with vehicle lookup regardless of user

      // Get vehicle details from database
      const vehicleDetail = await VehicleDetail.findByPk(vehicleDetailId);

      if (!vehicleDetail) {
        return Result.failure('Vehicle detail not found');
      }

      // Extract make/model from Surepass data
      const make = this.extractMakeFromDescription(vehicleDetail.maker_description || vehicleDetail.manufacturer);
      const model = this.extractModelFromDescription(vehicleDetail.maker_model || vehicleDetail.model);
      const year = this.extractYear(vehicleDetail);

      if (!make || !model) {
        logger.warn('Cannot extract make/model from vehicle detail');
        return Result.success(null);
      }

      // Get state code from registration number
      const stateCode = vehicleDetail.registration_number ? vehicleDetail.registration_number.substring(0, 2) : '';
      const stateMapping = await StateMapping.findOne({ where: { state_code: stateCode } });
      const city = stateMapping ? stateMapping.state_capital : 'Delhi';
      const state = stateMapping ? stateMapping.state_name : null;

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
        noOfOwners: vehicleDetail.owner_number || '1'
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

  /**
   * Get enterprise catalog (list of vehicles)
   * Delegates to Droom service
   */
  async getEnterpriseCatalogAsync(request) {
    return droomService.getEnterpriseCatalogAsync(request);
  }
}

module.exports = new ObvService();
