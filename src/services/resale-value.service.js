const Result = require('../utils/result');
const logger = require('../config/logger');

/**
 * Resale Value Service
 * Calculates vehicle resale value based on Excel algorithm:
 * FINAL VALUE = Original Price × (Base Retained % + Brand Adj % - Owner Penalty % + State Adj % - Mileage Penalty %)
 */
class ResaleValueService {
  constructor() {
    // Age-based depreciation table (from Excel)
    this.ageDepreciation = {
      1: { depreciation: 0.15, retained: 0.85 },
      2: { depreciation: 0.20, retained: 0.80 },
      3: { depreciation: 0.30, retained: 0.70 },
      4: { depreciation: 0.40, retained: 0.60 },
      5: { depreciation: 0.50, retained: 0.50 },
      6: { depreciation: 0.55, retained: 0.45 },
      7: { depreciation: 0.60, retained: 0.40 },
      8: { depreciation: 0.65, retained: 0.35 },
      9: { depreciation: 0.70, retained: 0.30 },
      10: { depreciation: 0.75, retained: 0.25 }
    };

    // Brand adjustment percentages (from Excel)
    this.brandAdjustments = {
      // Premium brands with good resale
      'maruti suzuki': 0.05,
      'maruti': 0.05,
      'toyota': 0.05,
      'honda': 0.03,
      'hyundai': 0.03,
      'mahindra': 0.03,
      'mahindra & mahindra': 0.03,
      'kia': 0.02,
      // Neutral brands
      'tata': 0,
      'tata motors': 0,
      'mg': 0,
      'mg motor': 0,
      'nissan': 0,
      'renault': 0,
      // Negative adjustment brands
      'skoda': -0.05,
      'volkswagen': -0.05,
      'jeep': -0.05,
      'citroen': -0.05,
      'citroën': -0.05,
      'isuzu': -0.05,
      'force motors': -0.05,
      'byd': -0.05,
      // Luxury brands (higher depreciation)
      'mercedes-benz': -0.08,
      'mercedes': -0.08,
      'bmw': -0.10,
      'mini': -0.10,
      'lexus': -0.10,
      'audi': -0.12,
      'volvo': -0.12,
      'land rover': -0.12,
      // Super luxury brands
      'jaguar': -0.15,
      'porsche': -0.15,
      'ferrari': -0.15,
      'lamborghini': -0.15,
      'maserati': -0.15,
      'bentley': -0.15,
      'rolls-royce': -0.15,
      'aston martin': -0.15,
      'mclaren': -0.15
    };

    // State adjustment percentages (from Excel)
    this.stateAdjustments = {
      // High demand states (+3%)
      'maharashtra': 0.03,
      'gujarat': 0.03,
      'delhi': 0.03,
      'karnataka': 0.03,
      'kerala': 0.03,
      'tamil nadu': 0.03,
      'telangana': 0.03,
      'andhra pradesh': 0.03,
      'haryana': 0.03,
      'punjab': 0.03,
      'chandigarh': 0.03,
      'uttar pradesh': 0.03,
      'west bengal': 0.03,
      // Neutral states (0%)
      'rajasthan': 0,
      'madhya pradesh': 0,
      'bihar': 0,
      'jharkhand': 0,
      'odisha': 0,
      'goa': 0,
      'chhattisgarh': 0,
      'himachal pradesh': 0,
      'uttarakhand': 0,
      'puducherry': 0,
      'jammu & kashmir': 0,
      'jammu and kashmir': 0,
      'assam': 0,
      // Lower demand states (-3%)
      'manipur': -0.03,
      'meghalaya': -0.03,
      'mizoram': -0.03,
      'nagaland': -0.03,
      'tripura': -0.03,
      'sikkim': -0.03,
      'arunachal pradesh': -0.03,
      'ladakh': -0.03,
      'andaman & nicobar islands': -0.03,
      'andaman and nicobar': -0.03
    };

    // State code to state name mapping
    this.stateCodeMapping = {
      'MH': 'maharashtra',
      'GJ': 'gujarat',
      'DL': 'delhi',
      'KA': 'karnataka',
      'KL': 'kerala',
      'TN': 'tamil nadu',
      'TS': 'telangana',
      'AP': 'andhra pradesh',
      'HR': 'haryana',
      'PB': 'punjab',
      'CH': 'chandigarh',
      'UP': 'uttar pradesh',
      'WB': 'west bengal',
      'RJ': 'rajasthan',
      'MP': 'madhya pradesh',
      'BR': 'bihar',
      'JH': 'jharkhand',
      'OD': 'odisha',
      'OR': 'odisha',
      'GA': 'goa',
      'CG': 'chhattisgarh',
      'HP': 'himachal pradesh',
      'UK': 'uttarakhand',
      'PY': 'puducherry',
      'JK': 'jammu & kashmir',
      'AS': 'assam',
      'MN': 'manipur',
      'ML': 'meghalaya',
      'MZ': 'mizoram',
      'NL': 'nagaland',
      'TR': 'tripura',
      'SK': 'sikkim',
      'AR': 'arunachal pradesh',
      'LA': 'ladakh',
      'AN': 'andaman & nicobar islands'
    };

    // Owner penalty percentages
    this.ownerPenalties = {
      1: 0,      // 1st owner - no penalty
      2: 0.03,   // 2nd owner - 3% penalty
      3: 0.06,   // 3rd owner - 6% penalty
      4: 0.10,   // 4th+ owner - 10% penalty
      5: 0.10
    };

    // Mileage penalty thresholds (per year average)
    // Standard: 10,000-15,000 km/year
    this.mileagePenaltyThresholds = {
      excellent: 8000,   // < 8000 km/year - no penalty
      good: 12000,       // 8000-12000 km/year - no penalty
      average: 15000,    // 12000-15000 km/year - small penalty
      high: 20000,       // 15000-20000 km/year - medium penalty
      veryHigh: 25000    // > 20000 km/year - high penalty
    };
  }

