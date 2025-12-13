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

    // Map database columns to VehicleSpecificationDto (matching .NET)
    return {
      id: spec.id,
      versionId: spec.naming_versionId,
      sourceUrl: spec.naming_source_url,
      name: spec.naming_model,
      model: spec.naming_model,
      version: spec.naming_version,
      bodystyle: spec.naming_bodystyle,
      imageUrl: spec.naming_image_url,
      price: spec.price_breakdown_ex_showroom_price,
      onroadpriceDelhi: spec.naming_onroadprice_delhi,
      keyDataPice: spec.keydata_key_price,
      mileageArai: spec.keydata_key_mileage_arai,
      engine: spec.keydata_key_engine,
      transmission: spec.keydata_key_transmission,
      fueltype: spec.keydata_key_fueltype,
      capacity: spec.keydata_key_seatingcapacity,
      engineDetails: spec.enginetransmission_engine,
      engineType: spec.enginetransmission_engine_type,
      topSpeed: spec.enginetransmission_top_speed,
      accelerationSpeedKmph: spec.enginetransmission_acceoeration_0_100_kmph,
      engineFuel: spec.enginetransmission_fueltype,
      maxpower: spec.enginetransmission_maxpower,
      maxpowerRpm: spec.enginetransmission_maxpowerRPM,
      maxtorque: spec.enginetransmission_maxtorque,
      maxtorqueRpm: spec.enginetransmission_maxtorqueRPM,
      driveTrain: spec.enginetransmission_drivetrain,
      transmissionDetails: spec.enginetrans_transmission,
      emissionStandard: spec.enginetransmission_emissionstandard,
      turbochargerSupercharger: spec.enginetransm_turbocharger_supercharger,
      length: spec.dimensionweight_length,
      width: spec.dimensionweight_width,
      height: spec.dimensionweight_height,
      wheelbase: spec.dimensionweight_wheelbase,
      groundClearance: spec.dimensionweight_groundclearance,
      kerbweight: spec.dimensionweight_kerbweight,
      doors: spec.capacity_doors,
      seatingCapacity: spec.capacity_seating_capacity,
      noOfSeatingRows: spec.capacity_no_of_seating_rows,
      bootspace: spec.capacity_bootspace,
      fuelTankCapacity: spec.capacity_fuel_tank_capacity,
      frontSuspension: spec.suspension_brakes_steeringandtyres_front_suspension,
      rearSuspension: spec.suspension_brakes_steeringandtyres_rear_suspension,
      frontBrakeType: spec.suspension_brakes_steeringandtyres_front_brake_type,
      rearBrakeType: spec.suspension_brakes_steeringandtyres_rear_brake_type,
      minimumTurningRadius: spec.suspension_brakes_steeringandtyres_minimum_turning_radius,
      steeringType: spec.suspension_brakes_steeringandtyres_steering_type,
      frontTyres: spec.suspension_brakes_steeringandtyres_front_tyres,
      rearTyres: spec.suspension_brakes_steeringandtyres_rear_tyres,
      airbags: spec.safety_airbags,
      abs: spec.barking_and_traction_antilock_barking_system_abs,
      ebd: spec.barking_and_traction_electronic_brakeforce_distribution_ebd,
      centralLocking: spec.locks_and_security_central_locking,
      airConditioner: spec.comfort_and_convenience_air_conditioner,
      powerSteering: spec.suspension_brakes_steeringandtyres_steering_type,
      powerWindows: spec.doors_windows_mirrors_wipers_power_windows,
      sunroof: spec.exterior_sunroof_moonroof,
      fogLights: spec.lighting_fog_lights,
      daytimeRunningLights: spec.lighting_daytime_running_lights,
      cruiseControl: spec.comfort_and_convenience_cruise_control,
      parkingSensors: spec.comfort_and_convenience_parking_sensors,
      rearCamera: null,
      touchscreen: spec.ent_info_comm_display,
      bluetoothConnectivity: spec.ent_info_comm_bluetooth_compatibility,
      usbPort: spec.ent_info_comm_usb_compatibility
    };
  }
}

module.exports = new VehicleSpecificationService();
