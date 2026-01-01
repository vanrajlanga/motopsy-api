const VehicleDetail = require('../models/vehicle-detail.model');
const VehicleDetailRequest = require('../models/vehicle-detail-request.model');
const PaymentHistory = require('../models/payment-history.model');
const User = require('../models/user.model');
const VehicleChallanDetail = require('../models/vehicle-challan-detail.model');
const NcrbReport = require('../models/ncrb-report.model');
const StateMapping = require('../models/state-mapping.model');
const UserVehicleDetail = require('../models/user-vehicle-detail.model');
const LostVehicle = require('../models/lost-vehicle.model');
const VehicleSpecification = require('../models/vehicle-specification.model');
const { sequelize } = require('../config/database');
const Result = require('../utils/result');
const logger = require('../config/logger');
const surepassService = require('./surepass.service');
const resaleValueService = require('./resale-value.service');

class VehicleDetailService {
  /**
   * Transform vehicle detail request to FailedVehicleDetailRequestDto
   * Used for pending and failed reports
   */
  transformFailedVehicleDetailRequest(request, user, paymentHistory) {
    return {
      id: request.id,
      userId: request.payment_history_id ? paymentHistory?.user_id : user?.id,
      emailAddress: user?.email || '',
      phoneNumber: user?.phone_number || '',
      paymentDate: paymentHistory?.payment_date || request.created_at,
      registrationNumber: request.registration_number,
      make: request.make,
      model: request.model,
      year: request.year,
      trim: request.trim,
      kmsDriven: request.kms_driven,
      city: request.city,
      noOfOwners: request.no_of_owners,
      version: request.version,
      transactionType: request.transaction_type,
      customerType: request.customer_type
    };
  }

  /**
   * Mask sensitive string data - matches .NET HideSensitiveStringHelper
   * Shows first 5 and last 5 characters, masks the middle
   */
  maskSensitiveString(str) {
    if (!str || str.length <= 10) return str;
    const first = str.substring(0, 5);
    const last = str.substring(str.length - 5);
    const masked = '*'.repeat(Math.min(str.length - 10, 10));
    return `${first}${masked}${last}`;
  }

