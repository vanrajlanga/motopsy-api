const axios = require('axios');
const Result = require('../utils/result');
const logger = require('../config/logger');

class SurepassService {
  constructor() {
    this.apiUrl = process.env.SUREPASS_API_URL || 'https://kyc-api.surepass.io/api/v1';
    this.token = process.env.SUREPASS_TOKEN;
    this.headers = {
      'Authorization': `Bearer ${this.token}`,
      'Content-Type': 'application/json'
    };
    // Lazy load apiclub service to avoid circular dependency
    this._apiclubService = null;
  }

  /**
   * Get APIclub service instance (lazy loaded)
   */
  get apiclubService() {
    if (!this._apiclubService) {
      this._apiclubService = require('./apiclub.service');
    }
    return this._apiclubService;
  }

  /**
   * Get full RC (Registration Certificate) details
   * Uses rc-full endpoint for complete vehicle information (50+ fields)
   * Matches .NET API ISurepassService.GetRegistrationDetailsAsync()
   *
   * FAILSAFE: If Surepass fails, automatically falls back to APIclub
   */
  async getRegistrationDetailsAsync(registrationNumber) {
    // Try Surepass first
    const surepassResult = await this._getSurepassRCDetails(registrationNumber);

    if (surepassResult.isSuccess) {
      return surepassResult;
    }

    // Surepass failed - try APIclub as failsafe
    logger.warn(`[Surepass] Failed for ${registrationNumber}: ${surepassResult.error}. Trying APIclub failsafe...`);

    if (this.apiclubService.isConfigured()) {
      const apiclubResult = await this.apiclubService.getRegistrationDetailsAsync(registrationNumber);

      if (apiclubResult.isSuccess) {
        logger.info(`[Failsafe] APIclub succeeded for ${registrationNumber}`);
        return apiclubResult;
      }

      logger.error(`[Failsafe] APIclub also failed for ${registrationNumber}: ${apiclubResult.error}`);
      // Return original Surepass error if both fail
      return Result.failure(`RC verification failed. Surepass: ${surepassResult.error}. APIclub: ${apiclubResult.error}`);
    }

    logger.warn('[Failsafe] APIclub not configured, returning Surepass error');
    return surepassResult;
  }

  /**
   * Internal method to get RC details from Surepass
   * @private
   */
  async _getSurepassRCDetails(registrationNumber) {
    try {
      logger.info(`[Surepass] RC full details for: ${registrationNumber}`);

      const response = await axios.post(
        `${this.apiUrl}/rc/rc-full`,
        {
          id_number: registrationNumber.replace(/\s/g, '').toUpperCase()
        },
        {
          headers: this.headers,
          timeout: 30000
        }
      );

      if (response.data.success) {
        const data = response.data.data;

        // Map all fields from Surepass API (matches .NET VehicleRcResponse)
        return Result.success({
          clientId: data.client_id || '',
          rcNumber: data.rc_number,
          registrationDate: data.registration_date,
          ownerName: data.owner_name,
          fatherName: data.father_name || null,
          presentAddress: data.present_address || null,
          permanentAddress: data.permanent_address || null,
          mobileNumber: data.mobile_number || null,
          vehicleCategory: data.vehicle_category || null,
          vehicleChassisNumber: data.vehicle_chasi_number || null,
          vehicleEngineNumber: data.vehicle_engine_number || null,
          makerDescription: data.maker_description || null,
          makerModel: data.maker_model || null,
          bodyType: data.body_type || null,
          fuelType: data.fuel_type || null,
          color: data.color || '',
          normsType: data.norms_type || null,
          fitUpTo: data.fit_up_to || null,
          financer: data.financer || null,
          financed: data.financed || false,
          insuranceCompany: data.insurance_company || null,
          insurancePolicyNumber: data.insurance_policy_number || null,
          insuranceUpto: data.insurance_upto || null,
          manufacturingDate: data.manufacturing_date || null,
          manufacturingDateFormatted: data.manufacturing_date_formatted || null,
          registeredAt: data.registered_at || null,
          latestBy: data.latest_by || null,
          lessInfo: data.less_info || false,
          taxUpto: data.tax_upto || null,
          taxPaidUpto: data.tax_paid_upto || null,
          cubicCapacity: data.cubic_capacity || null,
          vehicleGrossWeight: data.vehicle_gross_weight || null,
          noCylinders: data.no_cylinders || null,
          seatCapacity: data.seat_capacity || null,
          sleeperCapacity: data.sleeper_capacity || null,
          standingCapacity: data.standing_capacity || null,
          wheelbase: data.wheelbase || null,
          unladenWeight: data.unladen_weight || null,
          vehicleCategoryDescription: data.vehicle_category_description || null,
          puccNumber: data.pucc_number || null,
          puccUpto: data.pucc_upto || null,
          permitNumber: data.permit_number || null,
          permitIssueDate: data.permit_issue_date || null,
          permitValidFrom: data.permit_valid_from || null,
          permitValidUpto: data.permit_valid_upto || null,
          permitType: data.permit_type || null,
          nationalPermitNumber: data.national_permit_number || null,
          nationalPermitUpto: data.national_permit_upto || null,
          nationalPermitIssuedBy: data.national_permit_issued_by || null,
          nonUseStatus: data.non_use_status || null,
          nonUseFrom: data.non_use_from || null,
          nonUseTo: data.non_use_to || null,
          blacklistStatus: data.blacklist_status || null,
          nocDetails: data.noc_details || null,
          ownerNumber: data.owner_number || null,
          rcStatus: data.rc_status || null,
          maskedName: data.masked_name || null,
          challanDetails: data.challan_details || null,
          variant: data.variant || null,
          rawData: data,
          _source: 'surepass'
        });
      } else {
        return Result.failure(response.data.message || 'RC verification failed');
      }
    } catch (error) {
      logger.error('[Surepass] RC full details error:', error.message);

      if (error.response) {
        return Result.failure(error.response.data?.message || 'RC verification failed');
      }

      if (error.code === 'ECONNABORTED' || error.code === 'ETIMEDOUT') {
        return Result.failure('Surepass service timeout');
      }

      return Result.failure(error.message || 'RC verification service unavailable');
    }
  }

