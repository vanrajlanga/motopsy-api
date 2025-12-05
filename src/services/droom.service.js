const axios = require('axios');
const Result = require('../utils/result');
const logger = require('../config/logger');

class DroomService {
  constructor() {
    this.apiUrl = process.env.DROOM_API_URL || 'https://apig.droom.in/dss';
    this.clientId = process.env.DROOM_CLIENT_ID;
    this.clientSecret = process.env.DROOM_CLIENT_SECRET;
    this.username = process.env.DROOM_USERNAME;
    this.password = process.env.DROOM_PASSWORD;
    this.accessToken = null;
    this.tokenExpiry = null;
  }

  /**
   * Authenticate and get access token
   */
  async authenticateAsync() {
    try {
      // Check if we have a valid token
      if (this.accessToken && this.tokenExpiry && new Date() < this.tokenExpiry) {
        return this.accessToken;
      }

      logger.info('Authenticating with Droom API...');

      const response = await axios.post(
        `${this.apiUrl}/oauth/token`,
        {
          grant_type: 'password',
          username: this.username,
          password: this.password
        },
        {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Basic ${Buffer.from(`${this.clientId}:${this.clientSecret}`).toString('base64')}`
          }
        }
      );

      this.accessToken = response.data.access_token;
      this.tokenExpiry = new Date(Date.now() + (response.data.expires_in - 300) * 1000); // 5 min buffer

      logger.info('Droom API authentication successful');
      return this.accessToken;
    } catch (error) {
      logger.error('Droom authentication error:', error);
      throw new Error('Failed to authenticate with Droom API');
    }
  }

  /**
   * Get enterprise catalog (list of vehicles)
   */
  async getEnterpriseCatalogAsync(request) {
    try {
      const token = await this.authenticateAsync();
      const { make, model, year, variant } = request;

      logger.info(`Fetching Droom enterprise catalog...`);

      const response = await axios.post(
        `${this.apiUrl}/api/v1/enterprise/catalog`,
        {
          make: make,
          model: model,
          year: year,
          variant: variant
        },
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }
      );

      if (response.data && response.data.data) {
        return Result.success({
          vehicles: response.data.data,
          count: response.data.data.length
        });
      }

      return Result.failure('No vehicles found in catalog');
    } catch (error) {
      logger.error('Droom get catalog error:', error);

      if (error.response) {
        return Result.failure(error.response.data.message || 'Failed to fetch catalog');
      }

      return Result.failure(error.message || 'Droom API service unavailable');
    }
  }

  /**
   * Get enterprise used price range
   */
  async getEnterpriseUsedPriceRangeAsync(request) {
    try {
      const token = await this.authenticateAsync();
      const { make, model, year, variant, city, kilometers, registrationYear } = request;

      logger.info(`Fetching Droom used price range for ${make} ${model}...`);

      const response = await axios.post(
        `${this.apiUrl}/api/v1/enterprise/used-price-range`,
        {
          make: make,
          model: model,
          year: year,
          variant: variant,
          city: city,
          kilometers_driven: kilometers,
          registration_year: registrationYear
        },
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }
      );

      if (response.data && response.data.data) {
        const data = response.data.data;

        return Result.success({
          make: make,
          model: model,
          year: year,
          variant: variant,
          priceRange: {
            min: data.min_price,
            max: data.max_price,
            average: data.average_price,
            currency: 'INR'
          },
          marketValue: data.market_value,
          depreciation: data.depreciation_percentage,
          confidence: data.confidence_score
        });
      }

      return Result.failure('Unable to calculate price range');
    } catch (error) {
      logger.error('Droom get price range error:', error);

      if (error.response) {
        return Result.failure(error.response.data.message || 'Failed to fetch price range');
      }

      return Result.failure(error.message || 'Droom API service unavailable');
    }
  }

  /**
   * Get OBV (Online Bike/Car Valuation) by vehicle detail ID
   */
  async getOBVByVehicleDetailIdAsync(vehicleDetailId, vehicleData) {
    try {
      const token = await this.authenticateAsync();

      logger.info(`Fetching Droom OBV for vehicle detail ID: ${vehicleDetailId}`);

      const response = await axios.post(
        `${this.apiUrl}/api/v1/enterprise/obv`,
        {
          make: vehicleData.make,
          model: vehicleData.model,
          year: vehicleData.year,
          variant: vehicleData.variant,
          fuel_type: vehicleData.fuelType,
          kilometers_driven: vehicleData.kilometers || 50000,
          city: vehicleData.city || 'Delhi',
          registration_year: vehicleData.registrationYear || vehicleData.year,
          owner_number: vehicleData.ownerNumber || 1
        },
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }
      );

      if (response.data && response.data.data) {
        const data = response.data.data;

        return Result.success({
          vehicleDetailId: vehicleDetailId,
          valuation: {
            estimatedPrice: data.estimated_price,
            priceRange: {
              min: data.min_price,
              max: data.max_price
            },
            currency: 'INR'
          },
          marketCondition: {
            demand: data.market_demand,
            supply: data.market_supply,
            trend: data.price_trend
          },
          depreciation: {
            percentage: data.depreciation_percentage,
            amount: data.depreciation_amount
          },
          confidence: data.confidence_score,
          lastUpdated: data.last_updated || new Date()
        });
      }

      return Result.failure('Unable to calculate OBV');
    } catch (error) {
      logger.error('Droom get OBV error:', error);

      if (error.response) {
        return Result.failure(error.response.data.message || 'Failed to fetch OBV');
      }

      return Result.failure(error.message || 'Droom API service unavailable');
    }
  }

  /**
   * Get vehicle history from Droom
   */
  async getVehicleHistoryAsync(registrationNumber) {
    try {
      const token = await this.authenticateAsync();

      logger.info(`Fetching Droom vehicle history for: ${registrationNumber}`);

      const response = await axios.post(
        `${this.apiUrl}/api/v1/enterprise/vehicle-history`,
        {
          registration_number: registrationNumber.replace(/\s/g, '').toUpperCase()
        },
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }
      );

      if (response.data && response.data.data) {
        const data = response.data.data;

        return Result.success({
          registrationNumber: registrationNumber,
          history: {
            owners: data.number_of_owners,
            accidents: data.accident_history,
            serviceRecords: data.service_records,
            modifications: data.modifications,
            insuranceClaims: data.insurance_claims
          },
          rawData: data
        });
      }

      return Result.failure('No vehicle history found');
    } catch (error) {
      logger.error('Droom get vehicle history error:', error);

      if (error.response) {
        return Result.failure(error.response.data.message || 'Failed to fetch vehicle history');
      }

      return Result.failure(error.message || 'Droom API service unavailable');
    }
  }
}

module.exports = new DroomService();
