const axios = require('axios');
const Result = require('../utils/result');
const logger = require('../config/logger');
const apiLogger = require('../utils/api-logger');

/**
 * APIclub Service - Failsafe for Surepass RC Verification
 * Documentation: https://docs.apiclub.in
 */
class ApiclubService {
  constructor() {
    this.apiKey = process.env.APICLUB_API_KEY;
    this.env = process.env.APICLUB_ENV || 'uat';
    this.baseUrl = this.env === 'prod'
      ? (process.env.APICLUB_PROD_URL || 'https://prod.apiclub.in/api')
      : (process.env.APICLUB_UAT_URL || 'https://uat.apiclub.in/api');

    this.headers = {
      'x-api-key': this.apiKey,
      'Content-Type': 'application/json',
      'Referer': 'motopsy.com'
    };
  }

  /**
   * Get RC (Registration Certificate) details from APIclub
   * Endpoint: POST /v1/rc_info
   * Returns data in Surepass-compatible format for seamless integration
   */
  async getRegistrationDetailsAsync(registrationNumber) {
    const cleanRegNum = registrationNumber.replace(/\s/g, '').toUpperCase();
    const requestUrl = `${this.baseUrl}/v1/rc_info`;
    const requestBody = { vehicleId: cleanRegNum };
    const startTime = Date.now();

    try {
      logger.info(`[APIclub] RC verification for: ${registrationNumber}`);

      const response = await axios.post(
        requestUrl,
        requestBody,
        {
          headers: this.headers,
          timeout: 30000
        }
      );

      // Log API call
      apiLogger.log({
        registrationNumber: cleanRegNum,
        apiSource: 'apiclub',
        endpoint: 'rc_info',
        request: {
          url: requestUrl,
          method: 'POST',
          headers: this.headers,
          body: requestBody
        },
        response: {
          status: response.status,
          data: response.data,
          duration: Date.now() - startTime
        }
      });

      if (response.data.code === 200 && response.data.status === 'success') {
        const data = response.data.response;

        logger.info(`[APIclub] RC verification successful for: ${registrationNumber}`);

        // Map APIclub response to Surepass-compatible format
        // Updated with all fields available in Production API (Dec 2025)
        return Result.success({
          // Basic Info
          clientId: data.request_id || '',
          rcNumber: data.license_plate,
          registrationDate: data.registration_date,
          rcStatus: data.rc_status,

          // Owner Details
          ownerName: data.owner_name,
          fatherName: data.father_name || null, // Available in Production!
          ownerNumber: data.owner_count || null,
          maskedName: null, // Not available in APIclub
          mobileNumber: null, // Not available in APIclub

          // Address
          presentAddress: data.present_address || null,
          permanentAddress: data.permanent_address || null,
          registeredAt: data.rto_name || null, // Available in Production!

          // Vehicle Identity
          vehicleChassisNumber: data.chassis_number,
          vehicleEngineNumber: data.engine_number,
          variant: null, // Not available in APIclub

          // Vehicle Specs
          makerDescription: data.brand_name,
          makerModel: data.brand_model,
          bodyType: data.body_type || null, // Available in Production!
          fuelType: data.fuel_type,
          color: data.color || '',
          normsType: data.norms || null,

          // Capacity & Weight
          cubicCapacity: data.cubic_capacity,
          vehicleGrossWeight: data.gross_weight,
          noCylinders: data.cylinders,
          seatCapacity: data.seating_capacity,
          sleeperCapacity: data.sleeper_capacity || null, // Available in Production!
          standingCapacity: data.standing_capacity || null, // Available in Production!
          unladenWeight: data.unladen_weight || null, // Available in Production!
          wheelbase: data.wheelbase || null, // Available in Production!

          // Category
          vehicleCategory: data.category || data.class,
          vehicleCategoryDescription: data.class,

          // Manufacturing & Age
          // Use actual values from Production, fallback to estimation
          manufacturingDate: data.manufacturing_date || null,
          manufacturingDateFormatted: data.manufacturing_date_formatted || null,
          vehicleAge: data.vehicle_age || null,

          // Fitness
          fitUpTo: data.fit_up_to || null, // Available in Production!
          latestBy: data.latest_by || null, // Available in Production!
          lessInfo: false, // Not available in APIclub

          // Finance
          financer: data.financer || null,
          financed: data.is_financed === true || data.is_financed === 'true' || data.is_financed === 'YES' || !!data.financer,

          // Insurance
          insuranceCompany: data.insurance_company || null,
          insurancePolicyNumber: data.insurance_policy || null,
          insuranceUpto: data.insurance_expiry || null,

          // Tax
          taxUpto: data.tax_upto && data.tax_upto !== '1900-01-01' ? data.tax_upto : null,
          taxPaidUpto: data.tax_paid_upto && data.tax_paid_upto !== '1900-01-01' ? data.tax_paid_upto : null,

          // PUCC
          puccNumber: data.pucc_number || null,
          puccUpto: data.pucc_upto || null,

          // Permit
          permitNumber: data.permit_number || null,
          permitIssueDate: data.permit_issue_date && data.permit_issue_date !== '1900-01-01' ? data.permit_issue_date : null,
          permitValidFrom: data.permit_valid_from && data.permit_valid_from !== '1900-01-01' ? data.permit_valid_from : null,
          permitValidUpto: data.permit_valid_upto && data.permit_valid_upto !== '1900-01-01' ? data.permit_valid_upto : null,
          permitType: data.permit_type || null,

          // National Permit
          nationalPermitNumber: data.national_permit_number || null,
          nationalPermitUpto: data.national_permit_upto && data.national_permit_upto !== '1900-01-01' ? data.national_permit_upto : null,
          nationalPermitIssuedBy: data.national_permit_issued_by || null,

          // Status
          nonUseStatus: null, // Not available in APIclub rc_info
          nonUseFrom: null, // Not available in APIclub rc_info
          nonUseTo: null, // Not available in APIclub rc_info
          blacklistStatus: null, // Available in rc_lite only (empty in test)
          nocDetails: data.noc_details || null,

          // Challan (not available in this endpoint)
          challanDetails: null,

          // Raw data for debugging
          rawData: data,

          // Source indicator
          _source: 'apiclub'
        });
      } else {
        const errorMsg = response.data.message || 'RC verification failed';
        logger.error(`[APIclub] RC verification failed: ${errorMsg}`);
        return Result.failure(errorMsg);
      }
    } catch (error) {
      logger.error('[APIclub] RC verification error:', error);

      // Log failed API call
      apiLogger.log({
        registrationNumber: cleanRegNum,
        apiSource: 'apiclub',
        endpoint: 'rc_info',
        request: {
          url: requestUrl,
          method: 'POST',
          headers: this.headers,
          body: requestBody
        },
        response: error.response ? {
          status: error.response.status,
          data: error.response.data,
          duration: Date.now() - startTime
        } : null,
        error: error.message
      });

      if (error.response) {
        const status = error.response.status;
        const errorData = error.response.data;

        // Map APIclub error codes
        switch (status) {
          case 400:
            return Result.failure('Invalid vehicle number format');
          case 401:
          case 403:
            return Result.failure('APIclub authentication failed');
          case 402:
            return Result.failure('APIclub insufficient funds');
          case 404:
            return Result.failure('Vehicle not found');
          case 422:
            return Result.failure('Invalid vehicle details');
          case 429:
            return Result.failure('Too many requests - rate limited');
          case 500:
          case 503:
            return Result.failure('APIclub service unavailable');
          default:
            return Result.failure(errorData?.message || 'RC verification failed');
        }
      }

      return Result.failure(error.message || 'APIclub service unavailable');
    }
  }

