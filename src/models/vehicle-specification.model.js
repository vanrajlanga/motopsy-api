const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

/**
 * VehicleSpecification model - matches .NET VehicleSpecification entity
 * Contains all 200+ fields for vehicle specifications
 */
const VehicleSpecification = sequelize.define('vehicle_specifications', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: false
  },
  // Naming & Basic Info
  naming_versionId: DataTypes.TEXT,
  naming_source_url: DataTypes.TEXT,
  naming_make: DataTypes.TEXT,
  naming_model: DataTypes.TEXT,
  naming_version: DataTypes.TEXT,
  naming_bodystyle: DataTypes.TEXT,
  naming_notes: DataTypes.TEXT,
  naming_image_url: DataTypes.TEXT,
  naming_price: DataTypes.TEXT,
  naming_onroadprice_delhi: DataTypes.TEXT,

  // Key Data
  keydata_key_price: DataTypes.TEXT,
  keydata_key_mileage_arai: DataTypes.TEXT,
  keydata_key_engine: DataTypes.TEXT,
  keydata_key_transmission: DataTypes.TEXT,
  keydata_key_fueltype: DataTypes.TEXT,
  keydata_key_seatingcapacity: DataTypes.TEXT,

  // Engine & Transmission
  enginetransmission_engine: DataTypes.TEXT,
  enginetransmission_engine_type: DataTypes.TEXT,
  enginetransmission_top_speed: DataTypes.TEXT,
  enginetransmission_acceoeration_0_100_kmph: DataTypes.TEXT,
  enginetransmission_fueltype: DataTypes.TEXT,
  enginetransmission_maxpower: DataTypes.TEXT,
  enginetransmission_maxpowerRPM: DataTypes.TEXT,
  enginetransmission_maxtorque: DataTypes.TEXT,
  enginetransmission_maxtorqueRPM: DataTypes.TEXT,
  enginetransmission_performanceonalternatefuel: DataTypes.TEXT,
  enginetransmission_maxengineperformance: DataTypes.TEXT,
  enginetransmission_maxmotorperformance: DataTypes.TEXT,
  enginetransmission_mileage_arai: DataTypes.TEXT,
  enginetransmission_powerconsumptionmileage: DataTypes.TEXT,
  enginetransmission_driving_range: DataTypes.TEXT,
  enginetransmission_drivetrain: DataTypes.TEXT,
  enginetrans_transmission: DataTypes.TEXT,
  enginetransmission_emissionstandard: DataTypes.TEXT,
  enginetransm_turbocharger_supercharger: DataTypes.TEXT,
  enginetransmission_battery: DataTypes.TEXT,
  enginetransmission_battery_charging: DataTypes.TEXT,
  enginetransmission_electric_motor: DataTypes.TEXT,
  enginetransmission_others: DataTypes.TEXT,
  enginetransmission_alternatefuel: DataTypes.TEXT,

  // Dimension & Weight
  dimensionweight_length: DataTypes.TEXT,
  dimensionweight_width: DataTypes.TEXT,
  dimensionweight_height: DataTypes.TEXT,
  dimensionweight_wheelbase: DataTypes.TEXT,
  dimensionweight_groundclearance: DataTypes.TEXT,
  dimensionweight_kerbweight: DataTypes.TEXT,

  // Capacity
  capacity_doors: DataTypes.TEXT,
  capacity_seating_capacity: DataTypes.TEXT,
  capacity_no_of_seating_rows: DataTypes.TEXT,
  capacity_bootspace: DataTypes.TEXT,
  capacity_fuel_tank_capacity: DataTypes.TEXT,

  // Suspension, Brakes, Steering & Tyres
  suspension_brakes_steeringandtyres_front_suspension: DataTypes.TEXT,
  suspension_brakes_steeringandtyres_rear_suspension: DataTypes.TEXT,
  suspension_brakes_steeringandtyres_front_brake_type: DataTypes.TEXT,
  suspension_brakes_steeringandtyres_rear_brake_type: DataTypes.TEXT,
  suspension_brakes_steeringandtyres_minimum_turning_radius: DataTypes.TEXT,
  suspension_brakes_steeringandtyres_steering_type: DataTypes.TEXT,
  suspension_brakes_steeringandtyres_wheels: DataTypes.TEXT,
  suspension_brakes_steeringandtyres_spare_wheels: DataTypes.TEXT,
  suspension_brakes_steeringandtyres_front_tyres: DataTypes.TEXT,
  suspension_brakes_steeringandtyres_rear_tyres: DataTypes.TEXT,
  suspension_brakes_steeringandtyres_four_wheel_steering: DataTypes.TEXT,
  suspension_brakes_steeringandtyrees_braking_performance: DataTypes.TEXT,

  // Safety
  safety_overspeed_warning: DataTypes.TEXT,
  safety_lane_deprature_warning: DataTypes.TEXT,
  safety_emergency_brake_light_flashing: DataTypes.TEXT,
  safety_forward_collision_warning_fcw: DataTypes.TEXT,
  safety_automatic_emergency_braking_aeb: DataTypes.TEXT,
  safety_high_beam_assist: DataTypes.TEXT,
  safety_ncap_rating: DataTypes.TEXT,
  safety_blind_spot_detection: DataTypes.TEXT,
  safety_lane_departure_prevention: DataTypes.TEXT,
  safety_puncture_repair_kit: DataTypes.TEXT,
  safety_cross_traffic_assist: DataTypes.TEXT,
  safety_airbags: DataTypes.TEXT,
  safety_middle_rear_three_point_seatbelt: DataTypes.TEXT,
  safety_middle_rear_heardest: DataTypes.TEXT,
  safety_tyre_pressure_monitoring_system_tpms: DataTypes.TEXT,
  safety_child_seat_anchor_points: DataTypes.TEXT,
  safety_seatbelt_warning: DataTypes.TEXT,

  // Braking & Traction
  barking_and_traction_antilock_barking_system_abs: DataTypes.TEXT,
  barking_and_traction_electronic_brakeforce_distribution_ebd: DataTypes.TEXT,
  barking_and_traction_brake_assist_ba: DataTypes.TEXT,
  barking_and_traction_electronic_stability_program: DataTypes.TEXT,
  barking_and_traction_four_wheel_drive: DataTypes.TEXT,
  barking_and_traction_hill_hold_control: DataTypes.TEXT,
  barking_and_traction_traction_control_system_tc_tcs: DataTypes.TEXT,
  barking_and_traction_ride_height_adjustment: DataTypes.TEXT,
  barking_and_traction_hill_descent_control: DataTypes.TEXT,
  barking_and_traction_limited_slip_differential_lsd: DataTypes.TEXT,
  barking_and_traction_differential_lock: DataTypes.TEXT,

  // Locks & Security
  locks_and_security_engine_immobilizer: DataTypes.TEXT,
  locks_and_security_central_locking: DataTypes.TEXT,
  locks_and_security_speed_sensing_doorlock: DataTypes.TEXT,
  locks_and_security_child_safety_lock: DataTypes.TEXT,

  // Comfort & Convenience
  comfort_and_convenience_air_conditioner: DataTypes.TEXT,
  comfort_and_convenience_front_ac: DataTypes.TEXT,
  comfort_and_convenience_rear_ac: DataTypes.TEXT,
  comfort_and_conv_headlight_and_ignition_on_reminder: DataTypes.TEXT,
  comfort_and_convenience_keyless_start_button_start: DataTypes.TEXT,
  comfort_and_convenience_steering_adjustment: DataTypes.TEXT,
  comfort_and_convenience_12v_power_outlets: DataTypes.TEXT,
  comfort_and_convenience_cruise_control: DataTypes.TEXT,
  comfort_and_convenience_parking_sensors: DataTypes.TEXT,
  comfort_and_convenience_parking_assist: DataTypes.TEXT,
  comfort_and_convenience_antiglare_mirrors: DataTypes.TEXT,
  comfort_and_convenience_vanity_mirrors_on_sunvisors: DataTypes.TEXT,
  comfort_and_convenience_heater: DataTypes.TEXT,
  comfort_and_convenience_cabin_bootaccess: DataTypes.TEXT,
  comfort_and_convenience_third_row_ac: DataTypes.TEXT,

  // Telematics
  telematics_remote_car_light_flashing_and_honking_via_app: DataTypes.TEXT,
  telematics_geofence: DataTypes.TEXT,
  telematics_remote_sunroof_open_close_via_app: DataTypes.TEXT,
  telematics_over_the_air_updates_ota: DataTypes.TEXT,
  telematics_check_vehicle_status_via_app: DataTypes.TEXT,
  telematics_remote_car_lock_unlock_via_app: DataTypes.TEXT,
  telematics_emergency_call: DataTypes.TEXT,
  telematics_find_my_car: DataTypes.TEXT,
  telematics_remote_ac_on_off_via_app: DataTypes.TEXT,
  telematics_alexa_compatibility: DataTypes.TEXT,

  // Seats & Upholstery
  seats_and_upholstery_driver_seat_adjustment: DataTypes.TEXT,
  seats_and_upholstery_front_passenger_seat_adjustment: DataTypes.TEXT,
  seats_and_upholstery_rear_row_seat_adjustment: DataTypes.TEXT,
  seats_and_upholstery_third_row_seat_adjustment: DataTypes.TEXT,
  seats_and_upholstery_seat_upholstery: DataTypes.TEXT,
  seats_and_upholstery_leather_wrapped_steering_wheel: DataTypes.TEXT,
  seats_and_upholstery_leather_wrapped_gear_knob: DataTypes.TEXT,
  seats_and_upholstery_driver_armrest: DataTypes.TEXT,
  seats_and_upholstery_rear_passenger_seats_type: DataTypes.TEXT,
  seats_and_upholstery_third_row_seats_type: DataTypes.TEXT,
  seats_and_upholstery_ventilated_seats: DataTypes.TEXT,
  seats_and_upholstery_ventilated_seat_type: DataTypes.TEXT,
  seats_and_upholstery_interiors: DataTypes.TEXT,
  seats_and_upholstery_interiors_colours: DataTypes.TEXT,
  seats_and_upholstery_rear_armrest: DataTypes.TEXT,
  seats_and_upholstery_folding_rear_seat: DataTypes.TEXT,
  seats_and_upholstery_split_rear_seat: DataTypes.TEXT,
  seats_and_upholstery_split_third_row_seat: DataTypes.TEXT,
  seats_and_upholstery_front_seat_pocket: DataTypes.TEXT,
  seats_and_upholstery_headrests: DataTypes.TEXT,
  seats_and_upholstery_fourth_row_seat_adjustment: DataTypes.TEXT,

  // Storage
  storage_cup_holders: DataTypes.TEXT,
  storage_driver_armrest_storage: DataTypes.TEXT,
  storage_cooled_glove_box: DataTypes.TEXT,
  storage_sunglass_holder: DataTypes.TEXT,
  storage_third_row_cup_holders: DataTypes.TEXT,

  // Doors, Windows, Mirrors & Wipers
  doors_windows_mirrors_wipers_one_touch_down: DataTypes.TEXT,
  doors_windows_mirrors_wipers_one_touch_up: DataTypes.TEXT,
  doors_windows_mirrors_wipers_power_windows: DataTypes.TEXT,
  doors_windows_mirrors_wipers_adjustable_orvm: DataTypes.TEXT,
  doors_windows_mirrors_wipers_turn_indicators_on_orvm: DataTypes.TEXT,
  doors_windows_mirrors_wipers_rear_defogger: DataTypes.TEXT,
  doors_windows_mirrors_wipers_rear_wiper: DataTypes.TEXT,
  doors_windows_mirrors_wipers_exterior_door_handles: DataTypes.TEXT,
  doors_windows_mirrors_wipers_rain_sensing_wipers: DataTypes.TEXT,
  doors_windows_mirrors_wipers_interior_door_handles: DataTypes.TEXT,
  doors_windows_mirrors_wipers_exterior_door_pockets: DataTypes.TEXT,
  doors_windows_mirrors_wipers_side_window_blinds: DataTypes.TEXT,
  doors_windows_mirrors_wipers_bootild_opener: DataTypes.TEXT,
  doors_windows_mirrors_wipers_rear_windshield_blind: DataTypes.TEXT,
  doors_windows_mirrors_wipers_outside_rearview_mirrors_orvms: DataTypes.TEXT,
  doors_windows_mirrors_wipers_scuff_plates: DataTypes.TEXT,

  // Exterior
  exterior_sunroof_moonroof: DataTypes.TEXT,
  exterior_roof_rails: DataTypes.TEXT,
  exterior_roof_mounted_antenna: DataTypes.TEXT,
  exterior_body_coloured_bumpers: DataTypes.TEXT,
  exterior_chrome_finish_exhaust_pipe: DataTypes.TEXT,
  exterior_body_kit: DataTypes.TEXT,
  exterior_rub_strips: DataTypes.TEXT,

  // Lighting
  lighting_fog_lights: DataTypes.TEXT,
  lighting_daytime_running_lights: DataTypes.TEXT,
  lighting_headlights: DataTypes.TEXT,
  lighting_automatic_head_lamps: DataTypes.TEXT,
  lighting_followme_home_headlamps: DataTypes.TEXT,
  lighting_tail_lights: DataTypes.TEXT,
  lighting_cabin_lamps: DataTypes.TEXT,
  lighting_headlight_height_adjuster: DataTypes.TEXT,
  lighting_glove_box_lamp: DataTypes.TEXT,
  lighting_lights_on_vanity_mirrors: DataTypes.TEXT,
  lighting_rear_reading_lamp: DataTypes.TEXT,
  lighting_cornering_headlights: DataTypes.TEXT,
  lighting_puddle_lamps: DataTypes.TEXT,
  lighting_ambient_interior_lighting: DataTypes.TEXT,

  // Instrumentation
  instrumentation_instrument_cluster: DataTypes.TEXT,
  instrumentation_trip_meter: DataTypes.TEXT,
  instrumentation_average_fuel_consumption: DataTypes.TEXT,
  instrumentation_average_speed: DataTypes.TEXT,
  instrumentation_distance_to_empty: DataTypes.TEXT,
  instrumentation_clock: DataTypes.TEXT,
  instrumentation_low_fuel_level_warning: DataTypes.TEXT,
  instrumentation_door_ajar_warning: DataTypes.TEXT,
  instrumentation_adjustable_cluster_brightness: DataTypes.TEXT,
  instrumentation_gear_indicator: DataTypes.TEXT,
  instrumentation_shift_indicator: DataTypes.TEXT,
  instrumentation_headsupdisplay_hud: DataTypes.TEXT,
  instrumentation_techometer: DataTypes.TEXT,
  instrumentation_instantaneous_consumption: DataTypes.TEXT,

  // Entertainment, Info & Communication
  ent_info_comm_smart_connectivity: DataTypes.TEXT,
  ent_info_comm_integrated_indash_musicsystem: DataTypes.TEXT,
  ent_info_comm_headunit_size: DataTypes.TEXT,
  ent_info_comm_display: DataTypes.TEXT,
  ent_info_comm_display_screen_for_rear_passengers: DataTypes.TEXT,
  ent_info_comm_gps_navigation_system: DataTypes.TEXT,
  ent_info_comm_speakers: DataTypes.TEXT,
  ent_info_comm_usb_compatibility: DataTypes.TEXT,
  ent_info_comm_aux_compatibility: DataTypes.TEXT,
  ent_info_comm_bluetooth_compatibility: DataTypes.TEXT,
  ent_info_comm_mp3_playback: DataTypes.TEXT,
  ent_info_comm_cd_player: DataTypes.TEXT,
  ent_info_comm_dvd_playback: DataTypes.TEXT,
  ent_info_comm_am_fm_radio: DataTypes.TEXT,
  ent_info_comm_ipod_compatibility: DataTypes.TEXT,
  ent_info_comm_internal_hard_drive: DataTypes.TEXT,
  ent_info_comm_steering_mounted_controls: DataTypes.TEXT,
  ent_info_comm_voice_command: DataTypes.TEXT,
  ent_info_comm_wireless_charger: DataTypes.TEXT,
  ent_info_comm_gesture_control: DataTypes.TEXT,

  // Additional seat adjustments
  rear_row_seat_adjustment: DataTypes.TEXT,
  rear_row_seat_base_sliding: DataTypes.TEXT,

  // Warranty
  manufacturer_warranty_warranty_in_years: DataTypes.TEXT,
  manufacturer_warranty_warranty_in_kms: DataTypes.TEXT,
  manufacturer_warranty_battery_warranty_in_years: DataTypes.TEXT,
  manufacturer_warranty_battery_warranty_in_kms: DataTypes.TEXT,

  // Colors
  colors_color_name: DataTypes.TEXT,
  colors_color_rgb: DataTypes.TEXT,

  // Price Breakdown
  price_breakdown_ex_showroom_price: DataTypes.TEXT,
  price_breakdown_rto: DataTypes.TEXT,
  price_breakdown_insurance: DataTypes.TEXT,
  price_breakdown_tax_collected_at_source_tcs: DataTypes.TEXT,
  price_breakdown_handling_logistic_charges: DataTypes.TEXT,
  price_breakdown_fast_tag: DataTypes.TEXT,

  // On-Road Prices by City
  on_road_price_by_city_mumbai: DataTypes.TEXT,
  on_road_price_by_city_bangalore: DataTypes.TEXT,
  on_road_price_by_city_delhi: DataTypes.TEXT,
  on_road_price_by_city_pune: DataTypes.TEXT,
  on_road_price_by_city_navi_mumbai: DataTypes.TEXT,
  on_road_price_by_city_hyderabad: DataTypes.TEXT,
  on_road_price_by_city_ahmedabad: DataTypes.TEXT,
  on_road_price_by_city_chennai: DataTypes.TEXT,
  on_road_price_by_city_kolkata: DataTypes.TEXT,

  description: DataTypes.TEXT
}, {
  tableName: 'vehicle_specifications',
  timestamps: false,
  underscored: false  // Override global setting - this table has mixed column naming
});

module.exports = VehicleSpecification;