  /**
   * Calculate mileage penalty based on km driven and vehicle age
   * Returns 0 if kmsDriven is not provided (no penalty/bonus)
   */
  calculateMileagePenalty(kmsDriven, vehicleAge) {
    // If kmsDriven not provided, return 0 (neutral - no penalty or bonus)
    if (kmsDriven === null || kmsDriven === undefined || !vehicleAge || vehicleAge <= 0) {
      return 0;
    }

    const avgKmPerYear = kmsDriven / vehicleAge;

    if (avgKmPerYear <= this.mileagePenaltyThresholds.excellent) {
      return -0.02; // Bonus for low mileage
    } else if (avgKmPerYear <= this.mileagePenaltyThresholds.good) {
      return 0;
    } else if (avgKmPerYear <= this.mileagePenaltyThresholds.average) {
      return 0.02;
    } else if (avgKmPerYear <= this.mileagePenaltyThresholds.high) {
      return 0.05;
    } else {
      return 0.08; // High mileage penalty
    }
  }

  /**
   * Get brand adjustment percentage
   */
  getBrandAdjustment(make) {
    if (!make) return 0;

    const normalizedMake = make.toLowerCase().trim();

    // Direct match
    if (this.brandAdjustments.hasOwnProperty(normalizedMake)) {
      return this.brandAdjustments[normalizedMake];
    }

    // Partial match
    for (const [brand, adjustment] of Object.entries(this.brandAdjustments)) {
      if (normalizedMake.includes(brand) || brand.includes(normalizedMake)) {
        return adjustment;
      }
    }

    return 0; // Default neutral
  }

  /**
   * Get state adjustment percentage
   */
  getStateAdjustment(stateOrCode) {
    if (!stateOrCode) return 0;

    const normalized = stateOrCode.toUpperCase().trim();

    // Check if it's a state code
    if (this.stateCodeMapping.hasOwnProperty(normalized)) {
      const stateName = this.stateCodeMapping[normalized];
      return this.stateAdjustments[stateName] || 0;
    }

    // Check if it's a state name
    const normalizedLower = stateOrCode.toLowerCase().trim();
    if (this.stateAdjustments.hasOwnProperty(normalizedLower)) {
      return this.stateAdjustments[normalizedLower];
    }

    // Partial match for city names (extract state)
    for (const [state, adjustment] of Object.entries(this.stateAdjustments)) {
      if (normalizedLower.includes(state)) {
        return adjustment;
      }
    }

    return 0; // Default neutral
  }