  /**
   * Get challan details from APIclub
   * Endpoint: POST /v1/challan_info_v2
   * Returns challan data in Surepass-compatible format
   */
  async getChallanDetailsAsync(chassisNumber, engineNumber, registrationNumber) {
    const cleanRegNum = registrationNumber.replace(/\s/g, '').toUpperCase();
    const requestUrl = `${this.baseUrl}/v1/challan_info_v2`;
    const requestBody = {
      vehicleId: cleanRegNum,
      chassis: chassisNumber || '',
      engine_no: engineNumber || ''
    };
    const startTime = Date.now();

    try {
      logger.info(`[APIclub] Challan details for: ${registrationNumber}`);

      const response = await axios.post(
        requestUrl,
        requestBody,
        {
          headers: this.headers,
          timeout: 30000
        }
      );

      // Log API call
      apiLogger.log({
        registrationNumber: cleanRegNum,
        apiSource: 'apiclub',
        endpoint: 'challan_info',
        request: {
          url: requestUrl,
          method: 'POST',
          headers: this.headers,
          body: requestBody
        },
        response: {
          status: response.status,
          data: response.data,
          duration: Date.now() - startTime
        }
      });

      if (response.data.code === 200 && response.data.status === 'success') {
        const data = response.data.response;

        logger.info(`[APIclub] Challan details successful for: ${registrationNumber}, total: ${data.total || 0}`);

        // Map APIclub challan response to Surepass-compatible format
        const challans = (data.challans || []).map(challan => ({
          challan_number: challan.challan_no,
          challan_date: challan.date,
          challan_place: challan.area || null,
          state: challan.state || null,
          rto: null, // Not available in APIclub
          offense_details: challan.offence || (challan.offence_list || []).map(o => o.offence_name).join(', '),
          accused_name: challan.accused_name || null,
          amount: challan.amount || null,
          challan_status: challan.challan_status || null,
          court_challan: null, // Not available in APIclub
          upstream_code: null, // Not available in APIclub
          // Additional APIclub fields
          offence_list: challan.offence_list || []
        }));

        return Result.success({
          challans: challans,
          totalPending: challans.filter(c => c.challan_status === 'Pending').length,
          totalAmount: challans.reduce((sum, c) => sum + (c.amount || 0), 0),
          total: data.total || challans.length,
          _source: 'apiclub'
        });
      } else {
        // Challan not found is not an error - return empty array
        logger.info(`[APIclub] No challans found for: ${registrationNumber}`);
        return Result.success({
          challans: [],
          totalPending: 0,
          totalAmount: 0,
          total: 0,
          _source: 'apiclub'
        });
      }
    } catch (error) {
      logger.error('[APIclub] Challan details error:', error.message);

      // Log failed API call
      apiLogger.log({
        registrationNumber: cleanRegNum,
        apiSource: 'apiclub',
        endpoint: 'challan_info',
        request: {
          url: requestUrl,
          method: 'POST',
          headers: this.headers,
          body: requestBody
        },
        response: error.response ? {
          status: error.response.status,
          data: error.response.data,
          duration: Date.now() - startTime
        } : null,
        error: error.message
      });

      if (error.response) {
        const status = error.response.status;

        // For 404/422, return empty challans (not an error)
        if (status === 404 || status === 422) {
          return Result.success({
            challans: [],
            totalPending: 0,
            totalAmount: 0,
            total: 0,
            _source: 'apiclub'
          });
        }

        return Result.failure(error.response.data?.message || 'Challan lookup failed');
      }

      // Return empty challans on network errors (not critical)
      return Result.success({
        challans: [],
        totalPending: 0,
        totalAmount: 0,
        total: 0,
        _source: 'apiclub'
      });
    }
  }

  /**
   * Check if APIclub service is configured and available
   */
  isConfigured() {
    return !!this.apiKey;
  }

  /**
   * Get current environment (uat/prod)
   */
  getEnvironment() {
    return this.env;
  }
}

module.exports = new ApiclubService();
