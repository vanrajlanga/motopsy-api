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
const CustomVehicleEntry = require('../models/custom-vehicle-entry.model');
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
        kmsDriven,  // Only field needed from frontend for OBV calculation
        exShowroomPrice,  // User-provided ex-showroom price for custom entries
        isCustomEntry  // Flag indicating this is a custom vehicle entry
      } = request;

      if (!registrationNumber) {
        return Result.failure('Registration number is required');
      }

      // Make/model/version are now optional - will be extracted from RC API response if not provided

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

      // Store user-provided make/model/version from DB-first dropdowns (Droom fallback)
      const userProvidedData = {
        make: make,
        model: model,
        version: version,
        providedAt: new Date().toISOString()
      };

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
        // Store user-provided make/model/version for future retrieval
        user_provided_resale_data: JSON.stringify(userProvidedData),
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

      // Link custom vehicle entry if this is a custom entry
      if (isCustomEntry) {
        try {
          const { Op } = require('sequelize');

          // Find the most recent custom entry for this user with matching make/model/version
          const customEntry = await CustomVehicleEntry.findOne({
            where: {
              user_id: resolvedUserId,
              custom_make: make,
              custom_model: model,
              custom_version: version,
              vehicle_detail_id: null  // Only update entries not yet linked
            },
            order: [['created_at', 'DESC']]
          });

          if (customEntry) {
            await customEntry.update({
              vehicle_detail_id: vehicleDetail.id
            });
            logger.info(`Linked custom vehicle entry ${customEntry.id} with vehicle detail ${vehicleDetail.id}`);
          }
        } catch (customEntryError) {
          logger.error('Error linking custom vehicle entry:', customEntryError);
          // Continue - not critical
        }
      }

      // Return full response matching frontend expectations
      // Pass user-provided make/model/version to avoid extraction mismatches
      return Result.success(await this.buildVehicleDetailResponse(vehicleDetail, resolvedUserId, kmsDriven, make, model, version));
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
   * @param {string} userMake - User-provided make (optional, preferred over extraction)
   * @param {string} userModel - User-provided model (optional, preferred over extraction)
   * @param {string} userVersion - User-provided version (optional, preferred over extraction)
   * @param {boolean} isAdmin - Whether user is admin (skip masking if true)
   */
  async buildVehicleDetailResponse(vehicleDetail, userId, kmsDriven = null, userMake = null, userModel = null, userVersion = null, isAdmin = false) {
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

    // Get vehicle specification - use saved match or run matching algorithm
    let vehicleSpecification = null;

    // Check if we already have a saved matching result
    if (vehicleDetail.matched_spec_id) {
      // Use the saved spec for consistency
      vehicleSpecification = await VehicleSpecification.findByPk(vehicleDetail.matched_spec_id);
      logger.info(`Using saved vehicle specification (ID: ${vehicleDetail.matched_spec_id}) for vehicle ${vehicleDetailId}`);
    } else {
      // Run matching algorithm and save the result
      const matchResult = await this.findVehicleSpecification(vehicleDetail, userMake, userModel, userVersion);
      vehicleSpecification = matchResult?.spec || null;

      // Save matching result to database for future consistency
      if (matchResult?.matchingLog) {
        try {
          await vehicleDetail.update({
            matched_spec_id: matchResult.spec ? matchResult.spec.id : null,
            matching_score: matchResult.matchingLog.score || null,
            matching_log: matchResult.matchingLog
          });
          logger.info(`Saved matching result for vehicle ${vehicleDetailId}: spec_id=${matchResult.spec?.id}, score=${matchResult.matchingLog.score}`);
        } catch (saveError) {
          logger.error(`Failed to save matching result for vehicle ${vehicleDetailId}:`, saveError);
          // Continue - matching result save is not critical for the response
        }
      }
    }

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
        // Use user-provided make/model, or fallback to extraction ONLY if not provided
        const modelDescription = vehicleDetail.maker_model || vehicleDetail.model;
        const make = userMake || this.extractMakeFromDescription(vehicleDetail.maker_description || vehicleDetail.manufacturer, modelDescription);
        const model = userModel || this.extractModelFromDescription(modelDescription);
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
          // PRIORITY 1: Use price from matched spec if available (already matched by algorithm)
          let originalPrice = null;

          if (vehicleSpecification) {
            // Get price directly from the matched spec - no need to re-lookup!
            originalPrice = this.parsePriceString(vehicleSpecification.keydata_key_price) ||
                           this.parsePriceString(vehicleSpecification.naming_price) ||
                           this.parsePriceString(vehicleSpecification.price_breakdown_ex_showroom_price);
            if (originalPrice) {
              logger.info(`Using price from matched spec ${vehicleSpecification.id}: ₹${originalPrice}`);
            }
          }

          // PRIORITY 2: Fallback to make/model lookup only if matched spec has no price
          if (!originalPrice) {
            originalPrice = await this.lookupExShowroomPrice(make, model, vehicleDetail.variant);
          }

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

      // Retrieve stored user-provided make/model/version if available
      let userMake = null, userModel = null, userVersion = null;
      if (vehicleDetail.user_provided_resale_data) {
        try {
          const userData = typeof vehicleDetail.user_provided_resale_data === 'string'
            ? JSON.parse(vehicleDetail.user_provided_resale_data)
            : vehicleDetail.user_provided_resale_data;
          userMake = userData.make || null;
          userModel = userData.model || null;
          userVersion = userData.version || null;
        } catch (err) {
          logger.error('Error parsing user_provided_resale_data:', err);
        }
      }

      // Build the response using shared method with stored values
      const response = await this.buildVehicleDetailResponse(vehicleDetail, userId, kmsDriven, userMake, userModel, userVersion, isAdmin);

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
   * Find vehicle specification using smart matching with comprehensive scoring
   * Matches .NET VehicleSpecificationRepository.GetVehicleSpecificationByVehicleDetails
   * Now PREFERS user-provided make/model/version to avoid extraction mismatches
   * Falls back to extraction only if user values not provided
   *
   * SCORING SYSTEM:
   * - Engine capacity match: +100 points (keydata_key_engine vs cubic_capacity)
   * - Variant name match: +100 points (naming_version vs maker_model)
   * - Fuel type match: +80 points (keydata_key_fueltype vs fuel_type)
   * - Transmission match: +60 points (naming_version vs maker_model)
   * - Color match (primary): +50 points (colors_color_name vs color)
   * - Color match (secondary): +30 points
   * - Year range match: +50 points (naming_model year suffix vs manufacturing_date)
   * - Emission standard match: +40 points (enginetransmission_emissionstandard vs norms_type)
   * - No year suffix bonus: +20 points (current model preference)
   *
   * @param {Object} vehicleDetail - Vehicle detail with maker_description/maker_model
   * @param {string} userMake - User-provided make (optional, preferred over extraction)
   * @param {string} userModel - User-provided model (optional, preferred over extraction)
   * @param {string} userVersion - User-provided version (optional, preferred over extraction)
   */
  async findVehicleSpecification(vehicleDetail, userMake = null, userModel = null, userVersion = null) {
    try {
      const { Op } = require('sequelize');

      if (!vehicleDetail) {
        logger.info('Cannot find specification: vehicleDetail not provided');
        return { spec: null, matchingLog: { error: 'vehicleDetail not provided' } };
      }

      // Prefer user-provided values, fallback to extraction only if not provided
      const modelDescription = vehicleDetail.maker_model || vehicleDetail.model || '';
      const make = userMake || this.extractMakeFromDescription(vehicleDetail.maker_description || vehicleDetail.manufacturer || '', modelDescription);
      const model = userModel || this.extractModelFromDescription(modelDescription);
      const version = userVersion || this.extractVersionFromDescription(modelDescription);

      // Extract year from manufacturing date for year range matching
      const year = this.extractYearFromManufacturingDate(vehicleDetail.manufacturing_date_formatted);
      const manufacturingYear = year ? parseInt(year) : null;

      // Extract additional RC data for matching
      const rcCubicCapacity = vehicleDetail.cubic_capacity ? parseInt(vehicleDetail.cubic_capacity) : null;
      const rcColor = (vehicleDetail.color || '').toUpperCase();
      const rcNormsType = (vehicleDetail.norms_type || '').toUpperCase();

      if (!make || !model) {
        logger.info('Cannot find specification: make or model not available');
        return { spec: null, matchingLog: { error: 'make or model not available' } };
      }

      logger.info(`Finding specification for: make=${make}, model=${model}, version=${version}, year=${year}, cc=${rcCubicCapacity}, color=${rcColor}, norms=${rcNormsType}`);

      // Always use partial match to include year-suffixed models (e.g., "Celerio [2017-2021]")
      // This ensures we get both exact matches AND year-suffixed variants
      let candidates = await VehicleSpecification.findAll({
        where: {
          naming_make: { [Op.like]: `%${make}%` },
          naming_model: { [Op.like]: `${model}%` }  // Starts with model (includes year suffixes)
        }
        // No limit - fetch all candidates to ensure correct generation matching
      });

      // Step 3: Fallback to contains match (last resort)
      if (candidates.length === 0) {
        candidates = await VehicleSpecification.findAll({
          where: {
            naming_make: { [Op.like]: `%${make}%` },
            naming_model: { [Op.like]: `%${model}%` }
          }
          // No limit - fetch all candidates
        });
      }

      // Step 4: If model is just brand name fragment (e.g., "Benz" from "MERCEDES BENZ"),
      // fetch ALL specs for the make and rely on scoring algorithm (cc, fuel, etc.)
      if (candidates.length === 0 && rcCubicCapacity) {
        const brandFragments = ['BENZ', 'ROVER', 'MARTIN', 'ROMEO', 'ROYCE'];
        if (brandFragments.includes(model.toUpperCase())) {
          logger.info(`Model "${model}" appears to be a brand fragment, fetching all ${make} specs for CC-based matching`);
          // Fetch ALL specs for the make (no limit) since we need to score by engine capacity
          candidates = await VehicleSpecification.findAll({
            where: {
              naming_make: { [Op.like]: `%${make}%` }
            }
          });
        }
      }

      if (candidates.length === 0) {
        logger.info(`No specifications found for make=${make}, model=${model}`);
        return { spec: null, matchingLog: { error: `No specifications found for make=${make}, model=${model}` } };
      }

      logger.info(`Found ${candidates.length} specification candidates for ${model}`);

      // Get fuel type from API response for filtering
      const fuelTypeRaw = (vehicleDetail.fuel_type || vehicleDetail.fuelType || '').toLowerCase();

      // Handle dual-fuel types like "petrol/cng", "petrol/lpg", "diesel/hybrid"
      const fuelTypes = fuelTypeRaw.split('/').map(f => f.trim()).filter(f => f);
      const primaryFuel = fuelTypes[0] || '';
      const hasCNG = fuelTypes.includes('cng') || fuelTypeRaw.includes('cng');
      const hasLPG = fuelTypes.includes('lpg') || fuelTypeRaw.includes('lpg');
      // HYBRID detection - highest priority for modern vehicles
      const hasHybrid = fuelTypes.includes('hybrid') || fuelTypeRaw.includes('hybrid');
      const hasElectric = fuelTypes.includes('electric') || fuelTypeRaw.includes('electric');

      // Version-based data extraction
      const versionUpper = version ? version.toUpperCase() : '';

      // Check if version has (O) suffix - indicates optional/variant
      const hasOptionalSuffix = versionUpper.includes('(O)') || versionUpper.includes('(OPT)') || versionUpper.includes('OPT');

      // Known variant codes to look for (order matters - more specific first)
      const kiaVariants = ['GTX PLUS', 'HTK PLUS', 'HTX PLUS', 'GTX', 'HTK', 'HTX', 'HTE', 'GRAVITY'];
      const marutiVariants = ['ZXI PLUS', 'VXI PLUS', 'LXI', 'VXI', 'ZXI', 'LDI', 'VDI', 'ZDI'];
      const hyundaiVariants = ['SPORTZ', 'ASTA', 'MAGNA', 'ERA', 'SX', 'S'];
      const tataVariants = ['ACCOMPLISHED S', 'ACCOMPLISHED', 'CREATIVE S', 'CREATIVE', 'PURE S', 'PURE', 'XZ PLUS', 'XZA PLUS', 'XZ', 'XZA', 'XT', 'XTA', 'XM', 'XMA', 'XE'];
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
      const engineMatch = version ? version.match(/(\d+\.\d+)/) : null;
      const apiEngineSize = engineMatch ? engineMatch[1] : null;

      // Extract transmission type (order matters - check specific first)
      const apiTransmission = versionUpper.includes('AMT') ? 'AMT' :
                             versionUpper.includes('CVT') ? 'CVT' :
                             versionUpper.includes('DCT') ? 'DCT' :
                             versionUpper.includes('7DCA') || versionUpper.includes('7DCT') ? 'DCT' :
                             versionUpper.includes('IMT') ? 'IMT' :
                             versionUpper.includes('AT') ? 'AT' :
                             versionUpper.includes('6MT') || versionUpper.includes('5MT') || versionUpper.includes('MT') ? 'MT' : null;

      // Parse RC color for matching
      const colorTokens = this.parseRCColor(rcColor);

      logger.info(`Matching params: variant=${apiVariantCode}, engine=${apiEngineSize}, transmission=${apiTransmission}, colorTokens=${colorTokens.join(',')}, hasHybrid=${hasHybrid}, hasElectric=${hasElectric}`);

      // Build input log for matching
      const matchingInput = {
        make,
        model,
        version,
        cubicCapacity: rcCubicCapacity,
        fuelType: fuelTypeRaw,
        color: rcColor,
        normsType: rcNormsType,
        manufacturingYear,
        extractedVariant: apiVariantCode,
        extractedTransmission: apiTransmission,
        extractedEngineSize: apiEngineSize
      };

      // Score all candidates
      let bestMatch = null;
      let bestScore = -1;
      let bestBreakdown = {};
      let fallbackUsed = null;

      // Check if brand fragment fallback was used
      if (model && ['BENZ', 'ROVER', 'MARTIN', 'ROMEO', 'ROYCE'].includes(model.toUpperCase())) {
        fallbackUsed = 'brand_fragment';
      }

      for (const candidate of candidates) {
        let score = 0;
        const breakdown = {};
        const candidateVersion = (candidate.naming_version || '').toUpperCase();
        const candidateModel = (candidate.naming_model || '').toUpperCase();
        const candidateEngine = (candidate.keydata_key_engine || '').toString();
        const candidateFuel = (candidate.keydata_key_fueltype || candidate.enginetransmission_fueltype || '').toLowerCase();
        const candidateColor = (candidate.colors_color_name || '').toUpperCase();
        const candidateEmission = (candidate.enginetransmission_emissionstandard || '').toUpperCase();

        // 1. HYBRID/ELECTRIC MATCH (+150 points) - HIGHEST PRIORITY
        const specIsHybrid = candidateFuel.includes('hybrid') || candidateFuel.includes('mild hybrid');
        const specIsElectric = candidateFuel.includes('electric') && !candidateFuel.includes('hybrid');

        if (hasHybrid) {
          if (specIsHybrid) {
            score += 150;
            breakdown.hybridMatch = { points: 150, reason: 'RC hybrid matches spec hybrid' };
            if (primaryFuel && candidateFuel.includes(primaryFuel)) {
              score += 50;
              breakdown.hybridFuelBonus = { points: 50, reason: `${primaryFuel}/hybrid matches ${candidateFuel}` };
            }
          } else {
            score -= 100;
            breakdown.hybridPenalty = { points: -100, reason: 'RC is hybrid but spec is not' };
          }
        } else if (hasElectric) {
          if (specIsElectric) {
            score += 150;
            breakdown.electricMatch = { points: 150, reason: 'RC electric matches spec electric' };
          } else {
            score -= 100;
            breakdown.electricPenalty = { points: -100, reason: 'RC is electric but spec is not' };
          }
        } else {
          if (specIsHybrid || specIsElectric) {
            score -= 50;
            breakdown.conventionalPenalty = { points: -50, reason: 'RC is conventional but spec is hybrid/electric' };
          }
        }

        // 2. ENGINE CAPACITY MATCH (+100 points)
        if (rcCubicCapacity) {
          if (candidateEngine) {
            const specEngineMatch = candidateEngine.match(/(\d+)/);
            if (specEngineMatch) {
              const specEngineCC = parseInt(specEngineMatch[1]);
              const ccDiff = Math.abs(specEngineCC - rcCubicCapacity);
              if (ccDiff <= 50) {
                score += 100;
                breakdown.engineCapacity = { points: 100, reason: `${rcCubicCapacity}cc matches ${specEngineCC}cc (diff: ${ccDiff}cc)` };
              } else {
                breakdown.engineCapacity = { points: 0, reason: `${rcCubicCapacity}cc vs ${specEngineCC}cc (diff: ${ccDiff}cc too large)` };
              }
            } else {
              breakdown.engineCapacity = { points: 0, reason: `Spec engine "${candidateEngine}" - no CC found` };
            }
          } else {
            breakdown.engineCapacity = { points: 0, reason: 'Spec has no engine data' };
          }
        }

        // 3. VARIANT NAME MATCH (+100 points)
        if (apiVariantCode) {
          if (candidateVersion.includes(apiVariantCode)) {
            score += 100;
            breakdown.variantName = { points: 100, reason: `Variant "${apiVariantCode}" found in version` };
          } else {
            breakdown.variantName = { points: 0, reason: `Variant "${apiVariantCode}" not in "${candidateVersion}"` };
          }
        }

        // 4. FUEL TYPE MATCH (+80 points)
        if (primaryFuel && !hasHybrid && !hasElectric) {
          if (hasCNG && candidateFuel.includes('cng')) {
            score += 80;
            breakdown.fuelType = { points: 80, reason: 'CNG match' };
          } else if (hasLPG && candidateFuel.includes('lpg')) {
            score += 80;
            breakdown.fuelType = { points: 80, reason: 'LPG match' };
          } else if (candidateFuel === primaryFuel || candidateFuel.includes(primaryFuel)) {
            score += 80;
            breakdown.fuelType = { points: 80, reason: `${primaryFuel} matches ${candidateFuel}` };
          } else {
            breakdown.fuelType = { points: 0, reason: `${primaryFuel} does not match ${candidateFuel}` };
          }
        }

        // 5. TRANSMISSION MATCH (+60 points)
        if (apiTransmission) {
          if (candidateVersion.includes(apiTransmission)) {
            score += 60;
            breakdown.transmission = { points: 60, reason: `${apiTransmission} found in version` };
          } else if (apiTransmission === 'DCT' && (candidateVersion.includes('7DCA') || candidateVersion.includes('7DCT'))) {
            score += 60;
            breakdown.transmission = { points: 60, reason: 'DCT variant match (7DCA/7DCT)' };
          } else {
            breakdown.transmission = { points: 0, reason: `${apiTransmission} not found in version` };
          }
        }

        // 6. COLOR MATCH (+50 primary, +30 secondary)
        if (colorTokens.length > 0) {
          if (candidateColor) {
            const colorMatchScore = this.calculateColorMatchScore(colorTokens, candidateColor);
            if (colorMatchScore > 0) {
              score += colorMatchScore;
              breakdown.color = { points: colorMatchScore, reason: `Color tokens [${colorTokens.join(',')}] match ${candidateColor}` };
            } else {
              breakdown.color = { points: 0, reason: `Color [${colorTokens.join(',')}] does not match ${candidateColor}` };
            }
          } else {
            breakdown.color = { points: 0, reason: 'Spec has no color data' };
          }
        }

        // 7. YEAR RANGE MATCH / CURRENT MODEL BONUS
        if (manufacturingYear) {
          if (!candidateModel.includes('[')) {
            let yearPoints = 10;
            let yearReason = 'Current model (no year suffix)';
            if (manufacturingYear >= 2022) {
              yearPoints = 80;
              yearReason = 'Current model + recent vehicle (2022+)';
            } else if (manufacturingYear >= 2020) {
              yearPoints = 40;
              yearReason = 'Current model + vehicle 2020-2021';
            }
            score += yearPoints;
            breakdown.yearRange = { points: yearPoints, reason: yearReason };
          } else {
            const yearRangeScore = this.calculateYearRangeScore(candidateModel, manufacturingYear);
            if (yearRangeScore > 0) {
              score += yearRangeScore;
              breakdown.yearRange = { points: yearRangeScore, reason: `Year ${manufacturingYear} within ${candidateModel}` };
            } else {
              breakdown.yearRange = { points: 0, reason: `Year ${manufacturingYear} not in range ${candidateModel}` };
            }
          }
        }

        // 8. EMISSION STANDARD MATCH (+60 exact, +30 family)
        if (rcNormsType) {
          const rcEmission = this.normalizeEmissionStandard(rcNormsType);
          if (candidateEmission) {
            const specEmission = this.normalizeEmissionStandard(candidateEmission);
            if (rcEmission && specEmission) {
              if (rcEmission === specEmission) {
                score += 60;
                breakdown.emission = { points: 60, reason: `${rcEmission} exact match` };
              } else if (rcEmission.startsWith('BS6') && specEmission.startsWith('BS6')) {
                score += 30;
                breakdown.emission = { points: 30, reason: `BS6 family match (${rcEmission} vs ${specEmission})` };
              } else {
                breakdown.emission = { points: 0, reason: `${rcEmission} does not match ${specEmission}` };
              }
            }
          } else {
            breakdown.emission = { points: 0, reason: 'Spec has no emission data' };
          }
        }

        // 9. Optional suffix match (+30 or +5)
        const candidateHasOptional = candidateVersion.includes('(O)') || candidateVersion.includes('(OPT)');
        if (hasOptionalSuffix && candidateHasOptional) {
          score += 30;
          breakdown.optionalSuffix = { points: 30, reason: 'Both have (O)/(OPT) suffix' };
        } else if (!hasOptionalSuffix && !candidateHasOptional) {
          score += 5;
          breakdown.optionalSuffix = { points: 5, reason: 'Neither has optional suffix' };
        } else {
          breakdown.optionalSuffix = { points: 0, reason: hasOptionalSuffix ? 'RC has optional but spec does not' : 'Spec has optional but RC does not' };
        }

        // 10. Engine size from version string match (+50 points)
        if (apiEngineSize) {
          if (candidateVersion.includes(apiEngineSize)) {
            score += 50;
            breakdown.engineSize = { points: 50, reason: `Engine size ${apiEngineSize} in version` };
          } else {
            breakdown.engineSize = { points: 0, reason: `Engine size ${apiEngineSize} not in version` };
          }
        }

        if (score > bestScore) {
          bestScore = score;
          bestMatch = candidate;
          bestBreakdown = breakdown;
        }
      }

      // Build complete matching log
      const matchingLog = {
        timestamp: new Date().toISOString(),
        input: matchingInput,
        candidatesConsidered: candidates.length,
        fallbackUsed,
        matched: bestMatch ? {
          specId: bestMatch.id,
          namingVersionId: bestMatch.naming_versionId,
          model: bestMatch.naming_model,
          version: bestMatch.naming_version,
          fuelType: bestMatch.keydata_key_fueltype,
          engine: bestMatch.keydata_key_engine
        } : null,
        score: bestScore,
        scoreBreakdown: bestBreakdown
      };

      if (bestMatch) {
        logger.info(`Best match: ${bestMatch.naming_model} - ${bestMatch.naming_version} with score ${bestScore}`);
        // Return object with spec and matching log
        return { spec: bestMatch, matchingLog };
      }

      // Fallback to first candidate if no scoring match
      if (candidates[0]) {
        return { spec: candidates[0], matchingLog };
      }

      return { spec: null, matchingLog };
    } catch (error) {
      logger.error('Error finding vehicle specification:', error);
      return { spec: null, matchingLog: { error: error.message } };
    }
  }

  /**
   * Parse RC color string into searchable tokens
   * E.g., "PURGRY BKONX" -> ["Pure", "Grey", "Black", "Onyx"]
   * E.g., "OBSIDIAN BLACK" -> ["Obsidian", "Black"]
   * E.g., "SILVER" -> ["Silver"]
   */
  parseRCColor(rcColor) {
    if (!rcColor) return [];

    // Full color names - check these first (exact match)
    const fullColorNames = {
      'BLACK': 'Black', 'WHITE': 'White', 'SILVER': 'Silver', 'GREY': 'Grey', 'GRAY': 'Grey',
      'BLUE': 'Blue', 'RED': 'Red', 'GREEN': 'Green', 'YELLOW': 'Yellow', 'ORANGE': 'Orange',
      'BROWN': 'Brown', 'MAROON': 'Maroon', 'BEIGE': 'Beige', 'GOLD': 'Gold', 'GOLDEN': 'Gold',
      'CREAM': 'Cream', 'PINK': 'Pink', 'VIOLET': 'Violet', 'PURPLE': 'Purple',
      'OBSIDIAN': 'Obsidian', 'ONYX': 'Onyx', 'PEARL': 'Pearl', 'COPPER': 'Copper',
      'TEAL': 'Teal', 'TURQUOISE': 'Turquoise', 'NAVY': 'Navy', 'BRONZE': 'Bronze',
      'CHAMPAGNE': 'Champagne', 'IVORY': 'Ivory', 'BURGUNDY': 'Burgundy', 'CHARCOAL': 'Charcoal',
      'GRAPHITE': 'Graphite', 'METALLIC': 'Metallic', 'TITANIUM': 'Titanium', 'PLATINUM': 'Platinum',
      'MOJAVE': 'Mojave', 'SELENITE': 'Selenite', 'SODALITE': 'Sodalite', 'OPALITH': 'Opalith'
    };

    // Abbreviations for compressed RC color codes (used only for short words)
    const colorAbbreviations = {
      'PUR': 'Pure', 'GRY': 'Grey', 'BK': 'Black', 'BLK': 'Black',
      'ONX': 'Onyx', 'WHT': 'White', 'WH': 'White', 'SLV': 'Silver', 'SLVR': 'Silver',
      'BLU': 'Blue', 'RD': 'Red', 'GRN': 'Green', 'GR': 'Green',
      'YLW': 'Yellow', 'YL': 'Yellow', 'ORG': 'Orange', 'OR': 'Orange',
      'BRN': 'Brown', 'BR': 'Brown', 'MRN': 'Maroon', 'BGE': 'Beige', 'GLD': 'Gold',
      'CRM': 'Cream', 'PNK': 'Pink', 'VLT': 'Violet', 'PRP': 'Purple', 'TRQ': 'Turquoise',
      'ATM': 'Atomic', 'ROYAL': 'Royal', 'PRL': 'Pearl', 'CPR': 'Copper'
    };

    const tokens = [];
    const words = rcColor.split(/[\s,]+/);

    for (const word of words) {
      if (!word || word.length < 2) continue;

      const upperWord = word.toUpperCase();
      let matched = false;

      // First, check for full color name (exact match)
      if (fullColorNames[upperWord]) {
        tokens.push(fullColorNames[upperWord]);
        matched = true;
      }

      // If not a full name and word is short (likely abbreviated), check abbreviations
      if (!matched && word.length <= 6) {
        // For short words, check if word starts with or equals an abbreviation
        for (const [abbrev, fullName] of Object.entries(colorAbbreviations)) {
          if (upperWord === abbrev || (upperWord.length <= 4 && upperWord.startsWith(abbrev))) {
            tokens.push(fullName);
            matched = true;
            break;  // Only match one abbreviation per word
          }
        }

        // For compound abbreviated words like "BKONX" or "PURGRY"
        if (!matched && word.length >= 4) {
          for (const [abbrev, fullName] of Object.entries(colorAbbreviations)) {
            if (upperWord.includes(abbrev) && abbrev.length >= 2) {
              tokens.push(fullName);
              matched = true;
            }
          }
        }
      }

      // If still no match and word is long enough, use as-is (capitalized)
      if (!matched && word.length > 3) {
        tokens.push(word.charAt(0).toUpperCase() + word.slice(1).toLowerCase());
      }
    }

    return [...new Set(tokens)]; // Remove duplicates
  }

  /**
   * Calculate color match score between RC color tokens and spec color name
   * Returns +50 for primary color match, +30 for secondary color match
   */
  calculateColorMatchScore(colorTokens, specColorName) {
    let score = 0;
    const specColorUpper = specColorName.toUpperCase();

    // Primary color is first token, secondary is rest
    if (colorTokens.length > 0) {
      const primaryColor = colorTokens[0].toUpperCase();
      if (specColorUpper.includes(primaryColor)) {
        score += 50;  // Primary color match
      }
    }

    // Check secondary colors
    for (let i = 1; i < colorTokens.length; i++) {
      const secondaryColor = colorTokens[i].toUpperCase();
      if (specColorUpper.includes(secondaryColor)) {
        score += 30;  // Secondary color match
        break;  // Only count one secondary match
      }
    }

    return score;
  }

  /**
   * Calculate year range matching score
   * Returns +50 if RC year falls within model's year range
   * Returns +40 if no year suffix and recent vehicle (2023+)
   * Returns +10 if no year suffix and older vehicle
   */
  calculateYearRangeScore(modelName, manufacturingYear) {
    if (!manufacturingYear) return 0;

    // Extract year range from model name like "Curvv [2024-2027]" or "C-Class [2018-2022]"
    const yearRangeMatch = modelName.match(/\[(\d{4})-(\d{4})\]/);

    if (yearRangeMatch) {
      const startYear = parseInt(yearRangeMatch[1]);
      const endYear = parseInt(yearRangeMatch[2]);

      // Check if manufacturing year falls within range
      if (manufacturingYear >= startYear && manufacturingYear <= endYear) {
        return 50;  // Year within range
      }
      return 0;  // Year outside range
    }

    // No year suffix - current model
    if (!modelName.includes('[')) {
      if (manufacturingYear >= 2023) {
        return 40;  // Current model for recent vehicles
      }
      return 10;  // Some bonus for current model with older vehicle
    }

    return 0;
  }

  /**
   * Normalize emission standard to comparable format
   * E.g., "BS6", "BS-VI", "BHARAT STAGE VI", "BS 6" -> "BS6"
   */
  normalizeEmissionStandard(emission) {
    if (!emission) return null;

    const upper = emission.toUpperCase();

    // Map various formats to standardized version
    if (upper.includes('BS6') || upper.includes('BS-6') || upper.includes('BS 6') ||
        upper.includes('BHARAT STAGE VI') || upper.includes('BS-VI') || upper.includes('BSVI')) {
      // Check for Phase 2
      if (upper.includes('PH2') || upper.includes('PHASE 2') || upper.includes('PHASE2') || upper.includes('PHASE-2')) {
        return 'BS6PH2';
      }
      return 'BS6';
    }

    if (upper.includes('BS4') || upper.includes('BS-4') || upper.includes('BS 4') ||
        upper.includes('BHARAT STAGE IV') || upper.includes('BS-IV') || upper.includes('BSIV')) {
      return 'BS4';
    }

    if (upper.includes('BS3') || upper.includes('BS-3') || upper.includes('BHARAT STAGE III')) {
      return 'BS3';
    }

    return null;
  }

  /**
   * Extract manufacturer name from description
   * E.g., "KIA INDIA PRIVATE LIMITED" -> "Kia"
   * E.g., "MARUTI SUZUKI INDIA LIMITED" -> "Maruti Suzuki"
   */
  extractMakeFromDescription(description, modelDescription = null) {
    if (!description) return null;

    const upper = description.toUpperCase();

    // Special handling for Jaguar Land Rover - determine make based on model
    if (upper.includes('JAGUAR') && upper.includes('LAND ROVER')) {
      // Check if model is a Land Rover model
      if (modelDescription) {
        const modelUpper = modelDescription.toUpperCase();
        const landRoverModels = ['RANGE ROVER', 'DISCOVERY', 'DEFENDER', 'FREELANDER', 'EVOQUE', 'VELAR'];
        for (const lrModel of landRoverModels) {
          if (modelUpper.includes(lrModel)) {
            return 'Land Rover';
          }
        }
        // Jaguar models: F-TYPE, F-PACE, XE, XF, XJ, I-PACE, E-PACE
        const jaguarModels = ['F-TYPE', 'F-PACE', 'XE', 'XF', 'XJ', 'I-PACE', 'E-PACE'];
        for (const jModel of jaguarModels) {
          if (modelUpper.includes(jModel)) {
            return 'Jaguar';
          }
        }
      }
      // Default to Land Rover if no specific model match (Range Rover is more common)
      return 'Land Rover';
    }

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
      'LAND ROVER': 'Land Rover',       // Check before JAGUAR
      'JAGUAR': 'Jaguar',
      'JLR': 'Land Rover',              // Jaguar Land Rover - default to Land Rover
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

    // upper is already declared at the top of the function
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
      // Maruti Suzuki
      'ALTO K10': 'Alto K10',
      'ALTO 800': 'Alto 800',
      'CELERIO X': 'Celerio X',
      'SWIFT DZIRE': 'Swift Dzire',
      'BALENO RS': 'Baleno RS',
      // Hyundai
      'GRAND I10': 'Grand i10',
      'GRAND I10 NIOS': 'Grand i10 Nios',
      'VENUE N LINE': 'Venue N Line',
      // Honda
      'CITY E': 'City e',
      'JAZZ X': 'Jazz X',
      // Kia
      'SELTOS X LINE': 'Seltos X Line',
      'SONET X LINE': 'Sonet X Line',
      // Volkswagen
      'POLO GT': 'Polo GT',
      // Toyota
      'FORTUNER SIGMA': 'Fortuner',
      'INNOVA CRYSTA': 'Innova Crysta',
      'INNOVA HYCROSS': 'Innova Hycross',
      // Land Rover / Range Rover (check longer names first)
      'RANGE ROVER SPORT': 'Range Rover Sport',
      'RANGE ROVER VELAR': 'Range Rover Velar',
      'RANGE ROVER EVOQUE': 'Range Rover Evoque',
      'RANGE ROVER': 'Range Rover',
      'DISCOVERY SPORT': 'Discovery Sport'
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

    // Check for single-letter Mercedes models without numbers (e.g., "C 220 D" -> "C" -> "C-Class")
    // This handles cases where model is a single letter like "C", "E", "S" followed by space and numbers
    if (modelWord.length === 1 && mercedesLetterToClass[modelWord]) {
      return mercedesLetterToClass[modelWord];
    }

    // Check for multi-letter Mercedes models without numbers (e.g., "GLA", "GLC", "CLA" as standalone)
    if (mercedesMultiLetterModels.includes(modelWord)) {
      return modelWord;
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
