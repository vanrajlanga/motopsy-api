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
   * Transform vehicle detail from database format (PascalCase) to API format (camelCase)
   * Matches .NET API VehicleDetailDto response format
   */
  transformVehicleDetail(vehicleDetail) {
    if (!vehicleDetail) return null;

    const data = vehicleDetail.toJSON ? vehicleDetail.toJSON() : vehicleDetail;

    return {
      id: data.Id,
      clientId: data.ClientId || '',
      rcNumber: data.RegistrationNumber,
      registrationDate: data.RegistrationDate,
      ownerName: data.OwnerName,
      fatherName: data.FatherName || null,
      presentAddress: data.PresentAddress || null,
      permanentAddress: data.PermanentAddress || null,
      mobileNumber: data.MobileNumber || null,
      vehicleCategory: data.VehicleCategory || null,
      vehicleChassisNumber: data.ChassisNumber,
      vehicleEngineNumber: data.EngineNumber,
      makerDescription: data.Manufacturer || null,
      makerModel: data.Model || null,
      bodyType: data.BodyType || null,
      fuelType: data.FuelType,
      color: data.Color || '',
      normsType: data.NormsType || null,
      fitUpTo: data.FitnessValidUpto || '',
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
      puccUpto: data.PUCValidUpto || null,
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

      // Check if vehicle details already exist in database
      let vehicleDetail = await VehicleDetail.findOne({
        where: { RegistrationNumber: registrationNumber }
      });

      if (vehicleDetail) {
        logger.info(`Vehicle details found in database: ${registrationNumber}`);
        // Return wrapped response matching .NET GetVehicleDetailsByRcNumberResponse
        return Result.success({
          vehicleDetail: this.transformVehicleDetail(vehicleDetail),
          challanDetails: {
            challans: [],
            blacklist: []
          }
        });
      }

      // Call Surepass API to fetch RC details
      const rcResult = await surepassService.verifyRCAsync(registrationNumber);

      if (!rcResult.isSuccess) {
        return Result.failure(rcResult.error);
      }

      // Save vehicle details to database
      const rcData = rcResult.value;
      const maxVehicle = await VehicleDetail.findOne({
        attributes: [[sequelize.fn('MAX', sequelize.col('Id')), 'maxId']],
        raw: true
      });
      const nextId = (maxVehicle && maxVehicle.maxId) ? maxVehicle.maxId + 1 : 1;

      vehicleDetail = await VehicleDetail.create({
        Id: nextId,
        UserId: resolvedUserId,
        RegistrationNumber: rcData.registrationNumber,
        OwnerName: rcData.ownerName,
        VehicleClass: rcData.vehicleClass,
        FuelType: rcData.fuelType,
        Manufacturer: rcData.manufacturer,
        Model: rcData.model,
        RegistrationDate: rcData.registrationDate,
        RegisteredAt: rcData.registeredAt,
        ChassisNumber: rcData.chassisNumber,
        EngineNumber: rcData.engineNumber,
        InsuranceCompany: rcData.insuranceCompany,
        InsuranceValidUpto: rcData.insuranceValidUpto,
        FitnessValidUpto: rcData.fitnessValidUpto,
        PUCValidUpto: rcData.pucValidUpto,
        Status: 'Completed',
        CreatedAt: new Date()
      });

      logger.info(`Vehicle details fetched and saved: ${registrationNumber}`);
      // Return wrapped response matching .NET GetVehicleDetailsByRcNumberResponse
      return Result.success({
        vehicleDetail: this.transformVehicleDetail(vehicleDetail),
        challanDetails: {
          challans: [],
          blacklist: []
        }
      });
    } catch (error) {
      logger.error('Get vehicle details error:', error);
      return Result.failure(error.message || 'Failed to get vehicle details');
    }
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

      // Get challan details for this vehicle
      const challanDetails = await VehicleChallanDetail.findAll({
        where: { VehicleDetailId: id },
        order: [['ChallanDate', 'DESC']]
      });

      // Check if vehicle is lost
      const lostVehicle = await LostVehicle.findOne({
        where: { RegistrationNumber: vehicleDetail.RegistrationNumber }
      });

      // Get NCRB report if exists
      const ncrbReport = await NcrbReport.findOne({
        where: { VehicleDetailId: id }
      });

      // Get state from registration number
      const stateCode = vehicleDetail.RegistrationNumber ? vehicleDetail.RegistrationNumber.substring(0, 2) : '';
      const stateMapping = await StateMapping.findOne({
        where: { StateCode: stateCode }
      });

      // Get user vehicle detail for createdAt timestamp
      const userVehicleDetail = await UserVehicleDetail.findOne({
        where: { VehicleDetailId: id, UserId: userId }
      });

      // Calculate vehicle age from ManufacturingDateFormatted
      const vehicleAge = this.calculateVehicleAge(vehicleDetail.ManufacturingDateFormatted);

      // Get vehicle specification (if available)
      let vehicleSpecification = null;
      if (vehicleDetail.Manufacturer && vehicleDetail.Model) {
        vehicleSpecification = await VehicleSpecification.findOne({
          where: {
            naming_make: vehicleDetail.Manufacturer,
            naming_model: vehicleDetail.Model
          }
        });
      }

      // Transform challan details to match .NET VehicleChallanDetailDto
      const transformedChallans = challanDetails.map(challan => ({
        id: challan.Id,
        challanNumber: challan.ChallanNumber,
        challanDate: challan.ChallanDate,
        violationType: challan.ViolationType,
        amount: challan.Amount ? parseFloat(challan.Amount) : null,
        status: challan.Status
      }));

      // Transform vehicle specification to match .NET VehicleSpecificationDto
      const transformedSpec = vehicleSpecification ? {
        make: vehicleSpecification.naming_make,
        model: vehicleSpecification.naming_model,
        version: vehicleSpecification.naming_version,
        price: vehicleSpecification.naming_price,
        keyPrice: vehicleSpecification.keydata_key_price,
        mileageArai: vehicleSpecification.keydata_key_mileage_arai,
        engine: vehicleSpecification.keydata_key_engine,
        transmission: vehicleSpecification.keydata_key_transmission,
        fuelType: vehicleSpecification.keydata_key_fueltype,
        seatingCapacity: vehicleSpecification.keydata_key_seatingcapacity,
        engineDetails: vehicleSpecification.enginetransmission_engine,
        maxPower: vehicleSpecification.enginetransmission_maxpower,
        maxTorque: vehicleSpecification.enginetransmission_maxtorque,
        length: vehicleSpecification.dimensionweight_length,
        width: vehicleSpecification.dimensionweight_width,
        height: vehicleSpecification.dimensionweight_height,
        wheelbase: vehicleSpecification.dimensionweight_wheelbase,
        bootspace: vehicleSpecification.capacity_bootspace,
        description: vehicleSpecification.Description,
        fastTag: ''
      } : null;

      // Return response matching .NET VehicleHistoryReportDetailDto
      const response = {
        ncrbReportAvailable: ncrbReport !== null,
        ncrbReportId: ncrbReport ? ncrbReport.Id : null,
        lostVehicle: lostVehicle !== null,
        vehicleAge: vehicleAge,
        vehicleDetail: this.transformVehicleDetail(vehicleDetail),
        vehicleChallanDetails: transformedChallans,
        vehicleSpecification: transformedSpec,
        createdAt: userVehicleDetail ? userVehicleDetail.CreatedAt : vehicleDetail.CreatedAt,
        state: stateMapping ? stateMapping.StateName : ''
      };

      return Result.success(response);
    } catch (error) {
      logger.error('Get vehicle detail by ID error:', error);
      return Result.failure(error.message || 'Failed to get vehicle detail');
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
        where: sequelize.literal('NOT EXISTS (SELECT 1 FROM vehicledetails vd WHERE vd.VehicleDetailRequestId = VehicleDetailRequest.Id)'),
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
        where: sequelize.literal('NOT EXISTS (SELECT 1 FROM vehicledetails vd WHERE vd.VehicleDetailRequestId = VehicleDetailRequest.Id)'),
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
}

module.exports = new VehicleDetailService();