  /**
   * Get challan details for a vehicle
   * Matches .NET API ISurepassService.GetChallanDetailsAsync()
   *
   * FAILSAFE: If Surepass API fails, automatically falls back to APIclub
   * If Surepass succeeds (even with empty results), we use that response
   */
  async getChallanDetailsAsync(chassisNumber, engineNumber, registrationNumber) {
    // Try Surepass first
    const surepassResult = await this._getSurepassChallanDetails(chassisNumber, engineNumber, registrationNumber);

    if (surepassResult.isSuccess) {
      // Surepass API call succeeded - use this result (even if empty)
      logger.info(`[Challan] Surepass succeeded for: ${registrationNumber}, challans: ${surepassResult.value.challans.length}`);
      return surepassResult;
    }

    // Surepass API failed - try APIclub as failsafe
    if (this.apiclubService.isConfigured()) {
      logger.info(`[Challan] Surepass failed, trying APIclub failsafe for: ${registrationNumber}`);
      const apiclubResult = await this.apiclubService.getChallanDetailsAsync(chassisNumber, engineNumber, registrationNumber);

      if (apiclubResult.isSuccess) {
        logger.info(`[Failsafe] APIclub returned ${apiclubResult.value.challans.length} challans for ${registrationNumber}`);
        return apiclubResult;
      }
    }

    // Both failed - return empty result
    return Result.success({
      challans: [],
      totalPending: 0,
      totalAmount: 0,
      _source: 'none'
    });
  }

  /**
   * Internal method to get challan details from Surepass
   * @private
   */
  async _getSurepassChallanDetails(chassisNumber, engineNumber, registrationNumber) {
    try {
      logger.info(`[Surepass] Challan details for: ${registrationNumber}`);

      const response = await axios.post(
        `${this.apiUrl}/rc/rc-related/challan-details`,
        {
          chassis_number: chassisNumber,
          engine_number: engineNumber,
          rc_number: registrationNumber.replace(/\s/g, '').toUpperCase()
        },
        {
          headers: this.headers,
          timeout: 30000
        }
      );

      if (response.data.success) {
        const data = response.data.data;
        const challanDetails = data.challan_details || {};
        const challans = challanDetails.challans || [];

        // Map Surepass challan format to our internal format
        const mappedChallans = challans.map(c => ({
          challan_number: c.challan_number,
          challan_date: c.challan_date,
          challan_place: c.challan_place,
          state: c.state,
          rto: c.rto,
          offense_details: c.offense_details,
          accused_name: c.accused_name,
          amount: c.amount,
          challan_status: c.challan_status,
          court_challan: c.court_challan,
          upstream_code: c.upstream_code
        }));

        return Result.success({
          challans: mappedChallans,
          totalPending: mappedChallans.filter(c => c.challan_status === 'Pending').length,
          totalAmount: mappedChallans.reduce((sum, c) => sum + (c.amount || 0), 0),
          _source: 'surepass'
        });
      } else {
        // Challan not found is not an error - return empty array
        return Result.success({
          challans: [],
          totalPending: 0,
          totalAmount: 0,
          _source: 'surepass'
        });
      }
    } catch (error) {
      logger.error('[Surepass] Challan details error:', error.message);
      // Return failure so failsafe can try APIclub
      return Result.failure(error.message || 'Surepass challan API failed');
    }
  }