  /**
   * Transform vehicle detail from database format (snake_case) to API format (camelCase)
   * Matches .NET API VehicleDetailDto response format with sensitive data masking
   * @param {Object} vehicleDetail - Vehicle detail from database
   * @param {boolean} isAdmin - Whether user is admin (skip masking if true)
   */
  transformVehicleDetail(vehicleDetail, isAdmin = false) {
    if (!vehicleDetail) return null;

    const data = vehicleDetail.toJSON ? vehicleDetail.toJSON() : vehicleDetail;

    console.log('DEBUG - transformVehicleDetail:', {
      isAdmin,
      ownerName: data.owner_name,
      shouldMask: !isAdmin
    });

    // Mask sensitive fields only if user is NOT admin
    const maskedOwnerName = isAdmin ? data.owner_name : this.maskSensitiveString(data.owner_name);
    const maskedFatherName = isAdmin ? data.father_name : this.maskSensitiveString(data.father_name);
    const maskedPresentAddress = isAdmin ? data.present_address : this.maskSensitiveString(data.present_address);
    const maskedPermanentAddress = isAdmin ? data.permanent_address : this.maskSensitiveString(data.permanent_address);
    const maskedMobileNumber = isAdmin
      ? data.mobile_number
      : (data.mobile_number ? data.mobile_number.substring(0, 2) + '******' + data.mobile_number.slice(-2) : null);

    return {
      id: data.id,
      clientId: data.client_id || '',
      rcNumber: data.registration_number,
      registrationDate: data.registration_date,
      ownerName: maskedOwnerName,
      fatherName: maskedFatherName || null,
      presentAddress: maskedPresentAddress || null,
      permanentAddress: maskedPermanentAddress || null,
      mobileNumber: maskedMobileNumber || null,
      vehicleCategory: data.vehicle_category || null,
      vehicleChassisNumber: data.chassis_number,
      vehicleEngineNumber: data.engine_number,
      makerDescription: data.maker_description || data.manufacturer || null,
      makerModel: data.maker_model || data.model || null,
      bodyType: data.body_type || null,
      fuelType: data.fuel_type,
      color: data.color || '',
      normsType: data.norms_type || null,
      fitUpTo: data.fit_up_to || '',
      financer: data.financer || null,
      financed: data.financed || false,
      insuranceCompany: data.insurance_company || null,
      insurancePolicyNumber: data.insurance_policy_number || null,
      insuranceUpto: data.insurance_valid_upto || null,
      manufacturingDate: data.manufacturing_date || null,
      manufacturingDateFormatted: data.manufacturing_date_formatted || null,
      registeredAt: data.registered_at || null,
      latestBy: data.latest_by || null,
      lessInfo: data.less_info || null,
      taxUpto: data.tax_upto || null,
      taxPaidUpto: data.tax_paid_upto || null,
      cubicCapacity: data.cubic_capacity || '',
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
      ownerNumber: data.owner_number || '',
      rcStatus: data.rc_status || null,
      maskedName: data.masked_name || '',
      challanDetails: data.challan_details || null,
      variant: data.variant || null
    };
  }
  /**
   * Get vehicle details by registration number (RC number)
   * This would normally call external API (Surepass/Droom)
   * Matches .NET API GetVehicleDetailsByRcNumberRequest format
   * @param {Object} request - The request object with vehicle details
   * @param {string} userEmail - User email from auth context (matches .NET User.Identity.Name)
   */
  async getVehicleDetailsByRCAsync(request, userEmail) {
    try {
      const {
        registrationNumber,
        make,
        model,
        version,
        vehicleDetailRequestId,
        userId,
        kmsDriven  // Only field needed from frontend for OBV calculation
      } = request;

      if (!registrationNumber) {
        return Result.failure('Registration number is required');
      }

      // Get user - matches .NET logic: if userId not provided, get user from email
      let user;
      if (!userId || userId === 0) {
        user = await User.findOne({
          where: { normalized_email: userEmail.toUpperCase() }
        });
      } else {
        user = await User.findByPk(userId);
      }

      if (!user) {
        return Result.failure('User not found');
      }

      const resolvedUserId = user.id;

      // Always call Surepass API to fetch fresh RC details (no caching)
      const rcResult = await surepassService.getRegistrationDetailsAsync(registrationNumber);

      if (!rcResult.isSuccess) {
        return Result.failure(rcResult.error);
      }

      // Save vehicle details to database with ALL fields from Surepass
      const rcData = rcResult.value;
      const maxVehicle = await VehicleDetail.findOne({
        attributes: [[sequelize.fn('MAX', sequelize.col('id')), 'maxId']],
        raw: true
      });
      const nextId = (maxVehicle && maxVehicle.maxId) ? maxVehicle.maxId + 1 : 1;

      // Parse registration date
      let registrationDate = null;
      if (rcData.registrationDate) {
        try {
          registrationDate = new Date(rcData.registrationDate);
          if (isNaN(registrationDate.getTime())) {
            registrationDate = null;
          }
        } catch (e) {
          registrationDate = null;
        }
      }

      let vehicleDetail = await VehicleDetail.create({
        id: nextId,
        user_id: resolvedUserId,
        vehicle_detail_request_id: vehicleDetailRequestId || null,
        // All Surepass rc-full fields
        client_id: rcData.clientId,
        registration_number: rcData.rcNumber,
        registration_date: registrationDate,
        owner_name: rcData.ownerName,
        father_name: rcData.fatherName,
        present_address: rcData.presentAddress,
        permanent_address: rcData.permanentAddress,
        mobile_number: rcData.mobileNumber,
        vehicle_category: rcData.vehicleCategory,
        chassis_number: rcData.vehicleChassisNumber,
        engine_number: rcData.vehicleEngineNumber,
        maker_description: rcData.makerDescription,
        maker_model: rcData.makerModel,
        // Also set legacy fields for backward compatibility
        manufacturer: rcData.makerDescription,
        model: rcData.makerModel,
        body_type: rcData.bodyType,
        fuel_type: rcData.fuelType,
        color: rcData.color,
        norms_type: rcData.normsType,
        fit_up_to: rcData.fitUpTo,
        financer: rcData.financer,
        financed: rcData.financed,
        insurance_company: rcData.insuranceCompany,
        insurance_policy_number: rcData.insurancePolicyNumber,
        insurance_valid_upto: rcData.insuranceUpto,
        manufacturing_date: rcData.manufacturingDate,
        manufacturing_date_formatted: rcData.manufacturingDateFormatted,
        registered_at: rcData.registeredAt,
        latest_by: rcData.latestBy,
        less_info: rcData.lessInfo,
        tax_upto: rcData.taxUpto,
        tax_paid_upto: rcData.taxPaidUpto,
        cubic_capacity: rcData.cubicCapacity,
        vehicle_gross_weight: rcData.vehicleGrossWeight,
        no_cylinders: rcData.noCylinders,
        seat_capacity: rcData.seatCapacity,
        sleeper_capacity: rcData.sleeperCapacity,
        standing_capacity: rcData.standingCapacity,
        wheelbase: rcData.wheelbase,
        unladen_weight: rcData.unladenWeight,
        vehicle_category_description: rcData.vehicleCategoryDescription,
        pucc_number: rcData.puccNumber,
        pucc_upto: rcData.puccUpto,
        permit_number: rcData.permitNumber,
        permit_issue_date: rcData.permitIssueDate,
        permit_valid_from: rcData.permitValidFrom,
        permit_valid_upto: rcData.permitValidUpto,
        permit_type: rcData.permitType,
        national_permit_number: rcData.nationalPermitNumber,
        national_permit_upto: rcData.nationalPermitUpto,
        national_permit_issued_by: rcData.nationalPermitIssuedBy,
        non_use_status: rcData.nonUseStatus,
        non_use_from: rcData.nonUseFrom,
        non_use_to: rcData.nonUseTo,
        blacklist_status: rcData.blacklistStatus,
        noc_details: rcData.nocDetails,
        owner_number: rcData.ownerNumber,
        rc_status: rcData.rcStatus,
        masked_name: rcData.maskedName,
        challan_details: rcData.challanDetails,
        variant: rcData.variant,
        kms_driven: kmsDriven ? parseInt(kmsDriven) : null,
        status: 'Completed',
        api_source: rcData._source || 'unknown',
        created_at: new Date()
      });

      logger.info(`Vehicle details fetched and saved with all fields: ${registrationNumber}`);

      // Also fetch and save challan details
      if (rcData.vehicleChassisNumber && rcData.vehicleEngineNumber) {
        try {
          const challanResult = await surepassService.getChallanDetailsAsync(
            rcData.vehicleChassisNumber,
            rcData.vehicleEngineNumber,
            registrationNumber
          );
          if (challanResult.isSuccess && challanResult.value.challans.length > 0) {
            const challanApiSource = challanResult.value._source || 'unknown';
            await this.saveChallanDetails(vehicleDetail.id, challanResult.value.challans, challanApiSource);
          }
        } catch (challanError) {
          logger.error('Error fetching challan details:', challanError);
          // Continue without challans - not critical
        }
      }

      // Return full response matching frontend expectations
      return Result.success(await this.buildVehicleDetailResponse(vehicleDetail, resolvedUserId, kmsDriven));
    } catch (error) {
      logger.error('Get vehicle details error:', error.message || error);
      return Result.failure(error.message || 'Failed to get vehicle details');
    }
  }

