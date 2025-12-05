const VehicleDetail = require('../models/vehicle-detail.model');
const { sequelize } = require('../config/database');
const Result = require('../utils/result');
const logger = require('../config/logger');
const surepassService = require('./surepass.service');

class VehicleDetailService {
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
   */
  async getVehicleDetailsByRCAsync(request) {
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

      // Check if vehicle details already exist in database
      let vehicleDetail = await VehicleDetail.findOne({
        where: { RegistrationNumber: registrationNumber }
      });

      if (vehicleDetail) {
        logger.info(`Vehicle details found in database: ${registrationNumber}`);
        return Result.success(this.transformVehicleDetail(vehicleDetail));
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
        UserId: userId,
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
      return Result.success(this.transformVehicleDetail(vehicleDetail));
    } catch (error) {
      logger.error('Get vehicle details error:', error);
      return Result.failure(error.message || 'Failed to get vehicle details');
    }
  }

  /**
   * Get vehicle detail by ID and user ID
   */
  async getVehicleDetailByIdAsync(id, userId) {
    try {
      const vehicleDetail = await VehicleDetail.findOne({
        where: {
          Id: id,
          UserId: userId
        }
      });

      if (!vehicleDetail) {
        return Result.failure('Vehicle detail not found');
      }

      return Result.success(this.transformVehicleDetail(vehicleDetail));
    } catch (error) {
      logger.error('Get vehicle detail by ID error:', error);
      return Result.failure(error.message || 'Failed to get vehicle detail');
    }
  }

  /**
   * Get failed vehicle detail reports (admin only)
   */
  async getPaidVehicleDetailFailedReportsAsync() {
    try {
      const failedReports = await VehicleDetail.findAll({
        where: { Status: 'Failed' },
        order: [['CreatedAt', 'DESC']],
        limit: 100
      });

      const transformed = failedReports.map(report => this.transformVehicleDetail(report));
      return Result.success(transformed);
    } catch (error) {
      logger.error('Get failed reports error:', error);
      return Result.failure(error.message || 'Failed to get failed reports');
    }
  }

  /**
   * Get pending vehicle detail reports
   */
  async getPendingReportsAsync() {
    try {
      const pendingReports = await VehicleDetail.findAll({
        where: { Status: 'Pending' },
        order: [['CreatedAt', 'DESC']],
        limit: 100
      });

      const transformed = pendingReports.map(report => this.transformVehicleDetail(report));
      return Result.success(transformed);
    } catch (error) {
      logger.error('Get pending reports error:', error);
      return Result.failure(error.message || 'Failed to get pending reports');
    }
  }
}

module.exports = new VehicleDetailService();