  /**
   * Verify RC (Registration Certificate) details - basic endpoint
   * @deprecated Use getRegistrationDetailsAsync for full details
   */
  async verifyRCAsync(registrationNumber) {
    // Redirect to full details endpoint
    return this.getRegistrationDetailsAsync(registrationNumber);
  }

  /**
   * Verify DL (Driving License) details
   */
  async verifyDLAsync(dlNumber, dob) {
    try {
      logger.info(`Surepass DL verification for: ${dlNumber}`);

      const response = await axios.post(
        `${this.apiUrl}/driving-license`,
        {
          id_number: dlNumber,
          dob: dob // Format: DD-MM-YYYY
        },
        { headers: this.headers }
      );

      if (response.data.success) {
        const data = response.data.data;

        return Result.success({
          verified: true,
          dlNumber: data.dl_number,
          name: data.name,
          dob: data.dob,
          fatherName: data.father_name,
          address: data.address,
          issueDate: data.issue_date,
          validUpto: data.valid_upto,
          vehicleClasses: data.vehicle_classes,
          rawData: data
        });
      } else {
        return Result.failure(response.data.message || 'DL verification failed');
      }
    } catch (error) {
      logger.error('Surepass DL verification error:', error);

      if (error.response) {
        return Result.failure(error.response.data.message || 'DL verification failed');
      }

      return Result.failure(error.message || 'DL verification service unavailable');
    }
  }

  /**
   * Verify Aadhaar OTP (Step 1: Generate OTP)
   */
  async generateAadhaarOTPAsync(aadhaarNumber) {
    try {
      logger.info(`Surepass Aadhaar OTP generation for: ${aadhaarNumber.substring(0, 4)}****${aadhaarNumber.substring(8)}`);

      const response = await axios.post(
        `${this.apiUrl}/aadhaar-v2/generate-otp`,
        {
          id_number: aadhaarNumber
        },
        { headers: this.headers }
      );

      if (response.data.success) {
        return Result.success({
          clientId: response.data.data.client_id,
          message: 'OTP sent successfully'
        });
      } else {
        return Result.failure(response.data.message || 'Failed to generate OTP');
      }
    } catch (error) {
      logger.error('Surepass Aadhaar OTP generation error:', error);

      if (error.response) {
        return Result.failure(error.response.data.message || 'OTP generation failed');
      }

      return Result.failure(error.message || 'OTP generation service unavailable');
    }
  }

  /**
   * Verify Aadhaar OTP (Step 2: Submit OTP)
   */
  async verifyAadhaarOTPAsync(clientId, otp) {
    try {
      logger.info(`Surepass Aadhaar OTP verification for client: ${clientId}`);

      const response = await axios.post(
        `${this.apiUrl}/aadhaar-v2/submit-otp`,
        {
          client_id: clientId,
          otp: otp
        },
        { headers: this.headers }
      );

      if (response.data.success) {
        const data = response.data.data;

        return Result.success({
          verified: true,
          name: data.name,
          dob: data.dob,
          gender: data.gender,
          address: data.address,
          photo: data.photo_link,
          rawData: data
        });
      } else {
        return Result.failure(response.data.message || 'OTP verification failed');
      }
    } catch (error) {
      logger.error('Surepass Aadhaar OTP verification error:', error);

      if (error.response) {
        return Result.failure(error.response.data.message || 'OTP verification failed');
      }

      return Result.failure(error.message || 'OTP verification service unavailable');
    }
  }