  /**
   * Build full vehicle detail response with all related data
   * Used by both getVehicleDetailsByRCAsync and getVehicleDetailByIdAsync
   * Now includes OBV (Orange Book Value) calculation - merged from obv.service.js
   * @param {Object} vehicleDetail - Vehicle detail from database
   * @param {number} userId - User ID
   * @param {number} kmsDriven - Kilometers driven (optional, from frontend)
   * @param {boolean} isAdmin - Whether user is admin (skip masking if true)
   */
  async buildVehicleDetailResponse(vehicleDetail, userId, kmsDriven = null, isAdmin = false) {
    const vehicleDetailId = vehicleDetail.id;

    // Get challan details for this vehicle
    const challanDetails = await VehicleChallanDetail.findAll({
      where: { vehicle_detail_id: vehicleDetailId },
      order: [['challan_date', 'DESC']]
    });

    // Check if vehicle is lost
    const lostVehicle = await LostVehicle.findOne({
      where: { registration_number: vehicleDetail.registration_number }
    });

    // Get NCRB report if exists
    const ncrbReport = await NcrbReport.findOne({
      where: { vehicle_detail_id: vehicleDetailId }
    });

    // Get state from registration number
    const stateCode = vehicleDetail.registration_number ? vehicleDetail.registration_number.substring(0, 2) : '';
    const stateMapping = await StateMapping.findOne({
      where: { state_code: stateCode }
    });

    // Get user vehicle detail for createdAt timestamp
    const userVehicleDetail = await UserVehicleDetail.findOne({
      where: { vehicle_detail_id: vehicleDetailId, user_id: userId }
    });

    // Calculate vehicle age from ManufacturingDateFormatted
    const vehicleAge = this.calculateVehicleAge(vehicleDetail.manufacturing_date_formatted);

    // Get vehicle specification using smart matching
    // Now ALWAYS uses make, model, version from API response (Surepass/APIclub)
    // instead of frontend input for consistency
    let vehicleSpecification = await this.findVehicleSpecification(vehicleDetail);

    // Transform challan details to match frontend ChallanDetailsInterface
    const transformedChallans = challanDetails.map(challan => ({
      id: challan.id,
      challanNumber: challan.challan_number,
      challanDate: challan.challan_date,
      offenseDetails: challan.offense_details || challan.violation_type,
      amount: challan.amount ? parseFloat(challan.amount) : null,
      challanStatus: challan.status
    }));

    // Transform vehicle specification to match frontend VehicleSpecificationInterface (92+ fields)
    const transformedSpec = vehicleSpecification ? this.transformVehicleSpecification(vehicleSpecification) : null;

    // ========== OBV (Orange Book Value) Calculation ==========
    // Merged from obv.service.js - calculates resale value in same API call
    let priceRange = null;
    let resaleDataMissing = false;
    let resaleCalculationSource = null;
    let missingFields = [];
    let availableData = {};

    try {
      // Check if user has already provided resale data manually
      if (vehicleDetail.resale_calculation_source === 'user' && vehicleDetail.resale_price_range) {
        // Use the saved user-provided resale calculation
        priceRange = typeof vehicleDetail.resale_price_range === 'string'
          ? JSON.parse(vehicleDetail.resale_price_range)
          : vehicleDetail.resale_price_range;
        resaleCalculationSource = 'user';
        logger.info(`Using user-provided resale data for vehicle ${vehicleDetail.id}`);
      } else {
        // Extract make, model, year from API response
        const make = this.extractMakeFromDescription(vehicleDetail.maker_description || vehicleDetail.manufacturer);
        const model = this.extractModelFromDescription(vehicleDetail.maker_model || vehicleDetail.model);
        const year = this.extractYearFromManufacturingDate(vehicleDetail.manufacturing_date_formatted);
        const noOfOwners = vehicleDetail.owner_number || '1';

        // Track available data for frontend
        if (make) availableData.make = make;
        if (model) availableData.model = model;
        if (year) availableData.year = year;

        // Track missing fields
        if (!make) missingFields.push('make');
        if (!model) missingFields.push('model');
        if (!year) missingFields.push('year');

        if (make && model && year) {
          // Get ex-showroom price from VehicleSpecification table
          let originalPrice = await this.lookupExShowroomPrice(make, model, vehicleDetail.variant);

          if (originalPrice) {
            availableData.exShowroomPrice = originalPrice;

            // Calculate resale value using resaleValueService
            const resaleResult = resaleValueService.calculateResaleValue({
              originalPrice: originalPrice,
              make: make,
              year: year,
              kmsDriven: kmsDriven ? parseInt(kmsDriven) : null,
              state: stateMapping ? stateMapping.state_name : null,
              stateCode: stateCode,
              city: stateMapping ? stateMapping.state_capital : null,
              noOfOwners: noOfOwners
            });

            if (resaleResult.isSuccess) {
              priceRange = resaleResult.value;
              resaleCalculationSource = 'system';
              logger.info(`OBV calculated for ${make} ${model}: Good range ₹${priceRange.Good.range_from} - ₹${priceRange.Good.range_to}`);
            } else {
              resaleDataMissing = true;
              missingFields.push('calculationFailed');
            }
          } else {
            resaleDataMissing = true;
            missingFields.push('exShowroomPrice');
            logger.info(`No ex-showroom price found for ${make} ${model}, skipping OBV calculation`);
          }
        } else {
          resaleDataMissing = true;
        }
      }
    } catch (obvError) {
      logger.error('Error calculating OBV:', obvError);
      resaleDataMissing = true;
      missingFields.push('error');
      // Continue without OBV - not critical
    }

    // Return response matching frontend expectations
    return {
      vehicleDetail: this.transformVehicleDetail(vehicleDetail, isAdmin),
      vehicleChallanDetails: transformedChallans,
      vehicleSpecification: transformedSpec,
      ncrbReportAvailable: ncrbReport !== null,
      ncrbReportId: ncrbReport ? ncrbReport.id : null,
      lostVehicle: lostVehicle !== null,
      createdAt: userVehicleDetail ? userVehicleDetail.created_at : vehicleDetail.created_at,
      vehicleAge: vehicleAge,
      state: stateMapping ? stateMapping.state_name : '',
      // OBV data - new field merged from /api/obv/enterprise-used-price-range
      priceRange: priceRange,
      // Resale calculation metadata
      resaleDataMissing: resaleDataMissing,
      resaleCalculationSource: resaleCalculationSource,
      missingFields: missingFields.length > 0 ? missingFields : null,
      availableData: Object.keys(availableData).length > 0 ? availableData : null
    };
  }

  /**
   * Lookup ex-showroom price from VehicleSpecification table
   * @param {string} make - Vehicle make (e.g., "Kia")
   * @param {string} model - Vehicle model (e.g., "Seltos")
   * @param {string} variant - Vehicle variant (optional)
   */
  async lookupExShowroomPrice(make, model, variant = null) {
    try {
      const { Op } = require('sequelize');

      // Helper to find specs with any price field
      const findSpecs = async (makeCondition, modelCondition) => {
        // Try price_breakdown_ex_showroom_price first
        let specs = await VehicleSpecification.findAll({
          where: {
            naming_make: makeCondition,
            naming_model: modelCondition,
            price_breakdown_ex_showroom_price: {
              [Op.and]: [{ [Op.ne]: null }, { [Op.ne]: '' }]
            }
          },
          limit: 10,
          order: [['id', 'DESC']]
        });

        // If not found, try keydata_key_price (contains prices like "Rs. 36.96 Lakh")
        if (specs.length === 0) {
          specs = await VehicleSpecification.findAll({
            where: {
              naming_make: makeCondition,
              naming_model: modelCondition,
              keydata_key_price: {
                [Op.and]: [{ [Op.ne]: null }, { [Op.ne]: '' }]
              }
            },
            limit: 10,
            order: [['id', 'DESC']]
          });
        }

        return specs;
      };

      // Step 1: Try EXACT model match first
      let specs = await findSpecs({ [Op.like]: `%${make}%` }, model);

      // Step 2: If no exact match, try model at START
      if (specs.length === 0) {
        specs = await findSpecs({ [Op.like]: `%${make}%` }, { [Op.like]: `${model}%` });
      }

      // Step 3: Fallback to contains match
      if (specs.length === 0) {
        specs = await findSpecs({ [Op.like]: `%${make}%` }, { [Op.like]: `%${model}%` });
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
        return null;
      }

      // Get the first matching spec's price
      // Prefer keydata_key_price (variant-specific) over price_breakdown_ex_showroom_price (base model price)
      const spec = specs[0];
      let price = this.parsePriceString(spec.keydata_key_price);
      if (!price) {
        price = this.parsePriceString(spec.price_breakdown_ex_showroom_price);
      }
      return price;
    } catch (error) {
      logger.error('Error looking up ex-showroom price:', error);
      return null;
    }
  }

