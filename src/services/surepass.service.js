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
  }

  /**
   * Verify RC (Registration Certificate) details
   */
  async verifyRCAsync(registrationNumber) {
    try {
      logger.info(`Surepass RC verification for: ${registrationNumber}`);

      const response = await axios.post(
        `${this.apiUrl}/rc/rc`,
        {
          id_number: registrationNumber.replace(/\s/g, '').toUpperCase()
        },
        { headers: this.headers }
      );

      if (response.data.success) {
        const data = response.data.data;

        return Result.success({
          verified: true,
          registrationNumber: data.rc_number,
          ownerName: data.owner_name,
          vehicleClass: data.vehicle_class,
          fuelType: data.fuel_type,
          manufacturer: data.maker_model,
          model: data.model,
          registrationDate: data.registration_date,
          registeredAt: data.registered_at,
          chassisNumber: data.chassis_number,
          engineNumber: data.engine_number,
          insuranceCompany: data.insurance_company,
          insuranceValidUpto: data.insurance_upto,
          fitnessValidUpto: data.fitness_upto,
          pucValidUpto: data.puc_upto,
          rawData: data
        });
      } else {
        return Result.failure(response.data.message || 'RC verification failed');
      }
    } catch (error) {
      logger.error('Surepass RC verification error:', error);

      if (error.response) {
        return Result.failure(error.response.data.message || 'RC verification failed');
      }

      return Result.failure(error.message || 'RC verification service unavailable');
    }
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