  /**
   * Verify PAN Card
   */
  async verifyPANAsync(panNumber, name) {
    try {
      logger.info(`Surepass PAN verification for: ${panNumber}`);

      const response = await axios.post(
        `${this.apiUrl}/pan/pan`,
        {
          id_number: panNumber.toUpperCase(),
          name: name
        },
        { headers: this.headers }
      );

      if (response.data.success) {
        const data = response.data.data;

        return Result.success({
          verified: true,
          panNumber: data.pan_number,
          name: data.name,
          nameMatched: data.name_matched,
          category: data.category,
          rawData: data
        });
      } else {
        return Result.failure(response.data.message || 'PAN verification failed');
      }
    } catch (error) {
      logger.error('Surepass PAN verification error:', error);

      if (error.response) {
        return Result.failure(error.response.data.message || 'PAN verification failed');
      }

      return Result.failure(error.message || 'PAN verification service unavailable');
    }
  }

  /**
   * Verify Voter ID
   */
  async verifyVoterIDAsync(voterIdNumber) {
    try {
      logger.info(`Surepass Voter ID verification for: ${voterIdNumber}`);

      const response = await axios.post(
        `${this.apiUrl}/voter-id`,
        {
          id_number: voterIdNumber.toUpperCase()
        },
        { headers: this.headers }
      );

      if (response.data.success) {
        const data = response.data.data;

        return Result.success({
          verified: true,
          voterIdNumber: data.epic_number,
          name: data.name,
          dob: data.dob,
          gender: data.gender,
          state: data.state,
          constituency: data.constituency,
          rawData: data
        });
      } else {
        return Result.failure(response.data.message || 'Voter ID verification failed');
      }
    } catch (error) {
      logger.error('Surepass Voter ID verification error:', error);

      if (error.response) {
        return Result.failure(error.response.data.message || 'Voter ID verification failed');
      }

      return Result.failure(error.message || 'Voter ID verification service unavailable');
    }
  }

  /**
   * Get Vehicle Price (Ex-showroom, On-road price)
   * Uses Surepass Vehicle Price Check API
   * Input: vehicleName, model, variant, color, fuelType
   * Output: showroomPrice, onRoadPrice, taxes
   */
  async getVehiclePriceAsync(vehicleData) {
    try {
      const { vehicleName, model, variant, color, fuelType } = vehicleData;

      logger.info(`Surepass Vehicle Price Check for: ${vehicleName} ${model} ${variant}`);

      const response = await axios.post(
        `${this.apiUrl}/vehicle-price-check`,
        {
          vehicle_name: vehicleName,
          model: model,
          variant: variant,
          color: color || '',
          fuel_type: fuelType || ''
        },
        {
          headers: this.headers,
          timeout: 30000
        }
      );

      if (response.data.success) {
        const data = response.data.data;

        return Result.success({
          vehicleName: data.vehicle_name || vehicleName,
          model: data.model || model,
          variant: data.variant || variant,
          exShowroomPrice: data.ex_showroom_price || data.showroom_price || null,
          onRoadPrice: data.on_road_price || null,
          roadTax: data.road_tax || null,
          insurance: data.insurance || null,
          otherCharges: data.other_charges || null,
          rawData: data
        });
      } else {
        logger.warn(`Surepass Vehicle Price Check failed: ${response.data.message}`);
        return Result.failure(response.data.message || 'Vehicle price check failed');
      }
    } catch (error) {
      logger.error('Surepass Vehicle Price Check error:', error.response?.data || error.message);

      if (error.response) {
        return Result.failure(error.response.data?.message || 'Vehicle price check failed');
      }

      return Result.failure(error.message || 'Vehicle price check service unavailable');
    }
  }

  /**
   * Bank Account Verification
   */
  async verifyBankAccountAsync(accountNumber, ifscCode) {
    try {
      logger.info(`Surepass Bank Account verification for: ${accountNumber}`);

      const response = await axios.post(
        `${this.apiUrl}/bank-verification`,
        {
          account_number: accountNumber,
          ifsc: ifscCode.toUpperCase()
        },
        { headers: this.headers }
      );

      if (response.data.success) {
        const data = response.data.data;

        return Result.success({
          verified: true,
          accountNumber: data.account_number,
          accountName: data.account_name,
          ifscCode: data.ifsc,
          bankName: data.bank_name,
          branchName: data.branch_name,
          rawData: data
        });
      } else {
        return Result.failure(response.data.message || 'Bank account verification failed');
      }
    } catch (error) {
      logger.error('Surepass Bank Account verification error:', error);

      if (error.response) {
        return Result.failure(error.response.data.message || 'Bank account verification failed');
      }

      return Result.failure(error.message || 'Bank account verification service unavailable');
    }
  }
}

module.exports = new SurepassService();