  /**
   * Parse price string to number
   * Handles formats: "₹ 10,49,000.00", "Rs. 10,00,000", "Rs. 36.96 Lakh", "Rs. 1.50 Crore"
   */
  parsePriceString(priceStr) {
    if (!priceStr) return null;

    const upperStr = priceStr.toUpperCase();

    // Handle "Lakh" format: "Rs. 36.96 Lakh" -> 3696000
    if (upperStr.includes('LAKH')) {
      // Match numbers like 36.96 or 36 (digit followed by optional decimal)
      const match = priceStr.match(/\d+\.?\d*/);
      if (match) {
        const lakhValue = parseFloat(match[0]);
        return isNaN(lakhValue) ? null : Math.round(lakhValue * 100000);
      }
    }

    // Handle "Crore" format: "Rs. 1.50 Crore" -> 15000000
    if (upperStr.includes('CRORE')) {
      const match = priceStr.match(/\d+\.?\d*/);
      if (match) {
        const croreValue = parseFloat(match[0]);
        return isNaN(croreValue) ? null : Math.round(croreValue * 10000000);
      }
    }

    // Handle regular format: "₹ 10,49,000.00" or "Rs. 10,00,000"
    let cleanedPrice = priceStr
      .replace(/[₹?]/g, '')
      .replace(/Rs\.?/gi, '')
      .replace(/\s/g, '')
      .replace(/,/g, '')
      .trim();

    const price = parseFloat(cleanedPrice);
    return isNaN(price) ? null : Math.round(price);
  }

  /**
   * Get vehicle detail by ID and user ID
   * Returns VehicleHistoryReportDetailDto matching .NET API
   */
  async getVehicleDetailByIdAsync(id, userId, isAdmin = false) {
    try {
      // Get vehicle detail by ID (not restricted by userId in .NET)
      const vehicleDetail = await VehicleDetail.findByPk(id);

      if (!vehicleDetail) {
        return Result.failure('Vehicle detail not found');
      }

      // Use stored kms_driven for consistent OBV calculation
      const kmsDriven = vehicleDetail.kms_driven;

      // Build the response using shared method with stored kmsDriven
      const response = await this.buildVehicleDetailResponse(vehicleDetail, userId, kmsDriven, isAdmin);

      return Result.success(response);
    } catch (error) {
      logger.error('Get vehicle detail by ID error:', error);
      return Result.failure(error.message || 'Failed to get vehicle detail');
    }
  }

  /**
   * Save challan details from Surepass/APIclub API
   * Matches .NET ChallanService.SaveChallanDetailsAsync
   */
  async saveChallanDetails(vehicleDetailId, challans, apiSource = 'unknown') {
    try {
      for (const challan of challans) {
        // Check if challan already exists
        const existing = await VehicleChallanDetail.findOne({
          where: {
            vehicle_detail_id: vehicleDetailId,
            challan_number: challan.challan_number
          }
        });

        if (!existing) {
          const maxChallan = await VehicleChallanDetail.findOne({
            attributes: [[sequelize.fn('MAX', sequelize.col('id')), 'maxId']],
            raw: true
          });
          const nextId = (maxChallan && maxChallan.maxId) ? maxChallan.maxId + 1 : 1;

          await VehicleChallanDetail.create({
            id: nextId,
            vehicle_detail_id: vehicleDetailId,
            challan_number: challan.challan_number,
            challan_date: challan.challan_date,
            challan_place: challan.challan_place,
            state: challan.state,
            rto: challan.rto,
            offense_details: challan.offense_details,
            accused_name: challan.accused_name,
            amount: challan.amount,
            status: challan.challan_status,
            court_challan: challan.court_challan,
            upstream_code: challan.upstream_code,
            api_source: apiSource,
            created_at: new Date()
          });
        }
      }
      logger.info(`Saved ${challans.length} challan details for vehicle ${vehicleDetailId} (source: ${apiSource})`);
    } catch (error) {
      logger.error('Error saving challan details:', error);
    }
  }

  /**
   * Calculate vehicle age from manufacturing date formatted string
   * Matches .NET GetCurrentAgeOfVehicle method
   */
  calculateVehicleAge(manufacturingDateFormatted) {
    if (!manufacturingDateFormatted) {
      return '';
    }

    try {
      // Parse date - format could be "MM/YYYY" or similar
      let manufacturingDate;
      if (manufacturingDateFormatted.includes('/')) {
        const parts = manufacturingDateFormatted.split('/');
        if (parts.length === 2) {
          // MM/YYYY format
          manufacturingDate = new Date(parseInt(parts[1]), parseInt(parts[0]) - 1, 1);
        }
      } else {
        manufacturingDate = new Date(manufacturingDateFormatted);
      }

      if (isNaN(manufacturingDate.getTime())) {
        return '';
      }

      const now = new Date();
      let years = now.getFullYear() - manufacturingDate.getFullYear();
      let months = now.getMonth() - manufacturingDate.getMonth();

      if (months < 0) {
        years--;
        months += 12;
      }

      if (years > 0 && months > 0) {
        return `${years} year${years > 1 ? 's' : ''} ${months} month${months > 1 ? 's' : ''}`;
      } else if (years > 0) {
        return `${years} year${years > 1 ? 's' : ''}`;
      } else if (months > 0) {
        return `${months} month${months > 1 ? 's' : ''}`;
      }
      return '';
    } catch (error) {
      logger.error('Error calculating vehicle age:', error);
      return '';
    }
  }

