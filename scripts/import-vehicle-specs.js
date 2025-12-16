const XLSX = require('xlsx');
const path = require('path');
const mysql = require('mysql2/promise');
require('dotenv').config();

// Column mapping: Excel index -> DB column name
const columnMapping = {
  0: 'naming_versionId',
  1: 'naming_source_url',
  2: 'naming_make',
  3: 'naming_model',
  4: 'naming_version',
  5: 'naming_bodystyle',
  6: 'naming_notes', // Discontinued
  7: 'naming_image_url',
  8: 'naming_price',
  9: 'naming_onroadprice_delhi',
  10: 'keydata_key_price',
  11: 'keydata_key_mileage_arai',
  12: 'keydata_key_engine',
  13: 'keydata_key_transmission',
  14: 'keydata_key_fueltype',
  15: 'keydata_key_seatingcapacity',
  16: 'enginetransmission_engine',
  17: 'enginetransmission_engine_type',
  18: 'enginetransmission_top_speed',
  19: 'enginetransmission_acceoeration_0_100_kmph',
  20: 'enginetransmission_fueltype',
  21: 'enginetransmission_maxpower',
  22: 'enginetransmission_maxpowerRPM',
  23: 'enginetransmission_maxtorque',
  24: 'enginetransmission_maxtorqueRPM',
  25: 'enginetransmission_performanceonalternatefuel',
  26: 'enginetransmission_maxengineperformance',
  27: 'enginetransmission_maxmotorperformance',
  28: 'enginetransmission_mileage_arai',
  30: 'enginetransmission_driving_range',
  31: 'enginetransmission_drivetrain',
  32: 'enginetrans_transmission',
  33: 'enginetransmission_emissionstandard',
  34: 'enginetransm_turbocharger_supercharger',
  35: 'enginetransmission_battery',
  36: 'enginetransmission_battery_charging',
  37: 'enginetransmission_electric_motor',
  38: 'enginetransmission_others',
  39: 'enginetransmission_alternatefuel',
  40: 'dimensionweight_length',
  41: 'dimensionweight_width',
  42: 'dimensionweight_height',
  43: 'dimensionweight_wheelbase',
  44: 'dimensionweight_groundclearance',
  45: 'dimensionweight_kerbweight',
  46: 'capacity_doors',
  47: 'capacity_seating_capacity',
  48: 'capacity_no_of_seating_rows',
  49: 'capacity_bootspace',
  50: 'capacity_fuel_tank_capacity',
  51: 'suspension_brakes_steeringandtyres_front_suspension',
  52: 'suspension_brakes_steeringandtyres_rear_suspension',
  53: 'suspension_brakes_steeringandtyres_front_brake_type',
  54: 'suspension_brakes_steeringandtyres_rear_brake_type',
  55: 'suspension_brakes_steeringandtyres_minimum_turning_radius',
  56: 'suspension_brakes_steeringandtyres_steering_type',
  57: 'suspension_brakes_steeringandtyres_wheels',
  58: 'suspension_brakes_steeringandtyres_spare_wheels',
  59: 'suspension_brakes_steeringandtyres_front_tyres',
  60: 'suspension_brakes_steeringandtyres_rear_tyres',
  61: 'suspension_brakes_steeringandtyres_four_wheel_steering',
  63: 'safety_overspeed_warning',
  64: 'safety_lane_deprature_warning',
  65: 'safety_emergency_brake_light_flashing',
  66: 'safety_forward_collision_warning_fcw',
  67: 'safety_automatic_emergency_braking_aeb',
  68: 'safety_high_beam_assist',
  69: 'safety_ncap_rating',
  70: 'safety_blind_spot_detection',
  71: 'safety_lane_departure_prevention',
  72: 'safety_puncture_repair_kit',
  73: 'safety_cross_traffic_assist',
  74: 'safety_airbags',
  75: 'safety_middle_rear_three_point_seatbelt',
  76: 'safety_middle_rear_heardest',
  77: 'safety_tyre_pressure_monitoring_system_tpms',
  78: 'safety_child_seat_anchor_points',
  79: 'safety_seatbelt_warning',
  80: 'barking_and_traction_antilock_barking_system_abs',
  81: 'barking_and_traction_electronic_brakeforce_distribution_ebd',
  82: 'barking_and_traction_brake_assist_ba',
  83: 'barking_and_traction_electronic_stability_program',
  84: 'barking_and_traction_four_wheel_drive',
  85: 'barking_and_traction_hill_hold_control',
  86: 'barking_and_traction_traction_control_system_tc_tcs',
  87: 'barking_and_traction_ride_height_adjustment',
  88: 'barking_and_traction_hill_descent_control',
  89: 'barking_and_traction_limited_slip_differential_lsd',
  90: 'barking_and_traction_differential_lock',
  91: 'locks_and_security_engine_immobilizer',
  92: 'locks_and_security_central_locking',
  93: 'locks_and_security_speed_sensing_doorlock',
  94: 'locks_and_security_child_safety_lock',
  95: 'comfort_and_convenience_air_conditioner',
  96: 'comfort_and_convenience_front_ac',
  97: 'comfort_and_convenience_rear_ac',
  98: 'comfort_and_conv_headlight_and_ignition_on_reminder',
  99: 'comfort_and_convenience_keyless_start_button_start',
  100: 'comfort_and_convenience_steering_adjustment',
  101: 'comfort_and_convenience_12v_power_outlets',
  102: 'comfort_and_convenience_cruise_control',
  103: 'comfort_and_convenience_parking_sensors',
  104: 'comfort_and_convenience_parking_assist',
  105: 'comfort_and_convenience_antiglare_mirrors',
  106: 'comfort_and_convenience_vanity_mirrors_on_sunvisors',
  107: 'comfort_and_convenience_heater',
  108: 'comfort_and_convenience_cabin_bootaccess',
  109: 'comfort_and_convenience_third_row_ac',
  110: 'telematics_remote_car_light_flashing_and_honking_via_app',
  111: 'telematics_geofence',
  112: 'telematics_remote_sunroof_open_close_via_app',
  113: 'telematics_over_the_air_updates_ota',
  114: 'telematics_check_vehicle_status_via_app',
  115: 'telematics_remote_car_lock_unlock_via_app',
  116: 'telematics_emergency_call',
  117: 'telematics_find_my_car',
  118: 'telematics_remote_ac_on_off_via_app',
  119: 'telematics_alexa_compatibility',
  120: 'seats_and_upholstery_driver_seat_adjustment',
  121: 'seats_and_upholstery_front_passenger_seat_adjustment',
  122: 'seats_and_upholstery_rear_row_seat_adjustment',
  123: 'seats_and_upholstery_third_row_seat_adjustment',
  124: 'seats_and_upholstery_seat_upholstery',
  125: 'seats_and_upholstery_leather_wrapped_steering_wheel',
  126: 'seats_and_upholstery_leather_wrapped_gear_knob',
  127: 'seats_and_upholstery_driver_armrest',
  128: 'seats_and_upholstery_rear_passenger_seats_type',
  129: 'seats_and_upholstery_third_row_seats_type',
  130: 'seats_and_upholstery_ventilated_seats',
  131: 'seats_and_upholstery_ventilated_seat_type',
  132: 'seats_and_upholstery_interiors',
  133: 'seats_and_upholstery_interiors_colours',
  134: 'seats_and_upholstery_rear_armrest',
  135: 'seats_and_upholstery_folding_rear_seat',
  136: 'seats_and_upholstery_split_rear_seat',
  137: 'seats_and_upholstery_split_third_row_seat',
  138: 'seats_and_upholstery_front_seat_pocket',
  139: 'seats_and_upholstery_headrests',
  140: 'seats_and_upholstery_fourth_row_seat_adjustment',
  141: 'storage_cup_holders',
  142: 'storage_driver_armrest_storage',
  143: 'storage_cooled_glove_box',
  144: 'storage_sunglass_holder',
  145: 'storage_third_row_cup_holders',
  146: 'doors_windows_mirrors_wipers_one_touch_down',
  147: 'doors_windows_mirrors_wipers_one_touch_up',
  148: 'doors_windows_mirrors_wipers_power_windows',
  149: 'doors_windows_mirrors_wipers_adjustable_orvm',
  150: 'doors_windows_mirrors_wipers_turn_indicators_on_orvm',
  151: 'doors_windows_mirrors_wipers_rear_defogger',
  152: 'doors_windows_mirrors_wipers_rear_wiper',
  153: 'doors_windows_mirrors_wipers_exterior_door_handles',
  154: 'doors_windows_mirrors_wipers_rain_sensing_wipers',
  155: 'doors_windows_mirrors_wipers_interior_door_handles',
  156: 'doors_windows_mirrors_wipers_exterior_door_pockets',
  157: 'doors_windows_mirrors_wipers_side_window_blinds',
  158: 'doors_windows_mirrors_wipers_bootild_opener',
  159: 'doors_windows_mirrors_wipers_rear_windshield_blind',
  161: 'doors_windows_mirrors_wipers_scuff_plates',
  162: 'exterior_sunroof_moonroof',
  164: 'exterior_roof_mounted_antenna',
  165: 'exterior_body_coloured_bumpers',
  166: 'exterior_chrome_finish_exhaust_pipe',
  167: 'exterior_body_kit',
  168: 'exterior_rub_strips',
  169: 'lighting_fog_lights',
  170: 'lighting_daytime_running_lights',
  171: 'lighting_headlights',
  172: 'lighting_automatic_head_lamps',
  173: 'lighting_followme_home_headlamps',
  174: 'lighting_tail_lights',
  175: 'lighting_cabin_lamps',
  176: 'lighting_headlight_height_adjuster',
  177: 'lighting_glove_box_lamp',
  178: 'lighting_lights_on_vanity_mirrors',
  179: 'lighting_rear_reading_lamp',
  180: 'lighting_cornering_headlights',
  181: 'lighting_puddle_lamps',
  182: 'lighting_ambient_interior_lighting',
  183: 'instrumentation_instrument_cluster',
  184: 'instrumentation_trip_meter',
  185: 'instrumentation_average_fuel_consumption',
  186: 'instrumentation_average_speed',
  187: 'instrumentation_distance_to_empty',
  188: 'instrumentation_clock',
  189: 'instrumentation_low_fuel_level_warning',
  190: 'instrumentation_door_ajar_warning',
  191: 'instrumentation_adjustable_cluster_brightness',
  192: 'instrumentation_gear_indicator',
  193: 'instrumentation_shift_indicator',
  194: 'instrumentation_headsupdisplay_hud',
  195: 'instrumentation_techometer',
  196: 'instrumentation_instantaneous_consumption',
  197: 'ent_info_comm_smart_connectivity',
  198: 'ent_info_comm_integrated_indash_musicsystem',
  199: 'ent_info_comm_headunit_size',
  200: 'ent_info_comm_display',
  201: 'ent_info_comm_display_screen_for_rear_passengers',
  202: 'ent_info_comm_gps_navigation_system',
  203: 'ent_info_comm_speakers',
  204: 'ent_info_comm_usb_compatibility',
  205: 'ent_info_comm_aux_compatibility',
  206: 'ent_info_comm_bluetooth_compatibility',
  208: 'ent_info_comm_cd_player',
  209: 'ent_info_comm_dvd_playback',
  210: 'ent_info_comm_am_fm_radio',
  211: 'ent_info_comm_ipod_compatibility',
  212: 'ent_info_comm_internal_hard_drive',
  213: 'ent_info_comm_steering_mounted_controls',
  214: 'ent_info_comm_voice_command',
  215: 'ent_info_comm_wireless_charger',
  216: 'ent_info_comm_gesture_control',
  219: 'manufacturer_warranty_warranty_in_years',
  220: 'manufacturer_warranty_warranty_in_kms',
  221: 'manufacturer_warranty_battery_warranty_in_years',
  222: 'manufacturer_warranty_battery_warranty_in_kms',
  223: 'colors_color_name',
  224: 'colors_color_rgb',
  225: 'price_breakdown_ex_showroom_price',
  226: 'price_breakdown_rto',
  227: 'price_breakdown_insurance',
  228: 'price_breakdown_tax_collected_at_source_tcs',
  229: 'price_breakdown_handling_logistic_charges',
  230: 'price_breakdown_fast_tag',
  231: 'on_road_price_by_city_mumbai',
  232: 'on_road_price_by_city_bangalore',
  233: 'on_road_price_by_city_delhi',
  234: 'on_road_price_by_city_pune',
  235: 'on_road_price_by_city_navi_mumbai',
  236: 'on_road_price_by_city_hyderabad',
  237: 'on_road_price_by_city_Ahmedabad',
  238: 'on_road_price_by_city_chennai',
  239: 'on_road_price_by_city_kolkata',
  240: 'Description'
};

