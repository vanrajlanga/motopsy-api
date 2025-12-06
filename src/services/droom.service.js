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
   * Matches .NET DroomService authentication using /v1/oauth/token endpoint
   */
  async authenticateAsync() {
    try {
      // Check if we have a valid token
      if (this.accessToken && this.tokenExpiry && new Date() < this.tokenExpiry) {
        return this.accessToken;
      }

      logger.info('Authenticating with Droom API...');

      // Match .NET API format - POST to /v1/oauth/token with JSON body
      const response = await axios.post(
        `${this.apiUrl}/v1/oauth/token`,
        {
          client_id: this.clientId,
          client_secret: this.clientSecret,
          username: this.username,
          password: this.password
        },
        {
          headers: {
            'Content-Type': 'application/json'
          }
        }
      );

      this.accessToken = response.data.access_token;
      // Set expiry with 60 second buffer (matching .NET)
      this.tokenExpiry = new Date(Date.now() + (response.data.expires_in - 60) * 1000);

      logger.info('Droom API authentication successful');
      return this.accessToken;
    } catch (error) {
      logger.error('Droom authentication error:', error.response?.data || error.message);
      throw new Error('Failed to authenticate with Droom API');
    }
  }

  /**
   * Get enterprise catalog (list of vehicles)
   * Matches .NET API format using form-urlencoded
   */
  async getEnterpriseCatalogAsync(request) {
    try {
      const token = await this.authenticateAsync();
      const { category, make, model, year } = request;

      logger.info(`Fetching Droom enterprise catalog for ${make} ${model}...`);

      // Build form data matching .NET API
      const formData = new URLSearchParams();
      formData.append('category', category || '');
      formData.append('make', make || '');
      formData.append('model', model || '');
      formData.append('year', year || '');

      const response = await axios.post(
        `${this.apiUrl}/enterprise-catalog`,
        formData.toString(),
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/x-www-form-urlencoded'
          }
        }
      );

      // Check for auth error
      if (response.data && response.data.message &&
          response.data.message.includes('authorization header is mandatory')) {
        this.accessToken = null;
        this.tokenExpiry = null;
        return this.getEnterpriseCatalogAsync(request);
      }

      if (response.data) {
        return Result.success(response.data);
      }

      return Result.failure('No vehicles found in catalog');
    } catch (error) {
      logger.error('Droom get catalog error:', error.response?.data || error.message);

      if (error.response) {
        return Result.failure(error.response.data?.message || 'Failed to fetch catalog');
      }

      return Result.failure(error.message || 'Droom API service unavailable');
    }
  }

  /**
   * Get enterprise used price range
   * Returns data in format expected by frontend: { Excellent: {range_from, range_to}, VeryGood: {...}, Good: {...}, Fair: {...} }
   * Matches .NET API EnterpriseUsedPriceRangeDto format
   */
  async getEnterpriseUsedPriceRangeAsync(request, retryCount = 0) {
    try {
      // Check if Droom credentials are configured
      if (!this.clientId || !this.clientSecret || !this.username || !this.password) {
        logger.warn('Droom API credentials not configured');
        return Result.failure('Droom API credentials not configured');
      }

      const token = await this.authenticateAsync();
      const { make, model, year, trim, kmsDriven, city, noOfOwners, transactionType, customerType } = request;

      logger.info(`Fetching Droom used price range for ${make} ${model}...`);

      // Build form data matching .NET API (uses form-urlencoded)
      const formData = new URLSearchParams();
      formData.append('make', make || '');
      formData.append('model', model || '');
      formData.append('year', year || '');
      formData.append('trim', trim || '');
      formData.append('kms_driven', kmsDriven || '');
      formData.append('city', city || 'Delhi');
      formData.append('customer_type', customerType || 'individual');
      formData.append('transaction_type', transactionType || 'b');
      formData.append('noOfOwners', noOfOwners || '1');

      const response = await axios.post(
        `${this.apiUrl}/enterprise-used-price-range`,
        formData.toString(),
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/x-www-form-urlencoded'
          }
        }
      );

      // Check for auth error (like .NET does) - only retry once
      if (response.data && response.data.message &&
          response.data.message.includes('authorization header is mandatory') &&
          retryCount < 1) {
        // Token expired, clear and retry once
        this.accessToken = null;
        this.tokenExpiry = null;
        return this.getEnterpriseUsedPriceRangeAsync(request, retryCount + 1);
      }

      if (response.data && response.data.data) {
        // Return data directly in format frontend expects
        // Droom API returns: { Excellent: {range_from, range_to}, VeryGood: {...}, Good: {...}, Fair: {...} }
        const data = response.data.data;

        logger.info(`Droom price range response for ${make} ${model}: ${JSON.stringify(data)}`);

        return Result.success(data);
      }

      logger.warn(`Droom API response has no data: ${JSON.stringify(response.data)}`);
      return Result.failure('Unable to calculate price range');
    } catch (error) {
      logger.error('Droom get price range error:', error.response?.data || error.message);

      if (error.response) {
        return Result.failure(error.response.data?.message || 'Failed to fetch price range');
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