  /**
   * Get failed vehicle detail reports (admin only)
   * Returns FailedVehicleDetailRequestDto[] for paid requests that failed
   */
  async getPaidVehicleDetailFailedReportsAsync() {
    try {
      // Get vehicle detail requests where payment succeeded but report generation failed
      const failedRequests = await VehicleDetailRequest.findAll({
        include: [{
          model: PaymentHistory,
          as: 'PaymentHistory',
          where: { status: 1 }, // Successful payment
          required: true
        }],
        where: sequelize.literal('NOT EXISTS (SELECT 1 FROM vehicle_details vd WHERE vd.vehicle_detail_request_id = vehicle_detail_requests.id)'),
        order: [['created_at', 'DESC']],
        limit: 100
      });

      // Get user data for each request
      const transformedRequests = await Promise.all(failedRequests.map(async (request) => {
        const paymentHistory = request.PaymentHistory;
        const user = await User.findByPk(paymentHistory.user_id);
        return this.transformFailedVehicleDetailRequest(request, user, paymentHistory);
      }));

      return Result.success(transformedRequests);
    } catch (error) {
      logger.error('Get failed reports error:', error);
      return Result.failure(error.message || 'Failed to get failed reports');
    }
  }

  /**
   * Get pending vehicle detail reports for a user
   * Returns FailedVehicleDetailRequestDto[] for pending requests
   */
  async getPendingReportsAsync(userEmail) {
    try {
      // Find user
      const user = await User.findOne({
        where: { normalized_email: userEmail.toUpperCase() }
      });

      if (!user) {
        return Result.failure('User not found');
      }

      // Get pending vehicle detail requests for this user
      const pendingRequests = await VehicleDetailRequest.findAll({
        include: [{
          model: PaymentHistory,
          as: 'PaymentHistory',
          where: { user_id: user.id },
          required: true
        }],
        where: sequelize.literal('NOT EXISTS (SELECT 1 FROM vehicle_details vd WHERE vd.vehicle_detail_request_id = vehicle_detail_requests.id)'),
        order: [['created_at', 'DESC']],
        limit: 100
      });

      const transformedRequests = pendingRequests.map(request => {
        return this.transformFailedVehicleDetailRequest(request, user, request.PaymentHistory);
      });

      return Result.success(transformedRequests);
    } catch (error) {
      logger.error('Get pending reports error:', error);
      return Result.failure(error.message || 'Failed to get pending reports');
    }
  }
  /**
   * Find vehicle specification using smart matching
   * Matches .NET VehicleSpecificationRepository.GetVehicleSpecificationByVehicleDetails
   * Now ALWAYS extracts make, model, version from vehicleDetail (Surepass/APIclub response)
   * instead of relying on frontend input for consistency
   * @param {Object} vehicleDetail - Vehicle detail with maker_description/maker_model
   */
  async findVehicleSpecification(vehicleDetail) {
    try {
      const { Op } = require('sequelize');

      if (!vehicleDetail) {
        logger.info('Cannot find specification: vehicleDetail not provided');
        return null;
      }

      // ALWAYS extract make, model, version from API response (Surepass/APIclub)
      // This ensures consistency regardless of what user fills in modal

      // Extract make from maker_description (e.g., "KIA INDIA PRIVATE LIMITED" -> "Kia")
      const makerDesc = vehicleDetail.maker_description || vehicleDetail.manufacturer || '';
      const make = this.extractMakeFromDescription(makerDesc);

      // Extract model from maker_model (e.g., "SELTOS G1.5 6MT HTE" -> "Seltos")
      const makerModel = vehicleDetail.maker_model || vehicleDetail.model || '';
      const model = this.extractModelFromDescription(makerModel);

      // Extract version from maker_model (e.g., "SELTOS G1.5 6MT HTE" -> "G1.5 6MT HTE")
      const version = this.extractVersionFromDescription(makerModel);

      // Extract year from manufacturing date for potential future use
      const year = this.extractYearFromManufacturingDate(vehicleDetail.manufacturing_date_formatted);

      if (!make || !model) {
        logger.info('Cannot find specification: make or model not available');
        return null;
      }

      logger.info(`Finding specification for: make=${make}, model=${model}, version=${version}, year=${year}`);

      // Always use partial match to include year-suffixed models (e.g., "Celerio [2017-2021]")
      // This ensures we get both exact matches AND year-suffixed variants
      let candidates = await VehicleSpecification.findAll({
        where: {
          naming_make: { [Op.like]: `%${make}%` },
          naming_model: { [Op.like]: `${model}%` }  // Starts with model (includes year suffixes)
        },
        limit: 100  // Increased limit to capture more variants
      });

      // Step 3: Fallback to contains match (last resort)
      if (candidates.length === 0) {
        candidates = await VehicleSpecification.findAll({
          where: {
            naming_make: { [Op.like]: `%${make}%` },
            naming_model: { [Op.like]: `%${model}%` }
          },
          limit: 100
        });
      }

      if (candidates.length === 0) {
        logger.info(`No specifications found for make=${make}, model=${model}`);
        return null;
      }

      logger.info(`Found ${candidates.length} specification candidates for ${model}`);

      // Get fuel type from API response for filtering
      const fuelTypeRaw = (vehicleDetail.fuel_type || vehicleDetail.fuelType || '').toLowerCase();

      // Handle dual-fuel types like "petrol/cng", "petrol/lpg"
      const fuelTypes = fuelTypeRaw.split('/').map(f => f.trim()).filter(f => f);
      const primaryFuel = fuelTypes[0] || '';
      const hasCNG = fuelTypes.includes('cng') || fuelTypeRaw.includes('cng');
      const hasLPG = fuelTypes.includes('lpg') || fuelTypeRaw.includes('lpg');

      // Filter candidates by fuel type first (if available)
      if (primaryFuel && ['petrol', 'diesel', 'cng', 'electric', 'lpg'].includes(primaryFuel)) {
        const fuelFilteredCandidates = candidates.filter(c => {
          const candidateFuel = (c.keydata_key_fueltype || c.enginetransmission_fueltype || '').toLowerCase();

          // For dual-fuel vehicles, prefer CNG/LPG variants if available
          if (hasCNG && candidateFuel.includes('cng')) return true;
          if (hasLPG && candidateFuel.includes('lpg')) return true;

          // Otherwise match primary fuel
          return candidateFuel === primaryFuel || candidateFuel.includes(primaryFuel);
        });

        if (fuelFilteredCandidates.length > 0) {
          logger.info(`Filtered to ${fuelFilteredCandidates.length} candidates matching fuel type: ${fuelTypeRaw}`);
          candidates = fuelFilteredCandidates;
        }
      }

      // If version provided, do improved fuzzy matching
      if (version) {
        const versionUpper = version.toUpperCase();
        let bestMatch = null;
        let bestScore = 0;

        // Check if version has (O) suffix - indicates optional/variant
        const hasOptionalSuffix = versionUpper.includes('(O)') || versionUpper.includes('(OPT)') || versionUpper.includes('OPT');

        // Known variant codes to look for (order matters - more specific first)
        // Kia variants
        const kiaVariants = ['GTX PLUS', 'HTK PLUS', 'HTX PLUS', 'GTX', 'HTK', 'HTX', 'HTE', 'GRAVITY'];
        // Maruti variants
        const marutiVariants = ['ZXI PLUS', 'VXI PLUS', 'LXI', 'VXI', 'ZXI', 'LDI', 'VDI', 'ZDI'];
        // Hyundai variants
        const hyundaiVariants = ['SPORTZ', 'ASTA', 'MAGNA', 'ERA', 'SX', 'S'];
        // Tata variants
        const tataVariants = ['XZ PLUS', 'XZA PLUS', 'XZ', 'XZA', 'XT', 'XTA', 'XM', 'XMA', 'XE'];
        // Honda variants
        const hondaVariants = ['ZX', 'VX', 'V', 'S', 'E'];

        const allVariantCodes = [...kiaVariants, ...marutiVariants, ...hyundaiVariants, ...tataVariants, ...hondaVariants];

        // Extract variant code from API version string
        let apiVariantCode = null;
        for (const code of allVariantCodes) {
          if (versionUpper.includes(code)) {
            apiVariantCode = code;
            break;
          }
        }

        // Extract engine displacement (e.g., "1.5", "1.4", "2.0")
        const engineMatch = version.match(/(\d+\.\d+)/);
        const apiEngineSize = engineMatch ? engineMatch[1] : null;

        // Extract transmission type (order matters - check specific first)
        const apiTransmission = versionUpper.includes('AMT') ? 'AMT' :
                               versionUpper.includes('CVT') ? 'CVT' :
                               versionUpper.includes('DCT') ? 'DCT' :
                               versionUpper.includes('IMT') ? 'IMT' :
                               versionUpper.includes('AT') ? 'AT' :
                               versionUpper.includes('6MT') || versionUpper.includes('5MT') || versionUpper.includes('MT') ? 'MT' : null;

        logger.info(`Version parsing: variant=${apiVariantCode}, engine=${apiEngineSize}, transmission=${apiTransmission}, hasOptional=${hasOptionalSuffix}`);

        for (const candidate of candidates) {
          if (!candidate.naming_version) continue;

          const candidateVersion = candidate.naming_version.toUpperCase();
          let score = 0;

          // Score for variant code match (highest priority)
          if (apiVariantCode) {
            if (candidateVersion.includes(apiVariantCode)) {
              score += 100; // High score for variant match
            }
          }

          // Score for (O)/(OPT) suffix match
          const candidateHasOptional = candidateVersion.includes('(O)') || candidateVersion.includes('(OPT)') || candidateVersion.includes('OPT');
          if (hasOptionalSuffix && candidateHasOptional) {
            score += 40; // Bonus for matching optional suffix
          } else if (!hasOptionalSuffix && !candidateHasOptional) {
            score += 10; // Small bonus if both don't have optional
          }

          // Score for engine size match
          if (apiEngineSize && candidateVersion.includes(apiEngineSize)) {
            score += 50;
          }

          // Score for transmission match
          if (apiTransmission) {
            if (candidateVersion.includes(apiTransmission)) {
              score += 30;
            }
          }

          // Score for CNG match if dual-fuel vehicle
          if (hasCNG) {
            const candidateFuel = (candidate.keydata_key_fueltype || '').toLowerCase();
            if (candidateFuel.includes('cng') || candidateVersion.includes('CNG')) {
              score += 60; // Prefer CNG variant for dual-fuel vehicles
            }
          }

          // Bonus: Prefer versions without year range suffix for general match
          if (!candidateVersion.includes('[')) {
            score += 5;
          }

          if (score > bestScore) {
            bestScore = score;
            bestMatch = candidate;
          }
        }

        if (bestMatch) {
          logger.info(`Best match: ${bestMatch.naming_version} with score ${bestScore}`);
          return bestMatch;
        }

        // Fallback to first candidate if no scoring match
        return candidates[0];
      }

      // No version - return first match
      return candidates[0];
    } catch (error) {
      logger.error('Error finding vehicle specification:', error);
      return null;
    }
  }