async function importData() {
  const filePath = path.join(__dirname, '..', '..', 'India-Car-Database-by-Teoalida-full-spec 03112025 (1).xlsx');

  console.log('Reading Excel file...');
  const workbook = XLSX.readFile(filePath);
  const sheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];
  const data = XLSX.utils.sheet_to_json(sheet, { header: 1 });

  console.log(`Found ${data.length - 1} rows to import`);

  // Connect to database
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'motopsy_db'
  });

  console.log('Connected to database');

  // Clear existing data (optional - comment out if you want to append)
  console.log('Clearing existing data...');
  await connection.execute('DELETE FROM vehicle_specifications');
  await connection.execute('ALTER TABLE vehicle_specifications AUTO_INCREMENT = 1');

  // Prepare insert query
  const columns = Object.values(columnMapping);
  const placeholders = columns.map(() => '?').join(', ');
  const insertQuery = `INSERT INTO vehicle_specifications (${columns.join(', ')}) VALUES (${placeholders})`;

  // Process in batches
  const BATCH_SIZE = 500;
  let inserted = 0;
  let errors = 0;

  console.log('Starting import...');

  for (let i = 1; i < data.length; i += BATCH_SIZE) {
    const batch = data.slice(i, Math.min(i + BATCH_SIZE, data.length));

    for (const row of batch) {
      try {
        const values = Object.keys(columnMapping).map(idx => {
          const value = row[parseInt(idx)];
          if (value === undefined || value === null || value === '') {
            return null;
          }
          return String(value);
        });

        await connection.execute(insertQuery, values);
        inserted++;
      } catch (err) {
        errors++;
        if (errors <= 5) {
          console.error(`Error inserting row ${i}: ${err.message}`);
        }
      }
    }

    console.log(`Progress: ${Math.min(i + BATCH_SIZE - 1, data.length - 1)}/${data.length - 1} rows processed`);
  }

  console.log(`\nImport completed!`);
  console.log(`Inserted: ${inserted} rows`);
  console.log(`Errors: ${errors} rows`);

  // Verify count
  const [result] = await connection.execute('SELECT COUNT(*) as count FROM vehicle_specifications');
  console.log(`Total records in table: ${result[0].count}`);

  // Show sample with ex-showroom price
  const [sample] = await connection.execute(`
    SELECT naming_make, naming_model, naming_version, price_breakdown_ex_showroom_price
    FROM vehicle_specifications
    WHERE price_breakdown_ex_showroom_price IS NOT NULL
    LIMIT 5
  `);
  console.log('\nSample records with prices:');
  console.table(sample);

  await connection.end();
}

importData().catch(err => {
  console.error('Import failed:', err);
  process.exit(1);
});
