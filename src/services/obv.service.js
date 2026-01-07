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

    const words = description.split(/\s+/);
    if (words.length === 0) return null;

    // Brand names that appear in MakerModel - if first word matches, use second word
    const brandPrefixes = ['TATA', 'MARUTI', 'MAHINDRA', 'HYUNDAI', 'HONDA', 'TOYOTA',
                           'FORD', 'VOLKSWAGEN', 'SKODA', 'RENAULT', 'NISSAN', 'MG',
                           'JEEP', 'MERCEDES', 'BMW', 'AUDI', 'JAGUAR', 'CHEVROLET',
                           'FIAT', 'DATSUN', 'ISUZU', 'FORCE', 'EICHER', 'HERO',
                           'BAJAJ', 'TVS', 'ROYAL', 'YAMAHA', 'SUZUKI', 'KAWASAKI',
                           'KTM', 'HARLEY', 'DUCATI', 'TRIUMPH', 'BENELLI', 'APRILIA'];

    // Compound model names that include a suffix (e.g., "Celerio X", "Grand i10", "Swift Dzire")
    const compoundModels = {
      'CELERIO X': 'Celerio X',
      'GRAND I10': 'Grand i10',
      'GRAND I10 NIOS': 'Grand i10 Nios',
      'SWIFT DZIRE': 'Swift Dzire',
      'VENUE N LINE': 'Venue N Line',
      'CITY E': 'City e',
      'BALENO RS': 'Baleno RS',
      'POLO GT': 'Polo GT',
      'JAZZ X': 'Jazz X',
      'SELTOS X LINE': 'Seltos X Line',
      'SONET X LINE': 'Sonet X Line'
    };

    // Mercedes model patterns: Extract letters before numbers
    // E.g., CLA200 -> CLA, GLA200 -> GLA, A200 -> A-Class
    const mercedesLetterToClass = {
      'A': 'A-Class', 'B': 'B-Class', 'C': 'C-Class', 'E': 'E-Class',
      'S': 'S-Class', 'G': 'G-Class', 'M': 'M-Class', 'R': 'R-Class', 'V': 'V-Class'
    };
    const mercedesMultiLetterModels = ['CLA', 'CLK', 'CLS', 'CLE', 'GLA', 'GLB', 'GLC', 'GLE', 'GLS',
                                        'SLK', 'SLC', 'SL', 'EQA', 'EQB', 'EQC', 'EQE', 'EQS', 'AMG',
                                        'ML', 'GL', 'SLS', 'SLR', 'CLK', 'CL'];

    // BMW series patterns: Number at start indicates series
    // E.g., 320D -> 3 Series, 520D -> 5 Series, 730LD -> 7 Series
    const bmwSeriesMap = {
      '1': '1 Series', '2': '2 Series', '3': '3 Series', '4': '4 Series',
      '5': '5 Series', '6': '6 Series', '7': '7 Series', '8': '8 Series'
    };

    // Models where numbers are integral part of the name (should NOT be stripped)
    const keepNumberModels = ['I10', 'I20', 'I30', 'I40', 'IX20', 'IX35', 'IX55',  // Hyundai
                              'A1', 'A3', 'A4', 'A5', 'A6', 'A7', 'A8',           // Audi A series
                              'Q2', 'Q3', 'Q5', 'Q7', 'Q8',                        // Audi Q series
                              'S3', 'S4', 'S5', 'S6', 'S7', 'S8',                  // Audi S series
                              'RS3', 'RS4', 'RS5', 'RS6', 'RS7',                   // Audi RS series
                              'X1', 'X2', 'X3', 'X4', 'X5', 'X6', 'X7',           // BMW X series
                              'Z3', 'Z4', 'M2', 'M3', 'M4', 'M5', 'M6', 'M8',     // BMW Z/M series
                              'TT', 'R8', 'E2O'];                                  // Other special models

    let startIndex = 0;

    // Check if first word is a brand prefix - if so, start from second word
    if (words.length > 1 && brandPrefixes.includes(words[0].toUpperCase())) {
      startIndex = 1;
    }

    // Check for compound model names first (check first 3 words after brand)
    for (let numWords = 3; numWords >= 2; numWords--) {
      if (words.length >= startIndex + numWords) {
        const potentialCompound = words.slice(startIndex, startIndex + numWords).join(' ').toUpperCase();
        if (compoundModels[potentialCompound]) {
          return compoundModels[potentialCompound];
        }
      }
    }

    // Get the model word
    let modelWord = (words[startIndex] || words[0]).toUpperCase();

    // Check if it's a "keep number" model (e.g., i20, X1, A4) - return as-is
    if (keepNumberModels.includes(modelWord)) {
      // Proper case for these models
      if (modelWord.startsWith('I') && modelWord.length <= 3) {
        return 'i' + modelWord.slice(1);  // i10, i20, i30
      }
      return modelWord;  // X1, A4, Q5 etc.
    }

    // Check for BMW series pattern: starts with digit followed by more chars (e.g., 320D, 520D)
    const bmwSeriesMatch = modelWord.match(/^([1-8])\d{2}/);
    if (bmwSeriesMatch) {
      const seriesNum = bmwSeriesMatch[1];
      if (bmwSeriesMap[seriesNum]) {
        return bmwSeriesMap[seriesNum];
      }
    }

    // Check for Mercedes pattern: letters followed by numbers (e.g., CLA200, GLA220, A200)
    const mercedesMatch = modelWord.match(/^([A-Z]+)(\d+)/);
    if (mercedesMatch) {
      const letterPart = mercedesMatch[1];

      // Check if it's a multi-letter Mercedes model (CLA, GLA, GLC, etc.)
      if (mercedesMultiLetterModels.includes(letterPart)) {
        return letterPart;
      }

      // Check if it's a single-letter Mercedes class (A, C, E, S, etc.)
      if (mercedesLetterToClass[letterPart]) {
        return mercedesLetterToClass[letterPart];
      }

      // For other patterns with letters followed by numbers, just use the letters
      // Only if letters are 2+ chars (to avoid breaking models like "i20" which we handle above)
      if (letterPart.length >= 2) {
        return letterPart.charAt(0).toUpperCase() + letterPart.slice(1).toLowerCase();
      }
    }

    // Check for standalone single-letter Mercedes models (e.g., "C" from "C 220 D")
    // These don't have numbers attached but should map to their class names
    if (modelWord.length === 1 && mercedesLetterToClass[modelWord]) {
      return mercedesLetterToClass[modelWord];
    }

    // Default: use single word model name
    // Capitalize properly (e.g., "SELTOS" -> "Seltos", "PUNCH" -> "Punch")
    return modelWord.charAt(0).toUpperCase() + modelWord.slice(1).toLowerCase();
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
      // Use stored kms_driven from vehicle_details table for consistent calculation
      const kmsDriven = vehicleDetail.kms_driven;
      const resaleResult = resaleValueService.calculateResaleValue({
        originalPrice: originalPrice,
        make: make,
        year: year,
        kmsDriven: kmsDriven ? parseInt(kmsDriven) : null,
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