  /**
   * Extract manufacturer name from description
   * E.g., "KIA INDIA PRIVATE LIMITED" -> "Kia"
   * E.g., "MARUTI SUZUKI INDIA LIMITED" -> "Maruti Suzuki"
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
      'DAIMLER': 'Mercedes-Benz',       // Parent company of Mercedes-Benz
      'BMW': 'BMW',
      'BAYERISCHE': 'BMW',              // BMW's full German name (Bayerische Motoren Werke)
      'AUDI': 'Audi',
      'JAGUAR': 'Jaguar',
      'LAND ROVER': 'Land Rover',
      'JLR': 'Jaguar',                  // Jaguar Land Rover
      'PORSCHE': 'Porsche',
      'LEXUS': 'Lexus',
      'VOLVO': 'Volvo',
      'MINI': 'Mini',
      'FIAT': 'Fiat',
      'CHEVROLET': 'Chevrolet',
      'GENERAL MOTORS': 'Chevrolet',    // GM parent company
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
      'CITROEN': 'Citroen',
      'PEUGEOT': 'Peugeot',
      'FERRARI': 'Ferrari',
      'LAMBORGHINI': 'Lamborghini',
      'MASERATI': 'Maserati',
      'BENTLEY': 'Bentley',
      'ROLLS': 'Rolls-Royce',
      'ASTON': 'Aston Martin',
      'BUGATTI': 'Bugatti',
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
   * Extract model name from description
   * E.g., "SELTOS G1.5 6MT HTE" -> "Seltos"
   * E.g., "TATA PUNCH ADV 1.2P MT BS6PH2" -> "Punch" (skip brand name)
   * E.g., "CLA200 CDI" -> "CLA" (Mercedes pattern)
   * E.g., "320D SPORT" -> "3 Series" (BMW pattern)
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

    // Default: use single word model name
    // Capitalize properly (e.g., "SELTOS" -> "Seltos", "PUNCH" -> "Punch")
    return modelWord.charAt(0).toUpperCase() + modelWord.slice(1).toLowerCase();
  }

  /**
   * Extract version/variant from maker_model description
   * E.g., "SELTOS G1.5 6MT HTE" -> "G1.5 6MT HTE"
   * E.g., "TATA PUNCH ADV 1.2P MT BS6PH2" -> "ADV 1.2P MT BS6PH2"
   * This extracts everything after the model name
   */
  extractVersionFromDescription(description) {
    if (!description) return null;

    const words = description.split(/\s+/);
    if (words.length <= 1) return null;

    // Brand names that appear in MakerModel - if first word matches, skip it
    const brandPrefixes = ['TATA', 'MARUTI', 'MAHINDRA', 'HYUNDAI', 'HONDA', 'TOYOTA',
                           'FORD', 'VOLKSWAGEN', 'SKODA', 'RENAULT', 'NISSAN', 'MG',
                           'JEEP', 'MERCEDES', 'BMW', 'AUDI', 'JAGUAR', 'CHEVROLET',
                           'FIAT', 'DATSUN', 'ISUZU', 'FORCE', 'EICHER', 'HERO',
                           'BAJAJ', 'TVS', 'ROYAL', 'YAMAHA', 'SUZUKI', 'KAWASAKI',
                           'KTM', 'HARLEY', 'DUCATI', 'TRIUMPH', 'BENELLI', 'APRILIA'];

    // Compound model suffixes that should be skipped as part of model name
    const compoundModelSuffixes = ['X', 'NIOS', 'DZIRE', 'RS', 'GT', 'LINE'];

    let startIndex = 1; // Start after model name (first word)

    // If first word is a brand prefix, model is second word, version starts at third
    if (brandPrefixes.includes(words[0].toUpperCase())) {
      startIndex = 2;
    }

    // Check if the next word after model is a compound suffix - if so, skip it too
    if (words.length > startIndex && compoundModelSuffixes.includes(words[startIndex].toUpperCase())) {
      startIndex++;
    }

    if (words.length <= startIndex) return null;

    // Join remaining words as version
    const version = words.slice(startIndex).join(' ');
    return version || null;
  }

