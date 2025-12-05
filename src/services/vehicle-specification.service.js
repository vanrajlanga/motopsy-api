const VehicleSpecification = require('../models/vehicle-specification.model');
const Result = require('../utils/result');
const logger = require('../config/logger');
const obvService = require('./obv.service');
const { Op } = require('sequelize');
const { sequelize } = require('../config/database');

class VehicleSpecificationService {
  /**
   * Get vehicle specification by model
   * Matches .NET: Returns single VehicleSpecificationDto
   */
  async getByModelAsync(model) {
    try {
      if (!model) {
        return Result.failure('Model is required');
      }

      const specification = await VehicleSpecification.findOne({
        where: {
          naming_model: {
            [Op.like]: `%${model}%`
          }
        }
      });

      if (!specification) {
        return Result.success(null);
      }

      // Transform to VehicleSpecificationDto (camelCase)
      const dto = this.transformToDto(specification);

      logger.info(`Found specification for model: ${model}`);
      return Result.success(dto);
    } catch (error) {
      logger.error('Get vehicle specification error:', error);
      return Result.failure(error.message || 'Failed to get vehicle specification');
    }
  }

  /**
   * Get vehicles from specifications
   * Matches .NET: Returns IEnumerable<string> (list of makes, models, or years)
   */
  async getVehiclesFromSpecsAsync(request) {
    try {
      const { category, make, model, year } = request;
      let data = null;

      if (!make) {
        // Get distinct makes
        const makes = await VehicleSpecification.findAll({
          attributes: [[sequelize.fn('DISTINCT', sequelize.col('naming_make')), 'naming_make']],
          where: { naming_make: { [Op.ne]: null } },
          raw: true
        });
        data = makes.map(m => m.naming_make).filter(Boolean);
      } else if (make && !model) {
        // Get distinct models for make
        const models = await VehicleSpecification.findAll({
          attributes: [[sequelize.fn('DISTINCT', sequelize.col('naming_model')), 'naming_model']],
          where: {
            naming_make: { [Op.like]: `%${make}%` },
            naming_model: { [Op.ne]: null }
          },
          raw: true
        });
        data = models.map(m => m.naming_model).filter(Boolean);
      } else if (model && !year) {
        // Get data from OBV service (matching .NET logic)
        const catalogRequest = { category, make, model };
        const catalogResult = await obvService.getEnterpriseCatalogAsync(catalogRequest);
        if (catalogResult.isSuccess && catalogResult.value?.data) {
          data = catalogResult.value.data;
        } else {
          data = [];
        }
      } else if (year) {
        // Get data from OBV service with year
        const catalogRequest = { category, make, model, year };
        const catalogResult = await obvService.getEnterpriseCatalogAsync(catalogRequest);
        if (catalogResult.isSuccess && catalogResult.value?.data) {
          data = catalogResult.value.data;
        } else {
          data = [];
        }
      }

      logger.info(`Found ${data?.length || 0} vehicles matching criteria`);
      return Result.success(data || []);
    } catch (error) {
      logger.error('Get vehicles from specs error:', error);
      return Result.failure(error.message || 'Failed to get vehicles');
    }
  }

  /**
   * Transform to VehicleSpecificationDto (camelCase)
   */
  transformToDto(spec) {
    if (!spec) return null;

    return {
      id: spec.Id,
      versionId: spec.version_id,
      sourceUrl: spec.source_url,
      name: spec.naming_name,
      model: spec.naming_model,
      version: spec.naming_version,
      bodystyle: spec.naming_body_type,
      imageUrl: spec.pricing_image_url,
      price: spec.pricing_ex_showroom_price,
      onroadpriceDelhi: spec.pricing_on_road_price_delhi,
      keyDataPice: spec.keydata_key_price,
      mileageArai: spec.keydata_key_mileage_arai,
      engine: spec.keydata_key_engine,
      transmission: spec.keydata_key_transmission,
      fueltype: spec.keydata_key_fueltype,
      capacity: spec.keydata_key_seating_capacity,
      engineDetails: spec.spec_engine_details,
      engineType: spec.spec_engine_type,
      topSpeed: spec.spec_top_speed,
      accelerationSpeedKmph: spec.spec_acceleration_speed_kmph,
      engineFuel: spec.spec_fuel,
      maxpower: spec.spec_power_value,
      maxpowerRpm: spec.spec_power_rpm,
      maxtorque: spec.spec_torque_value,
      maxtorqueRpm: spec.spec_torque_rpm,
      driveTrain: spec.spec_drivetrain,
      transmissionDetails: spec.spec_transmission_value,
      emissionStandard: spec.spec_emission_standard,
      turbochargerSupercharger: spec.spec_turbo_supercharger,
      length: spec.spec_length,
      width: spec.spec_width,
      height: spec.spec_height,
      wheelbase: spec.spec_wheelbase,
      groundClearance: spec.spec_ground_clearance,
      kerbweight: spec.spec_kerb_weight,
      doors: spec.spec_doors,
      seatingCapacity: spec.spec_seating_capacity_value,
      noOfSeatingRows: spec.spec_no_of_seating_rows,
      bootspace: spec.spec_boot_space,
      fuelTankCapacity: spec.spec_fuel_tank_capacity,
      frontSuspension: spec.spec_front_suspension,
      rearSuspension: spec.spec_rear_suspension,
      frontBrakeType: spec.spec_front_brake_type,
      rearBrakeType: spec.spec_rear_brake_type,
      minimumTurningRadius: spec.spec_minimum_turning_radius,
      steeringType: spec.spec_steering_type,
      frontTyres: spec.spec_front_tyres,
      rearTyres: spec.spec_rear_tyres,
      airbags: spec.feature_airbags,
      abs: spec.feature_abs,
      ebd: spec.feature_ebd,
      centralLocking: spec.feature_central_locking,
      airConditioner: spec.feature_air_conditioner,
      powerSteering: spec.feature_power_steering,
      powerWindows: spec.feature_power_windows,
      sunroof: spec.feature_sunroof,
      fogLights: spec.feature_fog_lights,
      daytimeRunningLights: spec.feature_drl,
      cruiseControl: spec.feature_cruise_control,
      parkingSensors: spec.feature_parking_sensors,
      rearCamera: spec.feature_rear_camera,
      touchscreen: spec.feature_touchscreen,
      bluetoothConnectivity: spec.feature_bluetooth,
      usbPort: spec.feature_usb
    };
  }
}

module.exports = new VehicleSpecificationService();
