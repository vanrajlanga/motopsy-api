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

class VehicleDetailService {
  /**
   * Transform vehicle detail request to FailedVehicleDetailRequestDto
   * Used for pending and failed reports
   */
  transformFailedVehicleDetailRequest(request, user, paymentHistory) {
    return {
      id: request.Id,
      userId: request.PaymentHistoryId ? paymentHistory?.UserId : user?.Id,
      emailAddress: user?.Email || '',
      phoneNumber: user?.PhoneNumber || '',
      paymentDate: paymentHistory?.PaymentDate || request.CreatedAt,
      registrationNumber: request.RegistrationNumber,
      make: request.Make,
      model: request.Model,
      year: request.Year,
      trim: request.Trim,
      kmsDriven: request.KmsDriven,
      city: request.City,
      noOfOwners: request.NoOfOwners,
      version: request.Version,
      transactionType: request.TransactionType,
      customerType: request.CustomerType
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
   * Transform vehicle detail from database format (PascalCase) to API format (camelCase)
   * Matches .NET API VehicleDetailDto response format with sensitive data masking
   */
  transformVehicleDetail(vehicleDetail) {
    if (!vehicleDetail) return null;

    const data = vehicleDetail.toJSON ? vehicleDetail.toJSON() : vehicleDetail;

    // Mask sensitive fields - matches .NET HideSensitiveStringsInVehicleDetails
    const maskedOwnerName = this.maskSensitiveString(data.OwnerName);
    const maskedFatherName = this.maskSensitiveString(data.FatherName);
    const maskedPresentAddress = this.maskSensitiveString(data.PresentAddress);
    const maskedPermanentAddress = this.maskSensitiveString(data.PermanentAddress);
    const maskedMobileNumber = data.MobileNumber ?
      data.MobileNumber.substring(0, 2) + '******' + data.MobileNumber.slice(-2) : null;

    return {
      id: data.Id,
      clientId: data.ClientId || '',
      rcNumber: data.RegistrationNumber,
      registrationDate: data.RegistrationDate,
      ownerName: maskedOwnerName,
      fatherName: maskedFatherName || null,
      presentAddress: maskedPresentAddress || null,
      permanentAddress: maskedPermanentAddress || null,
      mobileNumber: maskedMobileNumber || null,
      vehicleCategory: data.VehicleCategory || null,
      vehicleChassisNumber: data.ChassisNumber,
      vehicleEngineNumber: data.EngineNumber,
      makerDescription: data.MakerDescription || data.Manufacturer || null,
      makerModel: data.MakerModel || data.Model || null,
      bodyType: data.BodyType || null,
      fuelType: data.FuelType,
      color: data.Color || '',
      normsType: data.NormsType || null,
      fitUpTo: data.FitUpTo || '',
      financer: data.Financer || null,
      financed: data.Financed || false,
      insuranceCompany: data.InsuranceCompany || null,
      insurancePolicyNumber: data.InsurancePolicyNumber || null,
      insuranceUpto: data.InsuranceValidUpto || null,
      manufacturingDate: data.ManufacturingDate || null,
      manufacturingDateFormatted: data.ManufacturingDateFormatted || null,
      registeredAt: data.RegisteredAt || null,
      latestBy: data.LatestBy || null,
      lessInfo: data.LessInfo || null,
      taxUpto: data.TaxUpto || null,
      taxPaidUpto: data.TaxPaidUpto || null,
      cubicCapacity: data.CubicCapacity || '',
      vehicleGrossWeight: data.VehicleGrossWeight || null,
      noCylinders: data.NoCylinders || null,
      seatCapacity: data.SeatCapacity || null,
      sleeperCapacity: data.SleeperCapacity || null,
      standingCapacity: data.StandingCapacity || null,
      wheelbase: data.Wheelbase || null,
      unladenWeight: data.UnladenWeight || null,
      vehicleCategoryDescription: data.VehicleCategoryDescription || null,
      puccNumber: data.PUCCNumber || null,
      puccUpto: data.PUCCUpto || null,
      permitNumber: data.PermitNumber || null,
      permitIssueDate: data.PermitIssueDate || null,
      permitValidFrom: data.PermitValidFrom || null,
      permitValidUpto: data.PermitValidUpto || null,
      permitType: data.PermitType || null,
      nationalPermitNumber: data.NationalPermitNumber || null,
      nationalPermitUpto: data.NationalPermitUpto || null,
      nationalPermitIssuedBy: data.NationalPermitIssuedBy || null,
      nonUseStatus: data.NonUseStatus || null,
      nonUseFrom: data.NonUseFrom || null,
      nonUseTo: data.NonUseTo || null,
      blacklistStatus: data.BlacklistStatus || null,
      nocDetails: data.NocDetails || null,
      ownerNumber: data.OwnerNumber || '',
      rcStatus: data.RcStatus || null,
      maskedName: data.MaskedName || '',
      challanDetails: data.ChallanDetails || null,
      variant: data.Variant || null
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
        userId
      } = request;

      if (!registrationNumber) {
        return Result.failure('Registration number is required');
      }

      // Get user - matches .NET logic: if userId not provided, get user from email
      let user;
      if (!userId || userId === 0) {
        user = await User.findOne({
          where: { NormalizedEmail: userEmail.toUpperCase() }
        });
      } else {
        user = await User.findByPk(userId);
      }

      if (!user) {
        return Result.failure('User not found');
      }

      const resolvedUserId = user.Id;

      // Check if entry already exists for THIS specific VehicleDetailRequestId
      // Each payment creates a unique VehicleDetailRequestId, so each payment should create a new entry
      if (vehicleDetailRequestId) {
        let vehicleDetail = await VehicleDetail.findOne({
          where: { VehicleDetailRequestId: vehicleDetailRequestId }
        });

        if (vehicleDetail) {
          logger.info(`Vehicle details already exist for this request: ${vehicleDetailRequestId}`);
          return Result.success(await this.buildVehicleDetailResponse(vehicleDetail, resolvedUserId));
        }
      }

      // Check if vehicle details exist for ANY user (to avoid calling Surepass API again)
      const existingVehicleDetail = await VehicleDetail.findOne({
        where: { RegistrationNumber: registrationNumber }
      });

      if (existingVehicleDetail) {
        // Vehicle data exists - replicate entry for this new request/payment
        logger.info(`Vehicle details found, creating new entry for request ${vehicleDetailRequestId}: ${registrationNumber}`);

        const maxVehicle = await VehicleDetail.findOne({
          attributes: [[sequelize.fn('MAX', sequelize.col('Id')), 'maxId']],
          raw: true
        });
        const nextId = (maxVehicle && maxVehicle.maxId) ? maxVehicle.maxId + 1 : 1;

        // Create new entry for this request with same vehicle data
        const existingData = existingVehicleDetail.toJSON();
        delete existingData.Id; // Remove old ID

        const vehicleDetail = await VehicleDetail.create({
          ...existingData,
          Id: nextId,
          UserId: resolvedUserId,
          VehicleDetailRequestId: vehicleDetailRequestId || null,
          CreatedAt: new Date()
        });

        logger.info(`Vehicle details created for request ${vehicleDetailRequestId}, user ${resolvedUserId}: ${registrationNumber}`);
        return Result.success(await this.buildVehicleDetailResponse(vehicleDetail, resolvedUserId));
      }

      // No existing data - Call Surepass API to fetch full RC details (uses rc-full endpoint)
      const rcResult = await surepassService.getRegistrationDetailsAsync(registrationNumber);

      if (!rcResult.isSuccess) {
        return Result.failure(rcResult.error);
      }

      // Save vehicle details to database with ALL fields from Surepass
      const rcData = rcResult.value;
      const maxVehicle = await VehicleDetail.findOne({
        attributes: [[sequelize.fn('MAX', sequelize.col('Id')), 'maxId']],
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

      vehicleDetail = await VehicleDetail.create({
        Id: nextId,
        UserId: resolvedUserId,
        VehicleDetailRequestId: vehicleDetailRequestId || null,
        // All Surepass rc-full fields
        ClientId: rcData.clientId,
        RegistrationNumber: rcData.rcNumber,
        RegistrationDate: registrationDate,
        OwnerName: rcData.ownerName,
        FatherName: rcData.fatherName,
        PresentAddress: rcData.presentAddress,
        PermanentAddress: rcData.permanentAddress,
        MobileNumber: rcData.mobileNumber,
        VehicleCategory: rcData.vehicleCategory,
        ChassisNumber: rcData.vehicleChassisNumber,
        EngineNumber: rcData.vehicleEngineNumber,
        MakerDescription: rcData.makerDescription,
        MakerModel: rcData.makerModel,
        // Also set legacy fields for backward compatibility
        Manufacturer: rcData.makerDescription,
        Model: rcData.makerModel,
        BodyType: rcData.bodyType,
        FuelType: rcData.fuelType,
        Color: rcData.color,
        NormsType: rcData.normsType,
        FitUpTo: rcData.fitUpTo,
        Financer: rcData.financer,
        Financed: rcData.financed,
        InsuranceCompany: rcData.insuranceCompany,
        InsurancePolicyNumber: rcData.insurancePolicyNumber,
        InsuranceValidUpto: rcData.insuranceUpto,
        ManufacturingDate: rcData.manufacturingDate,
        ManufacturingDateFormatted: rcData.manufacturingDateFormatted,
        RegisteredAt: rcData.registeredAt,
        LatestBy: rcData.latestBy,
        LessInfo: rcData.lessInfo,
        TaxUpto: rcData.taxUpto,
        TaxPaidUpto: rcData.taxPaidUpto,
        CubicCapacity: rcData.cubicCapacity,
        VehicleGrossWeight: rcData.vehicleGrossWeight,
        NoCylinders: rcData.noCylinders,
        SeatCapacity: rcData.seatCapacity,
        SleeperCapacity: rcData.sleeperCapacity,
        StandingCapacity: rcData.standingCapacity,
        Wheelbase: rcData.wheelbase,
        UnladenWeight: rcData.unladenWeight,
        VehicleCategoryDescription: rcData.vehicleCategoryDescription,
        PUCCNumber: rcData.puccNumber,
        PUCCUpto: rcData.puccUpto,
        PermitNumber: rcData.permitNumber,
        PermitIssueDate: rcData.permitIssueDate,
        PermitValidFrom: rcData.permitValidFrom,
        PermitValidUpto: rcData.permitValidUpto,
        PermitType: rcData.permitType,
        NationalPermitNumber: rcData.nationalPermitNumber,
        NationalPermitUpto: rcData.nationalPermitUpto,
        NationalPermitIssuedBy: rcData.nationalPermitIssuedBy,
        NonUseStatus: rcData.nonUseStatus,
        NonUseFrom: rcData.nonUseFrom,
        NonUseTo: rcData.nonUseTo,
        BlacklistStatus: rcData.blacklistStatus,
        NocDetails: rcData.nocDetails,
        OwnerNumber: rcData.ownerNumber,
        RcStatus: rcData.rcStatus,
        MaskedName: rcData.maskedName,
        ChallanDetails: rcData.challanDetails,
        Variant: rcData.variant,
        Status: 'Completed',
        CreatedAt: new Date()
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
            await this.saveChallanDetails(vehicleDetail.Id, challanResult.value.challans);
          }
        } catch (challanError) {
          logger.error('Error fetching challan details:', challanError);
          // Continue without challans - not critical
        }
      }

      // Return full response matching frontend expectations
      return Result.success(await this.buildVehicleDetailResponse(vehicleDetail, resolvedUserId));
    } catch (error) {
      logger.error('Get vehicle details error:', error);
      return Result.failure(error.message || 'Failed to get vehicle details');
    }
  }

  /**
   * Build full vehicle detail response with all related data
   * Used by both getVehicleDetailsByRCAsync and getVehicleDetailByIdAsync
   */
  async buildVehicleDetailResponse(vehicleDetail, userId) {
    const vehicleDetailId = vehicleDetail.Id;

    // Get challan details for this vehicle
    const challanDetails = await VehicleChallanDetail.findAll({
      where: { VehicleDetailId: vehicleDetailId },
      order: [['ChallanDate', 'DESC']]
    });

    // Check if vehicle is lost
    const lostVehicle = await LostVehicle.findOne({
      where: { RegistrationNumber: vehicleDetail.RegistrationNumber }
    });

    // Get NCRB report if exists
    const ncrbReport = await NcrbReport.findOne({
      where: { VehicleDetailId: vehicleDetailId }
    });

    // Get state from registration number
    const stateCode = vehicleDetail.RegistrationNumber ? vehicleDetail.RegistrationNumber.substring(0, 2) : '';
    const stateMapping = await StateMapping.findOne({
      where: { StateCode: stateCode }
    });

    // Get user vehicle detail for createdAt timestamp
    const userVehicleDetail = await UserVehicleDetail.findOne({
      where: { VehicleDetailId: vehicleDetailId, UserId: userId }
    });

    // Calculate vehicle age from ManufacturingDateFormatted
    const vehicleAge = this.calculateVehicleAge(vehicleDetail.ManufacturingDateFormatted);

    // Get vehicle specification using smart matching
    let vehicleSpecification = await this.findVehicleSpecification(vehicleDetail);

    // Transform challan details to match .NET VehicleChallanDetailDto
    const transformedChallans = challanDetails.map(challan => ({
      id: challan.Id,
      challanNumber: challan.ChallanNumber,
      challanDate: challan.ChallanDate,
      violationType: challan.ViolationType || challan.OffenseDetails,
      amount: challan.Amount ? parseFloat(challan.Amount) : null,
      status: challan.Status
    }));

    // Transform vehicle specification to match frontend VehicleSpecificationInterface (92+ fields)
    const transformedSpec = vehicleSpecification ? this.transformVehicleSpecification(vehicleSpecification) : null;

    // Return response matching frontend expectations
    return {
      vehicleDetail: this.transformVehicleDetail(vehicleDetail),
      vehicleChallanDetails: transformedChallans,
      vehicleSpecification: transformedSpec,
      ncrbReportAvailable: ncrbReport !== null,
      reportId: ncrbReport ? ncrbReport.Id : null,
      lostVehicle: lostVehicle !== null,
      createdAt: userVehicleDetail ? userVehicleDetail.CreatedAt : vehicleDetail.CreatedAt,
      vehicleAge: vehicleAge,
      state: stateMapping ? stateMapping.StateName : ''
    };
  }

  /**
   * Get vehicle detail by ID and user ID
   * Returns VehicleHistoryReportDetailDto matching .NET API
   */
  async getVehicleDetailByIdAsync(id, userId) {
    try {
      // Get vehicle detail by ID (not restricted by userId in .NET)
      const vehicleDetail = await VehicleDetail.findByPk(id);

      if (!vehicleDetail) {
        return Result.failure('Vehicle detail not found');
      }

      // Build the response using shared method
      const baseResponse = await this.buildVehicleDetailResponse(vehicleDetail, userId);

      // GET endpoint uses 'ncrbReportId' instead of 'reportId'
      const response = {
        ...baseResponse,
        ncrbReportId: baseResponse.reportId
      };
      delete response.reportId;

      return Result.success(response);
    } catch (error) {
      logger.error('Get vehicle detail by ID error:', error);
      return Result.failure(error.message || 'Failed to get vehicle detail');
    }
  }

  /**
   * Save challan details from Surepass API
   * Matches .NET ChallanService.SaveChallanDetailsAsync
   */
  async saveChallanDetails(vehicleDetailId, challans) {
    try {
      for (const challan of challans) {
        // Check if challan already exists
        const existing = await VehicleChallanDetail.findOne({
          where: {
            VehicleDetailId: vehicleDetailId,
            ChallanNumber: challan.challan_number
          }
        });

        if (!existing) {
          const maxChallan = await VehicleChallanDetail.findOne({
            attributes: [[sequelize.fn('MAX', sequelize.col('Id')), 'maxId']],
            raw: true
          });
          const nextId = (maxChallan && maxChallan.maxId) ? maxChallan.maxId + 1 : 1;

          await VehicleChallanDetail.create({
            Id: nextId,
            VehicleDetailId: vehicleDetailId,
            ChallanNumber: challan.challan_number,
            ChallanDate: challan.challan_date,
            ChallanPlace: challan.challan_place,
            State: challan.state,
            Rto: challan.rto,
            OffenseDetails: challan.offense_details,
            AccusedName: challan.accused_name,
            Amount: challan.amount,
            Status: challan.challan_status,
            CourtChallan: challan.court_challan,
            UpstreamCode: challan.upstream_code,
            CreatedAt: new Date()
          });
        }
      }
      logger.info(`Saved ${challans.length} challan details for vehicle ${vehicleDetailId}`);
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
          where: { Status: 1 }, // Successful payment
          required: true
        }],
        where: sequelize.literal('NOT EXISTS (SELECT 1 FROM VehicleDetails vd WHERE vd.VehicleDetailRequestId = vehicledetailrequests.Id)'),
        order: [['CreatedAt', 'DESC']],
        limit: 100
      });