  /**
   * Extract year from manufacturing date formatted string
   * E.g., "1/2023" -> "2023"
   * E.g., "2023-01" -> "2023"
   */
  extractYearFromManufacturingDate(manufacturingDateFormatted) {
    if (!manufacturingDateFormatted) return null;

    // Try to extract 4-digit year
    const yearMatch = manufacturingDateFormatted.match(/\b(19|20)\d{2}\b/);
    return yearMatch ? yearMatch[0] : null;
  }

  /**
   * Transform vehicle specification to match frontend VehicleSpecificationInterface
   * Maps all 92+ fields expected by the Angular frontend
   */
  transformVehicleSpecification(spec) {
    if (!spec) return null;

    const data = spec.toJSON ? spec.toJSON() : spec;

    return {
      // Basic Info
      model: data.naming_model,
      bodystyle: data.naming_bodystyle,
      version: data.naming_version,
      colorName: data.colors_color_name,

      // Comfort & Convenience
      adjustableClusterBrightness: data.instrumentation_adjustable_cluster_brightness,
      airConditioner: data.comfort_and_convenience_air_conditioner,
      bluetoothComatibility: data.ent_info_comm_bluetooth_compatibility,
      auxCompatibility: data.ent_info_comm_aux_compatibility,
      bootlidOpener: data.doors_windows_mirrors_wipers_bootild_opener,
      cupHolders: data.storage_cup_holders,
      display: data.ent_info_comm_display,
      driverArmsrest: data.seats_and_upholstery_driver_armrest,
      fastTag: data.price_breakdown_fast_tag,
      frontAc: data.comfort_and_convenience_front_ac,
      headrests: data.seats_and_upholstery_headrests,
      heater: data.comfort_and_convenience_heater,
      interiorDoorHandles: data.doors_windows_mirrors_wipers_interior_door_handles,
      interiorsColours: data.seats_and_upholstery_interiors_colours,
      keylessStartButtonStart: data.comfort_and_convenience_keyless_start_button_start,
      rearArmrest: data.seats_and_upholstery_rear_armrest,

      // Safety
      airbags: data.safety_airbags,
      antilockBarkingSystemAbs: data.barking_and_traction_antilock_barking_system_abs,
      automaticEmergencyBrakingAeb: data.safety_automatic_emergency_braking_aeb,
      automaticHeadLamps: data.lighting_automatic_head_lamps,
      brakeAssistBa: data.barking_and_traction_brake_assist_ba,
      centralLocking: data.locks_and_security_central_locking,
      checkVehicleStatusViaApp: data.telematics_check_vehicle_status_via_app,
      childSafetylock: data.locks_and_security_child_safety_lock,
      doorAjarWarning: data.instrumentation_door_ajar_warning,
      findMyCar: data.telematics_find_my_car,
      laneDepartureWarning: data.safety_lane_deprature_warning,
      overspeedWarning: data.safety_overspeed_warning,
      parkingAssist: data.comfort_and_convenience_parking_assist,
      parkingSensors: data.comfort_and_convenience_parking_sensors,
      safetyForwardCollisionWarningFcw: data.safety_forward_collision_warning_fcw,
      seatbeltWarning: data.safety_seatbelt_warning,
      speedSensingDoorlock: data.locks_and_security_speed_sensing_doorlock,

      // Exterior
      bodyColouredBumpers: data.exterior_body_coloured_bumpers,
      roofMountedAntenna: data.exterior_roof_mounted_antenna,
      sunroofMoonroof: data.exterior_sunroof_moonroof,
      wheels: data.suspension_brakes_steeringandtyres_wheels,

      // Instrumentation
      averageSpeed: data.instrumentation_average_speed,
      gearIndicator: data.instrumentation_gear_indicator,
      lowFuelLevelWarning: data.instrumentation_low_fuel_level_warning,
      ncapRating: data.safety_ncap_rating,
      remoteCarLockUnlockViaApp: data.telematics_remote_car_lock_unlock_via_app,
      shiftIndicator: data.instrumentation_shift_indicator,
      driveTrain: data.enginetransmission_drivetrain,

      // Engine & Transmission
      battery: data.enginetransmission_battery,
      electricMotor: data.enginetransmission_electric_motor,
      engine: data.keydata_key_engine || data.enginetransmission_engine,
      engineType: data.enginetransmission_engine_type,
      engineTransmissionMileageArai: data.enginetransmission_mileage_arai || data.keydata_key_mileage_arai,
      maxpower: data.enginetransmission_maxpower,
      maxpowerRpm: data.enginetransmission_maxpower_rpm,
      maxtorque: data.enginetransmission_maxtorque,
      transmission: data.keydata_key_transmission || data.enginetrans_transmission,
      transmissionDetails: data.enginetrans_transmission,
      emissionStandard: data.enginetransmission_emissionstandard,

      // Dimension & Weight
      groundClearance: data.dimensionweight_groundclearance,
      height: data.dimensionweight_height,
      kerbweight: data.dimensionweight_kerbweight,
      length: data.dimensionweight_length,
      wheelbase: data.dimensionweight_wheelbase,
      width: data.dimensionweight_width,

      // Braking
      frontBrakeType: data.suspension_brakes_steeringandtyres_front_brake_type,
      rearBrakeType: data.suspension_brakes_steeringandtyres_rear_brake_type,

      // Suspension & Steering
      rearSuspension: data.suspension_brakes_steeringandtyres_rear_suspension,

      // Tyres
      frontTyres: data.suspension_brakes_steeringandtyres_front_tyres,
      rearTyres: data.suspension_brakes_steeringandtyres_rear_tyres,
      spareWheels: data.suspension_brakes_steeringandtyres_spare_wheels,

      // Lightings
      cabinLamps: data.lighting_cabin_lamps,
      daytimeRunningLights: data.lighting_daytime_running_lights,
      emergencyBrakeLightFlashing: data.safety_emergency_brake_light_flashing,
      fogLights: data.lighting_fog_lights,
      rearDefogger: data.doors_windows_mirrors_wipers_rear_defogger,
      rearWiper: data.doors_windows_mirrors_wipers_rear_wiper,
      tailLights: data.lighting_tail_lights,

      // Entertainment & Communication
      amFmRadio: data.ent_info_comm_am_fm_radio,
      batteryWarrnatyInKms: data.manufacturer_warranty_battery_warranty_in_kms,
      smartConnectivity: data.ent_info_comm_smart_connectivity,
      speakers: data.ent_info_comm_speakers,
      usbCompatibility: data.ent_info_comm_usb_compatibility,
      voiceCommand: data.ent_info_comm_voice_command,
      wirelessCharger: data.ent_info_comm_wireless_charger,

      // Capacity
      bootspace: data.capacity_bootspace,
      doors: data.capacity_doors,
      fuelTankCapacity: data.capacity_fuel_tank_capacity,
      noOfSeatingRows: data.capacity_no_of_seating_rows,
      seatingCapacity: data.capacity_seating_capacity || data.keydata_key_seatingcapacity
    };
  }