  /**
   * Get age-based retained value percentage
   */
  getAgeRetainedPercent(vehicleAge) {
    if (!vehicleAge || vehicleAge < 1) return 0.90; // Less than 1 year - 90% retained

    const age = Math.min(Math.floor(vehicleAge), 10); // Cap at 10 years
    return this.ageDepreciation[age]?.retained || 0.25; // Default 25% for 10+ years
  }

  /**
   * Get owner penalty percentage
   */
  getOwnerPenalty(ownerNumber) {
    if (!ownerNumber || ownerNumber < 1) return 0;

    const owner = Math.min(ownerNumber, 5);
    return this.ownerPenalties[owner] || 0.10;
  }

  /**
   * Calculate vehicle age from manufacturing year
   */
  calculateVehicleAge(year) {
    if (!year) return null;

    const currentYear = new Date().getFullYear();
    const vehicleYear = parseInt(year);

    if (isNaN(vehicleYear)) return null;

    return currentYear - vehicleYear;
  }

  /**
   * Main calculation function
   * Returns price ranges in format: { Excellent, VeryGood, Good, Fair }
   */
  calculateResaleValue(params) {
    try {
      const {
        originalPrice,
        make,
        year,
        kmsDriven,
        state,
        stateCode,
        city,
        noOfOwners
      } = params;

      logger.info(`Calculating resale value for ${make}, year ${year}, price ${originalPrice}`);

      // Validate original price
      if (!originalPrice || originalPrice <= 0) {
        logger.warn('Original price not available for resale calculation');
        return Result.failure('Original price not available');
      }

      // Calculate vehicle age
      const vehicleAge = this.calculateVehicleAge(year);
      if (!vehicleAge || vehicleAge < 0) {
        logger.warn('Invalid vehicle year for resale calculation');
        return Result.failure('Invalid vehicle year');
      }

      // Get all adjustment factors
      const baseRetained = this.getAgeRetainedPercent(vehicleAge);
      const brandAdj = this.getBrandAdjustment(make);
      // Priority: state > stateCode > city (state extracted from city like "RAJKOT, Gujarat" -> "Gujarat")
      const stateAdj = this.getStateAdjustment(state || stateCode || city);
      const ownerPenalty = this.getOwnerPenalty(parseInt(noOfOwners) || 1);
      // Pass kmsDriven as-is (can be null) - mileagePenalty handles null internally
      const mileagePenalty = this.calculateMileagePenalty(
        kmsDriven !== null && kmsDriven !== undefined ? parseInt(kmsDriven) : null,
        vehicleAge
      );

      // Calculate final percentage
      // Formula: Base Retained + Brand Adj - Owner Penalty + State Adj - Mileage Penalty
      const finalPercent = baseRetained + brandAdj - ownerPenalty + stateAdj - mileagePenalty;

      // Ensure percentage is between 10% and 95%
      const clampedPercent = Math.max(0.10, Math.min(0.95, finalPercent));

      // Calculate base resale value (Good condition)
      const goodValue = Math.round(originalPrice * clampedPercent);

      // Calculate condition-based values
      // From Excel: Avg = 85%, Good = 100%, Excellent = 110%
      const excellentValue = Math.round(goodValue * 1.10);
      const veryGoodValue = Math.round(goodValue * 1.05);
      const fairValue = Math.round(goodValue * 0.85);

      // Create price ranges (±5% for range)
      const createRange = (value) => ({
        range_from: Math.round(value * 0.95),
        range_to: Math.round(value * 1.05)
      });

      const result = {
        Excellent: createRange(excellentValue),
        VeryGood: createRange(veryGoodValue),
        Good: createRange(goodValue),
        Fair: createRange(fairValue)
      };

      logger.info(`Resale calculation result: Age=${vehicleAge}yrs, Base=${(baseRetained * 100).toFixed(1)}%, ` +
        `Brand=${(brandAdj * 100).toFixed(1)}%, State=${(stateAdj * 100).toFixed(1)}%, ` +
        `Owner=${(ownerPenalty * 100).toFixed(1)}%, Mileage=${(mileagePenalty * 100).toFixed(1)}%, ` +
        `Final=${(clampedPercent * 100).toFixed(1)}%, Good Value=₹${goodValue}`);

      return Result.success(result);
    } catch (error) {
      logger.error('Resale value calculation error:', error);
      return Result.failure(error.message || 'Failed to calculate resale value');
    }
  }
}

module.exports = new ResaleValueService();