      // Get user data for each request
      const transformedRequests = await Promise.all(failedRequests.map(async (request) => {
        const paymentHistory = request.PaymentHistory;
        const user = await User.findByPk(paymentHistory.UserId);
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
        where: { NormalizedEmail: userEmail.toUpperCase() }
      });

      if (!user) {
        return Result.failure('User not found');
      }

      // Get pending vehicle detail requests for this user
      const pendingRequests = await VehicleDetailRequest.findAll({
        include: [{
          model: PaymentHistory,
          as: 'PaymentHistory',
          where: { UserId: user.Id },
          required: true
        }],
        where: sequelize.literal('NOT EXISTS (SELECT 1 FROM VehicleDetails vd WHERE vd.VehicleDetailRequestId = vehicledetailrequests.Id)'),
        order: [['CreatedAt', 'DESC']],
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
   * @param {Object} vehicleDetail - Vehicle detail with MakerDescription/MakerModel
   * @param {string} requestMake - Make from request (optional)
   * @param {string} requestModel - Model from request (optional)
   * @param {string} requestVersion - Version from request (optional)
   */
  async findVehicleSpecification(vehicleDetail, requestMake = null, requestModel = null, requestVersion = null) {
    try {
      const { Op } = require('sequelize');

      // Priority 1: Use request params if provided (like .NET does)
      let make = requestMake;
      let model = requestModel;
      let version = requestVersion;

      // Priority 2: Extract from vehicle detail if request params not provided
      if (!make && vehicleDetail) {
        // Extract make from MakerDescription (e.g., "KIA INDIA PRIVATE LIMITED" -> "Kia")
        const makerDesc = vehicleDetail.MakerDescription || vehicleDetail.Manufacturer || '';
        make = this.extractMakeFromDescription(makerDesc);
      }

      if (!model && vehicleDetail) {
        // Extract model from MakerModel (e.g., "SELTOS G1.5 6MT HTE" -> "Seltos")
        const makerModel = vehicleDetail.MakerModel || vehicleDetail.Model || '';
        model = this.extractModelFromDescription(makerModel);
      }

      if (!make || !model) {
        logger.info('Cannot find specification: make or model not available');
        return null;
      }

      logger.info(`Finding specification for: make=${make}, model=${model}, version=${version}`);

      // Find candidates matching make and model (case-insensitive)
      const candidates = await VehicleSpecification.findAll({
        where: {
          naming_make: { [Op.like]: make },
          naming_model: { [Op.like]: `%${model}%` }
        },
        limit: 100
      });

      if (candidates.length === 0) {
        logger.info(`No specifications found for make=${make}, model=${model}`);
        return null;
      }

      logger.info(`Found ${candidates.length} specification candidates`);

      // If version provided, do fuzzy matching (like .NET does)
      if (version) {
        const versionParts = version.split(/\s+/).filter(p => p.length > 0);
        let bestMatch = null;
        let bestScore = 0;

        for (const candidate of candidates) {
          if (!candidate.naming_version) continue;

          const candidateParts = candidate.naming_version.split(/\s+/).filter(p => p.length > 0);
          let score = 0;

          for (let i = 0; i < Math.min(versionParts.length, candidateParts.length); i++) {
            if (versionParts[i].toLowerCase() === candidateParts[i].toLowerCase()) {
              score++;
            } else {
              break;
            }
          }

          if (score > bestScore) {
            bestScore = score;
            bestMatch = candidate;
          }
        }

        return bestMatch || candidates[0];
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
      'SIMPLE': 'Simple Energy'
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

    let modelWord = words[0];

    // Check if first word is a brand prefix - if so, use second word as model
    if (words.length > 1 && brandPrefixes.includes(words[0].toUpperCase())) {
      modelWord = words[1];
    }

    // Capitalize properly (e.g., "SELTOS" -> "Seltos", "PUNCH" -> "Punch")
    return modelWord.charAt(0).toUpperCase() + modelWord.slice(1).toLowerCase();
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
      maxpowerRpm: data.enginetransmission_maxpowerRPM,
      maxtorque: data.enginetransmission_maxtorque,
      transmission: data.keydata_key_transmission || data.enginetrans_transmission,
      transmissionDetails: data.enginetrans_transmission,

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
}

module.exports = new VehicleDetailService();