  /**
   * Calculate resale value manually using user-provided data
   * This is called when system cannot auto-calculate (missing make, model, year, or price)
   * @param {number} vehicleDetailId - The vehicle detail record ID
   * @param {Object} userData - User-provided data { make, model, year, exShowroomPrice, kmsDriven }
   * @returns {Object} - { success, priceRange, error }
   */
  async calculateResaleManually(vehicleDetailId, userData) {
    try {
      const { make, model, year, exShowroomPrice, kmsDriven } = userData;

      // Validate required fields
      if (!make || !model || !year || !exShowroomPrice) {
        return {
          success: false,
          error: 'Missing required fields: make, model, year, and exShowroomPrice are required'
        };
      }

      // Validate year
      const yearNum = parseInt(year);
      const currentYear = new Date().getFullYear();
      if (isNaN(yearNum) || yearNum < 1990 || yearNum > currentYear) {
        return {
          success: false,
          error: `Invalid year: must be between 1990 and ${currentYear}`
        };
      }

      // Validate exShowroomPrice
      const priceNum = parseFloat(exShowroomPrice);
      if (isNaN(priceNum) || priceNum <= 0) {
        return {
          success: false,
          error: 'Invalid ex-showroom price: must be a positive number'
        };
      }

      // Find the vehicle detail record
      const vehicleDetail = await VehicleDetail.findByPk(vehicleDetailId);
      if (!vehicleDetail) {
        return {
          success: false,
          error: 'Vehicle detail not found'
        };
      }

      // Get state info from registration number
      const registrationNumber = vehicleDetail.registration_number;
      const stateCode = registrationNumber ? registrationNumber.substring(0, 2).toUpperCase() : null;
      let stateMapping = null;
      if (stateCode) {
        stateMapping = await StateMapping.findOne({
          where: { state_code: stateCode }
        });
      }

      // Calculate resale value using resaleValueService
      const resaleResult = resaleValueService.calculateResaleValue({
        originalPrice: priceNum,
        make: make,
        year: yearNum.toString(),
        kmsDriven: kmsDriven ? parseInt(kmsDriven) : null,
        state: stateMapping ? stateMapping.state_name : null,
        stateCode: stateCode,
        city: stateMapping ? stateMapping.state_capital : null,
        noOfOwners: vehicleDetail.owner_number || '1'
      });

      if (!resaleResult.isSuccess) {
        return {
          success: false,
          error: 'Resale calculation failed'
        };
      }

      // Save the user-provided data and calculated resale to database
      const userProvidedData = {
        make,
        model,
        year: yearNum,
        exShowroomPrice: priceNum,
        kmsDriven: kmsDriven ? parseInt(kmsDriven) : null,
        calculatedAt: new Date().toISOString()
      };

      await vehicleDetail.update({
        user_provided_resale_data: JSON.stringify(userProvidedData),
        resale_calculation_source: 'user',
        resale_price_range: JSON.stringify(resaleResult.value)
      });

      logger.info(`Manual resale calculated for vehicle ${vehicleDetailId}: ${make} ${model} ${year}, Price: ₹${priceNum}`);

      return {
        success: true,
        priceRange: resaleResult.value,
        resaleCalculationSource: 'user'
      };
    } catch (error) {
      logger.error('Error calculating manual resale:', error);
      return {
        success: false,
        error: error.message || 'An error occurred during resale calculation'
      };
    }
  }
}

module.exports = new VehicleDetailService();
