const axios = require('axios');
const Result = require('../utils/result');
const logger = require('../config/logger');

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
    try {
      logger.info(`[APIclub] RC verification for: ${registrationNumber}`);

      const response = await axios.post(
        `${this.baseUrl}/v1/rc_info`,
        {
          vehicleId: registrationNumber.replace(/\s/g, '').toUpperCase()
        },
        {
          headers: this.headers,
          timeout: 30000
        }
      );

      if (response.data.code === 200 && response.data.status === 'success') {
        const data = response.data.response;

        logger.info(`[APIclub] RC verification successful for: ${registrationNumber}`);

        // Map APIclub response to Surepass-compatible format
        return Result.success({
          // Basic Info
          clientId: data.request_id || '',
          rcNumber: data.license_plate,
          registrationDate: data.registration_date,
          rcStatus: data.rc_status,

          // Owner Details
          ownerName: data.owner_name,
          fatherName: data.father_name || null,
          ownerNumber: data.owner_count || null,
          maskedName: null, // Not available in APIclub
          mobileNumber: null, // Not available in APIclub

          // Address
          presentAddress: data.present_address || null,
          permanentAddress: data.permanent_address || null,
          registeredAt: null, // Not available in APIclub

          // Vehicle Identity
          vehicleChassisNumber: data.chassis_number,
          vehicleEngineNumber: data.engine_number,
          variant: null, // Not available in APIclub

          // Vehicle Specs
          makerDescription: data.brand_name,
          makerModel: data.brand_model,
          bodyType: null, // Not available in APIclub
          fuelType: data.fuel_type,
          color: data.color || '',
          normsType: data.norms || null,

          // Capacity & Weight
          cubicCapacity: data.cubic_capacity,
          vehicleGrossWeight: data.gross_weight,
          noCylinders: data.cylinders,
          seatCapacity: data.seating_capacity,
          sleeperCapacity: null, // Not available in APIclub
          standingCapacity: null, // Not available in APIclub
          unladenWeight: null, // Not available in APIclub
          wheelbase: null, // Not available in APIclub

          // Category
          vehicleCategory: data.class,
          vehicleCategoryDescription: data.class,

          // Manufacturing & Age
          // APIclub doesn't provide manufacturing date, estimate from registration date
          // Vehicles are typically manufactured 1-3 months before registration
          manufacturingDate: this._estimateManufacturingDate(data.registration_date),
          manufacturingDateFormatted: this._estimateManufacturingDateFormatted(data.registration_date),
          vehicleAge: data.vehicle_age || null, // Pre-calculated by APIclub (if available)

          // Fitness
          fitUpTo: null, // Not available in APIclub
          latestBy: null, // Not available in APIclub
          lessInfo: false,

          // Finance
          financer: data.financer || null,
          financed: data.is_financed === 'YES' || data.is_financed === 'true' || !!data.financer,

          // Insurance
          insuranceCompany: data.insurance_company || null,
          insurancePolicyNumber: data.insurance_policy || null,
          insuranceUpto: data.insurance_expiry || null,

          // Tax
          taxUpto: data.tax_upto !== '1900-01-01' ? data.tax_upto : null,
          taxPaidUpto: data.tax_paid_upto || null,

          // PUCC
          puccNumber: data.pucc_number || null,
          puccUpto: data.pucc_upto || null,

          // Permit
          permitNumber: data.permit_number || null,
          permitIssueDate: data.permit_issue_date !== '1900-01-01' ? data.permit_issue_date : null,
          permitValidFrom: data.permit_valid_from !== '1900-01-01' ? data.permit_valid_from : null,
          permitValidUpto: data.permit_valid_upto !== '1900-01-01' ? data.permit_valid_upto : null,
          permitType: data.permit_type || null,

          // National Permit
          nationalPermitNumber: data.national_permit_number || null,
          nationalPermitUpto: data.national_permit_upto !== '1900-01-01' ? data.national_permit_upto : null,
          nationalPermitIssuedBy: data.national_permit_issued_by || null,

          // Status
          nonUseStatus: null, // Not available in APIclub
          nonUseFrom: null, // Not available in APIclub
          nonUseTo: null, // Not available in APIclub
          blacklistStatus: null, // Not available in APIclub
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
    try {
      logger.info(`[APIclub] Challan details for: ${registrationNumber}`);

      const response = await axios.post(
        `${this.baseUrl}/v1/challan_info_v2`,
        {
          vehicleId: registrationNumber.replace(/\s/g, '').toUpperCase(),
          chassis: chassisNumber || '',
          engine_no: engineNumber || ''
        },
        {
          headers: this.headers,
          timeout: 30000
        }
      );

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
   * Estimate manufacturing date from registration date
   * Vehicles are typically manufactured 2 months before registration
   * @private
   */
  _estimateManufacturingDate(registrationDate) {
    if (!registrationDate) return null;
    try {
      const regDate = new Date(registrationDate);
      if (isNaN(regDate.getTime())) return null;
      regDate.setMonth(regDate.getMonth() - 2);
      return regDate.toISOString().split('T')[0]; // YYYY-MM-DD format
    } catch (e) {
      return null;
    }
  }

  /**
   * Estimate manufacturing date formatted (MM/YYYY) from registration date
   * Used for vehicle age calculation
   * @private
   */
  _estimateManufacturingDateFormatted(registrationDate) {
    if (!registrationDate) return null;
    try {
      const regDate = new Date(registrationDate);
      if (isNaN(regDate.getTime())) return null;
      regDate.setMonth(regDate.getMonth() - 2);
      const month = String(regDate.getMonth() + 1).padStart(2, '0');
      const year = regDate.getFullYear();
      return `${month}/${year}`; // MM/YYYY format (e.g., "09/2012")
    } catch (e) {
      return null;
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
