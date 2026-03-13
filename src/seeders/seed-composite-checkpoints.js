/**
 * Composite Checkpoint Seeder
 * Creates ~92 composite checkpoints that consolidate 428 granular parameters
 * into practical inspection points for 60-90 minute inspections.
 *
 * Run: node src/seeders/seed-composite-checkpoints.js
 * Idempotent: uses findOrCreate on param_number
 */

const { sequelize } = require('../config/database');
const InspectionParameter = require('../models/inspection-parameter.model');

// Standard option sets for composites
const OPT = {
  condition: {
    input_type: 'condition',
    option_1: 'Excellent', score_1: 0.00,
    option_2: 'Good',      score_2: 0.15,
    option_3: 'Fair',      score_3: 0.40,
    option_4: 'Poor',      score_4: 0.70,
    option_5: 'Critical',  score_5: 0.95,
  },
  noise: {
    input_type: 'noise',
    option_1: 'None',       score_1: 0.00,
    option_2: 'Faint',      score_2: 0.15,
    option_3: 'Noticeable', score_3: 0.40,
    option_4: 'Loud',       score_4: 0.70,
    option_5: 'Severe',     score_5: 0.95,
  },
  evidence: {
    input_type: 'evidence',
    option_1: 'None',      score_1: 0.00,
    option_2: 'Suspected', score_2: 0.40,
    option_3: 'Likely',    score_3: 0.75,
    option_4: 'Confirmed', score_4: 0.95,
    option_5: null, score_5: null,
  },
  operation: {
    input_type: 'condition',
    option_1: 'All Working',    score_1: 0.00,
    option_2: 'Minor Issues',   score_2: 0.15,
    option_3: 'Issues Found',   score_3: 0.40,
    option_4: 'Major Issues',   score_4: 0.70,
    option_5: 'Non-Functional', score_5: 0.95,
  },
  pass_fail: {
    input_type: 'pass_fail',
    option_1: 'Pass',     score_1: 0.00,
    option_2: 'Marginal', score_2: 0.45,
    option_3: 'Fail',     score_3: 0.95,
    option_4: null, score_4: null,
    option_5: null, score_5: null,
  },
};

// Sub-group IDs (from database)
const SG = {
  // Engine System
  cng_system: 1,
  combustion: 2,
  diagnostics: 3,
  diesel: 4,
  ev_powertrain: 5,
  fluids: 6,
  mounts_belts: 7,
  // Transmission
  drivetrain: 8,
  gearbox: 9,
  // Structural
  chassis_underbody: 10,
  frame_stamps: 11,
  panels_alignment: 12,
  pillars_roof: 13,
  seals_rubber: 14,
  // Paint
  cosmetic: 15,
  front_panels: 34,
  side_left: 35,
  side_right: 36,
  rear_panels: 37,
  roof_upper: 38,
  // Suspension
  brakes: 18,
  suspension: 19,
  tyres_wheels: 20,
  // Electrical
  controls_comfort: 21,
  lighting: 22,
  mirrors: 23,
  power_charging: 24,
  warnings: 25,
  wipers: 26,
  // Interior
  cabin: 27,
  equipment: 28,
  // Documentation
  registration: 29,
  service_history: 30,
  pdi_docs: 39,
  // Road Test
  comfort_handling: 31,
  driving_dynamics: 32,
  safety_response: 33,
};

/**
 * Composite checkpoint definitions.
 * Each entry creates one composite parameter.
 */
const COMPOSITES = [
  // ============================================================
  // MODULE 1: ENGINE SYSTEM (sg 1-7)
  // ============================================================

  // --- Fluids & Lubrication (sg 6) ---
  {
    param_number: 5001, name: 'Engine Oil Health', sub_group_id: SG.fluids,
    detail: 'Check dipstick: oil level, color (amber→black), contamination, leakage top & bottom, metal particles, sludge.',
    ...OPT.condition, fuel_filter: 'Petrol,Diesel,CNG,Hybrid',
    is_red_flag: 0,
    sub_items_json: [
      { label: 'Engine Oil Level', originalParams: [62] },
      { label: 'Engine Oil Color', originalParams: [58] },
      { label: 'Engine Oil Contamination', originalParams: [59] },
      { label: 'Engine Oil Leakage (Top)', originalParams: [61] },
      { label: 'Engine Oil Leakage (Bottom)', originalParams: [60] },
      { label: 'Metal Particles in Oil', redFlag: false, originalParams: [63] },
      { label: 'Oil Sludge Presence', originalParams: [64] },
    ],
  },
  {
    param_number: 5002, name: 'Coolant System Health', sub_group_id: SG.fluids,
    detail: 'Check reservoir: coolant level, color, and check for coolant-oil mixing (milky residue on cap/dipstick).',
    ...OPT.condition,
    is_red_flag: 1,
    sub_items_json: [
      { label: 'Coolant Level', originalParams: [56] },
      { label: 'Coolant Color', redFlag: true, originalParams: [55] },
      { label: 'Coolant-Oil Mixing', redFlag: true, originalParams: [57] },
    ],
  },
  {
    param_number: 5003, name: 'Brake Fluid Status', sub_group_id: SG.fluids,
    detail: 'Check brake fluid reservoir: level and contamination (dark/debris).',
    ...OPT.condition,
    is_red_flag: 0,
    sub_items_json: [
      { label: 'Brake Fluid Level', originalParams: [54] },
      { label: 'Brake Fluid Contamination', originalParams: [53] },
    ],
  },
  {
    param_number: 5004, name: 'Transmission Fluid Status', sub_group_id: SG.fluids,
    detail: 'Check transmission fluid: level and burn smell.',
    ...OPT.condition, fuel_filter: 'Petrol,Diesel,CNG,Hybrid',
    is_red_flag: 0,
    sub_items_json: [
      { label: 'Transmission Fluid Level', originalParams: [67] },
      { label: 'Transmission Fluid Burn Smell', originalParams: [66] },
    ],
  },
  {
    param_number: 5005, name: 'Power Steering Fluid', sub_group_id: SG.fluids,
    detail: 'Check power steering fluid level in reservoir.',
    ...OPT.condition, fuel_filter: 'Petrol,Diesel,CNG,Hybrid',
    is_red_flag: 0,
    sub_items_json: [{ label: 'Power Steering Fluid Level', originalParams: [65] }],
  },

  // --- Combustion & Internal Health (sg 2) ---
  {
    param_number: 5006, name: 'Engine Start & Idle', sub_group_id: SG.combustion,
    detail: 'Observe cold start, warm start, idle stability, and throttle response. Rate overall engine behavior.',
    ...OPT.condition, fuel_filter: 'Petrol,Diesel,CNG,Hybrid',
    is_red_flag: 0,
    sub_items_json: [
      { label: 'Cold Start Smoothness', originalParams: [14] },
      { label: 'Warm Start Smoothness', originalParams: [28] },
      { label: 'Idle Quality', originalParams: [18] },
      { label: 'Throttle Response Delay', originalParams: [25] },
    ],
  },
  {
    param_number: 5007, name: 'Engine Acoustic Assessment', sub_group_id: SG.combustion,
    detail: 'Listen to running engine for knocking, tapping, timing chain rattle, injector tick, and fuel pump whine.',
    ...OPT.noise, fuel_filter: 'Petrol,Diesel,CNG,Hybrid',
    is_red_flag: 0,
    sub_items_json: [
      { label: 'Knocking Noise', originalParams: [20] },
      { label: 'Tapping Noise', originalParams: [24] },
      { label: 'Timing Chain Noise', originalParams: [26] },
      { label: 'Fuel Injector Noise', originalParams: [73] },
      { label: 'Fuel Pump Sound', originalParams: [74] },
    ],
  },
  {
    param_number: 5008, name: 'Overheating Evidence', sub_group_id: SG.combustion,
    detail: 'Check for signs of engine overheating: warped head, blown gasket residue, steam traces, temp gauge behavior.',
    ...OPT.evidence,
    is_red_flag: 1,
    sub_items_json: [{ label: 'Overheating Evidence', redFlag: true, originalParams: [21] }],
  },
  {
    param_number: 5009, name: 'Radiator & Cooling', sub_group_id: SG.combustion,
    detail: 'Check radiator condition and fan operation.',
    ...OPT.condition,
    is_red_flag: 0,
    sub_items_json: [
      { label: 'Radiator Condition', originalParams: [22] },
      { label: 'Radiator Fan Operation', originalParams: [23] },
    ],
  },
  {
    param_number: 5010, name: 'Turbo/Intercooler System', sub_group_id: SG.combustion,
    detail: 'Check turbocharger performance and intercooler condition (turbo cars only).',
    ...OPT.condition, fuel_filter: 'Petrol,Diesel,CNG,Hybrid', feature_filter: 'turbo',
    is_red_flag: 0,
    sub_items_json: [
      { label: 'Turbo Charger Performance', originalParams: [27] },
      { label: 'Intercooler Condition', originalParams: [19] },
    ],
  },

  // --- Diagnostics & Electronics (sg 3) ---
  {
    param_number: 5011, name: 'OBD Diagnostic Scan', sub_group_id: SG.diagnostics,
    detail: 'Connect OBD scanner: check active/historical codes, ABS/Airbag/Emission modules, ECU tampering signs.',
    ...OPT.condition,
    is_red_flag: 1,
    sub_items_json: [
      { label: 'OBD Active Error Codes', originalParams: [34] },
      { label: 'OBD Historical Codes', originalParams: [35] },
      { label: 'ABS Module Codes', originalParams: [29] },
      { label: 'Airbag Module Codes', originalParams: [30] },
      { label: 'Emission System Codes', originalParams: [33] },
      { label: 'ECU Tampering Signs', redFlag: true, originalParams: [32] },
      { label: 'Compression Consistency', originalParams: [31] },
    ],
  },

  // --- Diesel Specific (sg 4) ---
  {
    param_number: 5012, name: 'Diesel System Assessment', sub_group_id: SG.diesel,
    detail: 'Check AdBlue/DEF level, DPF condition, EGR valve, injectors, fuel water separator, glow plugs.',
    ...OPT.condition, fuel_filter: 'Diesel',
    is_red_flag: 0,
    sub_items_json: [
      { label: 'AdBlue/DEF Level', originalParams: [36] },
      { label: 'Diesel Injector Performance', originalParams: [37] },
      { label: 'DPF Condition', originalParams: [38] },
      { label: 'EGR Valve Condition', originalParams: [39] },
      { label: 'Fuel Water Separator', originalParams: [40] },
      { label: 'Glow Plug Function', originalParams: [41] },
    ],
  },

  // --- EV Powertrain (sg 5) ---
  {
    param_number: 5013, name: 'EV Battery & Thermal', sub_group_id: SG.ev_powertrain,
    detail: 'Check HV battery SOH, 12V auxiliary battery health, battery cooling system, thermal management.',
    ...OPT.condition, fuel_filter: 'Electric,Hybrid',
    is_red_flag: 0,
    sub_items_json: [
      { label: 'HV Battery SOH', originalParams: [48] },
      { label: '12V Auxiliary Battery', originalParams: [42] },
      { label: 'Battery Cooling', originalParams: [43] },
      { label: 'Thermal Management System', originalParams: [52] },
    ],
  },
  {
    param_number: 5014, name: 'EV Motor & Charging', sub_group_id: SG.ev_powertrain,
    detail: 'Check motor noise/vibration, charging port, DC fast charge, L1/L2 charging, regen braking, HV cables.',
    ...OPT.condition, fuel_filter: 'Electric,Hybrid',
    is_red_flag: 1,
    sub_items_json: [
      { label: 'Electric Motor Noise', originalParams: [46] },
      { label: 'Electric Motor Vibration', originalParams: [47] },
      { label: 'Charging Port Condition', originalParams: [44] },
      { label: 'DC Fast Charge Test', originalParams: [45] },
      { label: 'L1/L2 Charging Test', originalParams: [50] },
      { label: 'Regenerative Braking', originalParams: [51] },
      { label: 'HV Cable Inspection', redFlag: true, originalParams: [49] },
    ],
  },

  // --- CNG System (sg 1) ---
  {
    param_number: 5015, name: 'CNG System Assessment', sub_group_id: SG.cng_system,
    detail: 'Full CNG system check: cylinder condition/expiry, valves, regulator, pipes, leak test, certification validity.',
    ...OPT.condition, fuel_filter: 'CNG',
    is_red_flag: 1,
    sub_items_json: [
      { label: 'CNG Cylinder Condition', originalParams: [2] },
      { label: 'CNG Cylinder Expiry', originalParams: [3] },
      { label: 'CNG Filling Valve', originalParams: [4] },
      { label: 'CNG High Pressure Pipe', originalParams: [6] },
      { label: 'CNG Kit Certification', originalParams: [7] },
      { label: 'CNG Leak Test', redFlag: true, originalParams: [8] },
      { label: 'CNG Low Pressure Pipe', originalParams: [9] },
      { label: 'CNG Pressure Gauge', originalParams: [10] },
      { label: 'CNG Pressure Regulator', originalParams: [11] },
      { label: 'CNG Solenoid Valve', originalParams: [12] },
      { label: 'CNG Switch Function', originalParams: [13] },
      { label: 'CNG Bracket Mount', originalParams: [1] },
      { label: 'CNG Fuel Line Clamps', originalParams: [5] },
    ],
  },

  // --- Mounts Belts & Mechanical (sg 7) ---
  {
    param_number: 5016, name: 'Engine Bay Mechanical', sub_group_id: SG.mounts_belts,
    detail: 'Visual check: belt condition, hose integrity, engine mounts, exhaust system, vacuum leaks.',
    ...OPT.condition, fuel_filter: 'Petrol,Diesel,CNG,Hybrid',
    is_red_flag: 0,
    sub_items_json: [
      { label: 'Belt Condition', originalParams: [70] },
      { label: 'Hose Condition', originalParams: [75] },
      { label: 'Engine Mount Condition', originalParams: [71] },
      { label: 'Exhaust System Condition', originalParams: [72] },
      { label: 'Vacuum Leak Detection', originalParams: [77] },
    ],
  },
  {
    param_number: 5017, name: 'Wiring Harness (Rodent Damage)', sub_group_id: SG.mounts_belts,
    detail: 'Inspect wiring harness for rodent/pest damage: chew marks, exposed wires, nesting material.',
    ...OPT.condition,
    is_red_flag: 0,
    sub_items_json: [{ label: 'Wiring Harness Rodent Damage', originalParams: [78] }],
  },
  {
    param_number: 5018, name: 'Air Filter Condition', sub_group_id: SG.mounts_belts,
    detail: 'Remove and inspect air filter element: cleanliness, clogging, damage.',
    ...OPT.condition, fuel_filter: 'Petrol,Diesel,CNG,Hybrid',
    is_red_flag: 0,
    sub_items_json: [{ label: 'Air Filter Condition', originalParams: [68] }],
  },
  {
    param_number: 5019, name: 'Battery Terminal Condition', sub_group_id: SG.mounts_belts,
    detail: 'Check battery terminals for corrosion, loose connections, acid buildup.',
    ...OPT.condition,
    is_red_flag: 0,
    sub_items_json: [{ label: 'Battery Terminal Corrosion', originalParams: [69] }],
  },

  // ============================================================
  // MODULE 2: TRANSMISSION & DRIVETRAIN (sg 8-9)
  // ============================================================

  // --- Drivetrain (sg 8) ---
  {
    param_number: 5020, name: 'CV Joint Assessment', sub_group_id: SG.drivetrain,
    detail: 'Check CV joint boots for tears/grease leakage. Listen for clicking noise on turns.',
    ...OPT.condition,
    is_red_flag: 0,
    sub_items_json: [
      { label: 'CV Joint Boot Condition', originalParams: [81] },
      { label: 'CV Joint Noise', originalParams: [82] },
    ],
  },
  {
    param_number: 5021, name: 'Drivetrain System', sub_group_id: SG.drivetrain,
    detail: 'AWD/4WD: check transfer case, differentials, driveshaft, axle play, prop shaft, mount bushes.',
    ...OPT.condition, is_active: 0, feature_filter: 'awd_4wd',
    is_red_flag: 1,
    sub_items_json: [
      { label: 'AWD System Operation', originalParams: [79] },
      { label: 'Axle Play', redFlag: true, originalParams: [80] },
      { label: 'Differential Noise', originalParams: [83] },
      { label: 'Driveshaft Alignment', redFlag: true, originalParams: [84] },
      { label: 'Drivetrain Vibration', originalParams: [85] },
      { label: 'Mount Bush Wear', originalParams: [86] },
      { label: 'Propeller Shaft Condition', originalParams: [87] },
      { label: 'Transfer Case Leakage', originalParams: [88] },
    ],
  },

  // --- Gearbox & Clutch (sg 9) ---
  {
    param_number: 5022, name: 'Manual Clutch System', sub_group_id: SG.gearbox,
    detail: 'Check clutch: pedal feel, bite height position, slippage under load.',
    ...OPT.condition, transmission_filter: 'Manual,AMT',
    is_red_flag: 0,
    sub_items_json: [
      { label: 'Clutch Pedal Feel', originalParams: [91] },
      { label: 'Clutch Bite Height', originalParams: [90] },
      { label: 'Clutch Slippage', originalParams: [92] },
    ],
  },
  {
    param_number: 5023, name: 'Manual Gearbox Operation', sub_group_id: SG.gearbox,
    detail: 'Shift through all gears: check engagement smoothness, grinding, selector response, neutral noise, reverse, linkage wear.',
    ...OPT.condition, transmission_filter: 'Manual',
    is_red_flag: 0,
    sub_items_json: [
      { label: 'Gear Engagement Smoothness', originalParams: [95] },
      { label: 'Gear Grinding', originalParams: [96] },
      { label: 'Gear Selector Response', originalParams: [97] },
      { label: 'Manual Linkage Wear', originalParams: [101] },
      { label: 'Neutral Gear Noise', originalParams: [102] },
      { label: 'Reverse Gear Smoothness', originalParams: [104] },
    ],
  },
  {
    param_number: 5024, name: 'Automatic Transmission Response', sub_group_id: SG.gearbox,
    detail: 'Check auto shift delay, torque converter response, parking pawl engagement.',
    ...OPT.condition, transmission_filter: 'Automatic,CVT,DCT,AMT',
    is_red_flag: 0,
    sub_items_json: [
      { label: 'Automatic Shift Delay', originalParams: [89] },
      { label: 'Torque Converter Delay', originalParams: [105] },
      { label: 'Parking Pawl Condition', originalParams: [103] },
      { label: 'CVT Belt Noise', originalParams: [93] },
      { label: 'Dual Clutch Jerk', originalParams: [94] },
    ],
  },
  {
    param_number: 5025, name: 'Transmission Physical Condition', sub_group_id: SG.gearbox,
    detail: 'Check for fluid leaks, mount condition, overheating signs, bearing noise, gear slipping, hill assist.',
    ...OPT.condition,
    is_red_flag: 1,
    sub_items_json: [
      { label: 'Transmission Fluid Leak', originalParams: [106] },
      { label: 'Transmission Mount Condition', originalParams: [107] },
      { label: 'Transmission Overheating Signs', originalParams: [108] },
      { label: 'Gear Slipping', redFlag: true, originalParams: [98] },
      { label: 'Gearbox Bearing Noise', originalParams: [99] },
      { label: 'Hill Assist Function', originalParams: [100] },
    ],
  },

  // ============================================================
  // MODULE 3: STRUCTURAL INTEGRITY (sg 10-14)
  // ============================================================

  // --- Chassis & Underbody (sg 10) ---
  {
    param_number: 5026, name: 'Chassis & Frame Integrity', sub_group_id: SG.chassis_underbody,
    detail: 'Check chassis rails, cross-members, subframe for straightness, damage, distortion.',
    ...OPT.condition, context_filter: 'lift_required',
    is_red_flag: 1,
    sub_items_json: [
      { label: 'Chassis Rail Straightness', redFlag: true, originalParams: [110] },
      { label: 'Cross-Member Alignment', redFlag: true, originalParams: [111] },
      { label: 'Subframe Condition', originalParams: [118] },
    ],
  },
  {
    param_number: 5027, name: 'Front Structure Assessment', sub_group_id: SG.chassis_underbody,
    detail: 'Check engine bay structure, firewall, crumple zone for accident damage evidence.',
    ...OPT.evidence,
    is_red_flag: 1,
    sub_items_json: [
      { label: 'Engine Bay Structure Damage', redFlag: true, originalParams: [113] },
      { label: 'Firewall Distortion', redFlag: true, originalParams: [114] },
      { label: 'Crumple Zone Damage', redFlag: true, originalParams: [112] },
    ],
  },
  {
    param_number: 5028, name: 'Underbody Condition', sub_group_id: SG.chassis_underbody,
    detail: 'Inspect underbody: corrosion coating, rust severity, floor pan welds, structural welding, boot floor, spare wheel well.',
    ...OPT.condition, context_filter: 'lift_required',
    is_red_flag: 0,
    sub_items_json: [
      { label: 'Underbody Corrosion Coating', originalParams: [119] },
      { label: 'Underbody Rust Severity', originalParams: [120] },
      { label: 'Floor Pan Weld Marks', originalParams: [115] },
      { label: 'Structural Welding Evidence', originalParams: [117] },
      { label: 'Boot Floor Integrity', originalParams: [109] },
      { label: 'Spare Wheel Well Deformation', originalParams: [116] },
    ],
  },

  // --- Frame & Stamps (sg 11) ---
  {
    param_number: 5029, name: 'VIN/Chassis Verification', sub_group_id: SG.frame_stamps,
    detail: 'Verify VIN plate authenticity and chassis stamping matches RC. Check for tampering signs.',
    ...OPT.evidence,
    is_red_flag: 1,
    sub_items_json: [
      { label: 'VIN Plate Tampering', redFlag: true, originalParams: [132] },
      { label: 'Chassis Stamping Mismatch', redFlag: true, originalParams: [121] },
    ],
  },
  {
    param_number: 5030, name: 'Repair/Accident Evidence', sub_group_id: SG.frame_stamps,
    detail: 'Check for signs of previous accident repair: quarter panel welds, structural adhesive, paint overspray in seals, replaced panels, door hinge welds.',
    ...OPT.evidence,
    is_red_flag: 0,
    sub_items_json: [
      { label: 'Quarter Panel Weld Marks', originalParams: [125] },
      { label: 'Structural Adhesive Signs', originalParams: [130] },
      { label: 'Paint Overspray Inside Seals', originalParams: [139] },
      { label: 'Replaced Structural Panel', originalParams: [141] },
      { label: 'Door Hinge Weld Marks', originalParams: [138] },
      { label: 'Front Apron Condition', originalParams: [123] },
      { label: 'Rear Apron Condition', originalParams: [126] },
      { label: 'Impact Bar Condition', originalParams: [124] },
      { label: 'Frame Symmetry', originalParams: [122] },
    ],
  },
  {
    param_number: 5031, name: 'Shock Mount & Side Sill', sub_group_id: SG.frame_stamps,
    detail: 'Check shock mount structure integrity, side sill condition, roof weld consistency.',
    ...OPT.condition,
    is_red_flag: 0,
    sub_items_json: [
      { label: 'Shock Mount Structure', originalParams: [128] },
      { label: 'Side Sill Integrity', originalParams: [129] },
      { label: 'Roof Weld Consistency', originalParams: [127] },
    ],
  },

  // --- Panels & Alignment (sg 12) ---
  {
    param_number: 5032, name: 'Hood & Boot Mechanism', sub_group_id: SG.panels_alignment,
    detail: 'Check bonnet/boot: hinge alignment, gas struts, stay rods, door check straps.',
    ...OPT.operation,
    is_red_flag: 0,
    sub_items_json: [
      { label: 'Bonnet Hinge Alignment', originalParams: [133] },
      { label: 'Bonnet Stay/Strut', originalParams: [134] },
      { label: 'Boot Hinge Alignment', originalParams: [135] },
      { label: 'Boot Strut', originalParams: [136] },
      { label: 'Door Check Strap', originalParams: [137] },
    ],
  },
  {
    param_number: 5033, name: 'Panel Gap Assessment', sub_group_id: SG.panels_alignment,
    detail: 'Check panel gaps for uniformity and seal tampering evidence.',
    ...OPT.condition,
    is_red_flag: 0,
    sub_items_json: [
      { label: 'Uneven Panel Gaps', originalParams: [143] },
      { label: 'Seal Tampering', originalParams: [142] },
    ],
  },

  // --- Pillars & Roof (sg 13) ---
  {
    param_number: 5034, name: 'Pillar Integrity', sub_group_id: SG.pillars_roof,
    detail: 'Inspect A, B, C pillars and check for cut-and-weld evidence (accident repair indicator).',
    ...OPT.condition,
    is_red_flag: 1,
    sub_items_json: [
      { label: 'A-Pillar Condition', redFlag: true, originalParams: [144] },
      { label: 'B-Pillar Condition', redFlag: true, originalParams: [145] },
      { label: 'C-Pillar Condition', originalParams: [146] },
      { label: 'Pillar Cut & Weld Evidence', redFlag: true, originalParams: [140] },
    ],
  },
  {
    param_number: 5035, name: 'Roof Structure', sub_group_id: SG.pillars_roof,
    detail: 'Check roof line straightness, roof rail alignment, roof repaint evidence.',
    ...OPT.condition,
    is_red_flag: 1,
    sub_items_json: [
      { label: 'Roof Line Straightness', redFlag: true, originalParams: [147] },
      { label: 'Roof Rail Alignment', originalParams: [148] },
      { label: 'Roof Repaint Sign', originalParams: [149] },
    ],
  },
  {
    param_number: 5036, name: 'Sunroof Integrity', sub_group_id: SG.pillars_roof,
    detail: 'Check sunroof seal condition and drainage system. Pour water test if possible.',
    ...OPT.condition, feature_filter: 'sunroof',
    is_red_flag: 0,
    sub_items_json: [
      { label: 'Sunroof Seal Condition', originalParams: [151] },
      { label: 'Sunroof Drainage Test', originalParams: [150] },
    ],
  },

  // --- Seals & Rubber (sg 14) ---
  {
    param_number: 5037, name: 'Weather Sealing', sub_group_id: SG.seals_rubber,
    detail: 'Check all rubber seals: doors, windshield, boot/tailgate for wear, tears, water ingress.',
    ...OPT.condition,
    is_red_flag: 0,
    sub_items_json: [
      { label: 'Door Rubber Seals', originalParams: [153] },
      { label: 'Windshield Seal', originalParams: [154] },
      { label: 'Boot/Tailgate Seal', originalParams: [152] },
    ],
  },

  // ============================================================
  // MODULE 4: PAINT & PANEL MAPPING (sg 15, 34-38)
  // ============================================================

  // --- Cosmetic & Consistency (sg 15) ---
  {
    param_number: 5038, name: 'Paint Quality Assessment', sub_group_id: SG.cosmetic,
    detail: 'Check paint: clear coat peeling, color mismatch between panels, overspray, edge seal paint breaks, OEM stickers.',
    ...OPT.condition,
    is_red_flag: 0,
    sub_items_json: [
      { label: 'Clear Coat Peel', originalParams: [155] },
      { label: 'Color Mismatch', originalParams: [156] },
      { label: 'Paint Overspray Detection', originalParams: [166] },
      { label: 'Edge Seal Paint Break', originalParams: [160] },
      { label: 'OEM Sticker Presence', originalParams: [165] },
    ],
  },
  {
    param_number: 5039, name: 'Glass Condition', sub_group_id: SG.cosmetic,
    detail: 'Check all glass: windshield chips/cracks, rear windshield, glass manufacturing year consistency, replacement evidence.',
    ...OPT.condition,
    is_red_flag: 0,
    sub_items_json: [
      { label: 'Windshield Chips/Cracks', originalParams: [177] },
      { label: 'Windshield Replaced', originalParams: [178] },
      { label: 'Rear Windshield Condition', originalParams: [168] },
      { label: 'Glass Mfg Year', originalParams: [161] },
    ],
  },
  {
    param_number: 5040, name: 'Cosmetic Damage Assessment', sub_group_id: SG.cosmetic,
    detail: 'Overall body: dents, scratches, stone chips, rust spots, paint consistency under hood/boot, door jambs.',
    ...OPT.condition, template_filter: 'used_car',
    is_red_flag: 0,
    sub_items_json: [
      { label: 'Dent Density (Overall)', originalParams: [157, 158] },
      { label: 'Scratch Density (Overall)', originalParams: [170, 171] },
      { label: 'Stone Chip Severity', originalParams: [172] },
      { label: 'Rust Spot Presence', originalParams: [169] },
      { label: 'Under Hood/Boot Paint Consistency', originalParams: [175, 176] },
      { label: 'Door Jamb Paint Consistency', originalParams: [159] },
    ],
  },
  {
    param_number: 5041, name: 'Lighting & Plate Condition', sub_group_id: SG.cosmetic,
    detail: 'Check headlight/tail light lens clarity, manufacturing year, number plate condition.',
    ...OPT.condition,
    is_red_flag: 0,
    sub_items_json: [
      { label: 'Headlight Lens Clarity', originalParams: [162] },
      { label: 'Headlight Mfg Year', originalParams: [163] },
      { label: 'Tail Light Lens Condition', originalParams: [173] },
      { label: 'Tail Light Mfg Year', originalParams: [174] },
      { label: 'Number Plate Condition', originalParams: [164] },
    ],
  },
  {
    param_number: 5042, name: 'Panel Gap & Fit', sub_group_id: SG.cosmetic,
    detail: 'Check panel gap uniformity across all panels.',
    ...OPT.condition,
    is_red_flag: 0,
    sub_items_json: [{ label: 'Panel Gap Uniformity', originalParams: [167] }],
  },

  // --- Front Section Panels (sg 34) ---
  {
    param_number: 5043, name: 'Front Exterior Condition', sub_group_id: SG.front_panels,
    detail: 'Walk-around front: bumper, hood, fenders, grille, headlights, fog lamps. Note damage, repaint, aftermarket parts.',
    ...OPT.condition,
    is_red_flag: 0,
    sub_items_json: [
      { label: 'Front Bumper Cover', originalParams: [379] },
      { label: 'Front Bumper Reinforcement', originalParams: [380] },
      { label: 'Bonnet/Hood', originalParams: [381] },
      { label: 'Left Front Fender', originalParams: [382] },
      { label: 'Right Front Fender', originalParams: [383] },
      { label: 'Front Grille', originalParams: [384] },
      { label: 'Headlight – Left', originalParams: [385] },
      { label: 'Headlight – Right', originalParams: [386] },
      { label: 'Fog Lamp Housing – Left', originalParams: [387] },
      { label: 'Fog Lamp Housing – Right', originalParams: [388] },
    ],
  },

  // --- Side Panels Left (sg 35) ---
  {
    param_number: 5044, name: 'Left Side Exterior', sub_group_id: SG.side_left,
    detail: 'Walk-around left side: both doors (outer & inner frame), side skirt, A/B/C pillars, quarter panel, ORVM housing.',
    ...OPT.condition,
    is_red_flag: 0,
    sub_items_json: [
      { label: 'Left Front Door Outer', originalParams: [389] },
      { label: 'Left Front Door Inner Frame', originalParams: [390] },
      { label: 'Left Rear Door Outer', originalParams: [391] },
      { label: 'Left Rear Door Inner Frame', originalParams: [392] },
      { label: 'Left Side Skirt', originalParams: [393] },
      { label: 'Left A/B/C Pillars', originalParams: [394, 395, 396] },
      { label: 'Left Quarter Panel', originalParams: [397] },
      { label: 'Left ORVM Housing', originalParams: [398] },
    ],
  },

  // --- Side Panels Right (sg 36) ---
  {
    param_number: 5045, name: 'Right Side Exterior', sub_group_id: SG.side_right,
    detail: 'Walk-around right side: both doors (outer & inner frame), side skirt, A/B/C pillars, quarter panel, ORVM housing.',
    ...OPT.condition,
    is_red_flag: 0,
    sub_items_json: [
      { label: 'Right Front Door Outer', originalParams: [399] },
      { label: 'Right Front Door Inner Frame', originalParams: [400] },
      { label: 'Right Rear Door Outer', originalParams: [401] },
      { label: 'Right Rear Door Inner Frame', originalParams: [402] },
      { label: 'Right Side Skirt', originalParams: [403] },
      { label: 'Right A/B/C Pillars', originalParams: [404, 405, 406] },
      { label: 'Right Quarter Panel', originalParams: [407] },
      { label: 'Right ORVM Housing', originalParams: [408] },
    ],
  },

  // --- Rear Section Panels (sg 37) ---
  {
    param_number: 5046, name: 'Rear Exterior Condition', sub_group_id: SG.rear_panels,
    detail: 'Walk-around rear: bumper, boot lid, rear windshield, tail lamps, reflectors, spoiler.',
    ...OPT.condition,
    is_red_flag: 0,
    sub_items_json: [
      { label: 'Rear Bumper Cover', originalParams: [409] },
      { label: 'Rear Bumper Reinforcement', originalParams: [410] },
      { label: 'Boot Lid/Tailgate', originalParams: [411] },
      { label: 'Rear Windshield', originalParams: [412] },
      { label: 'Tail Lamp – Left', originalParams: [413] },
      { label: 'Tail Lamp – Right', originalParams: [414] },
      { label: 'Rear Reflector Panels', originalParams: [415] },
      { label: 'Rear Spoiler', originalParams: [416] },
    ],
  },

  // --- Roof & Upper Structure (sg 38) ---
  {
    param_number: 5047, name: 'Roof Exterior', sub_group_id: SG.roof_upper,
    detail: 'Check roof panel, roof rails, sunroof panel, shark fin antenna for damage/replacement.',
    ...OPT.condition,
    is_red_flag: 0,
    sub_items_json: [
      { label: 'Roof Panel', originalParams: [417] },
      { label: 'Roof Rails', originalParams: [418] },
      { label: 'Sunroof Panel', originalParams: [419] },
      { label: 'Shark Fin Antenna Housing', originalParams: [420] },
    ],
  },

  // ============================================================
  // MODULE 5: SUSPENSION & BRAKES (sg 18-20)
  // ============================================================

  // --- Brakes (sg 18) ---
  {
    param_number: 5048, name: 'Brake Pad Condition', sub_group_id: SG.brakes,
    detail: 'Check all 4 brake pads: Front Left, Front Right, Rear Left, Rear Right. Measure thickness. Rate worst position.',
    ...OPT.condition, context_filter: 'lift_required',
    is_red_flag: 1,
    sub_items_json: [
      { label: 'Brake Pad Front Left', redFlag: true, originalParams: [244] },
      { label: 'Brake Pad Front Right', redFlag: true, originalParams: [245] },
      { label: 'Brake Pad Rear Left', redFlag: true, originalParams: [246] },
      { label: 'Brake Pad Rear Right', redFlag: true, originalParams: [247] },
    ],
  },
  {
    param_number: 5049, name: 'Brake Disc & Hydraulics', sub_group_id: SG.brakes,
    detail: 'Check brake discs for scoring/grooves, brake fluid leakage, brake line corrosion.',
    ...OPT.condition, context_filter: 'lift_required',
    is_red_flag: 1,
    sub_items_json: [
      { label: 'Brake Disc Scoring', originalParams: [241] },
      { label: 'Brake Fluid Leakage', redFlag: true, originalParams: [242] },
      { label: 'Brake Line Corrosion', redFlag: true, originalParams: [243] },
    ],
  },
  {
    param_number: 5050, name: 'Handbrake/Parking Brake', sub_group_id: SG.brakes,
    detail: 'Test handbrake holding force. Should hold vehicle firmly on slight incline.',
    ...OPT.pass_fail,
    is_red_flag: 1,
    sub_items_json: [{ label: 'Handbrake Holding', redFlag: true, originalParams: [248] }],
  },
  {
    param_number: 5051, name: 'ABS Function', sub_group_id: SG.brakes,
    detail: 'Test ABS function during braking. Check for pulsation and proper engagement.',
    ...OPT.operation, context_filter: 'road_test_required', is_active: 0,
    is_red_flag: 1,
    sub_items_json: [{ label: 'ABS Function', redFlag: true, originalParams: [240] }],
  },

  // --- Suspension (sg 19) ---
  {
    param_number: 5052, name: 'Shock Absorber Condition', sub_group_id: SG.suspension,
    detail: 'Check front and rear shock absorbers for oil leakage, damping performance.',
    ...OPT.condition, context_filter: 'lift_required',
    is_red_flag: 0,
    sub_items_json: [
      { label: 'Front Shock Leakage', originalParams: [252] },
      { label: 'Rear Shock Leakage', originalParams: [253] },
    ],
  },
  {
    param_number: 5053, name: 'Suspension Function', sub_group_id: SG.suspension,
    detail: 'Test suspension: bounce test, listen for noise, check anti-roll bar, ball joints, control arm bushes.',
    ...OPT.condition,
    is_red_flag: 1,
    sub_items_json: [
      { label: 'Suspension Noise', originalParams: [257] },
      { label: 'Suspension Rebound Test', originalParams: [258] },
      { label: 'Anti-Roll Bar Link', originalParams: [249] },
      { label: 'Ball Joint Play', redFlag: true, originalParams: [250] },
      { label: 'Control Arm Bush Wear', originalParams: [251] },
    ],
  },
  {
    param_number: 5054, name: 'Steering System', sub_group_id: SG.suspension,
    detail: 'Check steering: free play at wheel, column noise, rack leakage, wheel alignment, bearing noise.',
    ...OPT.condition,
    is_red_flag: 1,
    sub_items_json: [
      { label: 'Steering Free Play', redFlag: true, originalParams: [255] },
      { label: 'Steering Column Noise', originalParams: [254] },
      { label: 'Steering Rack Leakage', originalParams: [256] },
      { label: 'Wheel Alignment', originalParams: [259] },
      { label: 'Wheel Bearing Noise', originalParams: [260] },
    ],
  },

  // --- Tyres & Wheels (sg 20) ---
  {
    param_number: 5055, name: 'Tyre Condition', sub_group_id: SG.tyres_wheels,
    detail: 'Check all 4 tyres: tread depth (Front Left/Front Right/Rear Left/Rear Right), pressure, mfg year, uneven wear pattern. Rate worst tyre.',
    ...OPT.condition,
    is_red_flag: 1,
    sub_items_json: [
      { label: 'Tyre Tread Front Left', redFlag: true, originalParams: [265] },
      { label: 'Tyre Tread Front Right', redFlag: true, originalParams: [266] },
      { label: 'Tyre Tread Rear Left', redFlag: true, originalParams: [267] },
      { label: 'Tyre Tread Rear Right', redFlag: true, originalParams: [268] },
      { label: 'Tyre Pressure', originalParams: [264] },
      { label: 'Tyre Mfg Year', originalParams: [263] },
      { label: 'Uneven Tyre Wear', originalParams: [269] },
    ],
  },
  {
    param_number: 5056, name: 'Wheels & Spare', sub_group_id: SG.tyres_wheels,
    detail: 'Check alloy rims for curb damage, cracks. Inspect spare tyre condition.',
    ...OPT.condition,
    is_red_flag: 0,
    sub_items_json: [
      { label: 'Alloy Rim Damage', originalParams: [261] },
      { label: 'Spare Tyre Condition', originalParams: [262] },
    ],
  },

  // ============================================================
  // MODULE 6: ELECTRICAL & ELECTRONICS (sg 21-26)
  // ============================================================

  // --- Controls & Comfort (sg 21) ---
  {
    param_number: 5057, name: 'Climate Control', sub_group_id: SG.controls_comfort,
    detail: 'Test AC: compressor noise, cooling efficiency (temp drop), blower motor all speeds.',
    ...OPT.operation,
    is_red_flag: 0,
    sub_items_json: [
      { label: 'AC Compressor Noise', originalParams: [270] },
      { label: 'AC Cooling Efficiency', originalParams: [271] },
      { label: 'Blower Motor', originalParams: [272] },
    ],
  },
  {
    param_number: 5058, name: 'Power Windows', sub_group_id: SG.controls_comfort,
    detail: 'Test all 4 power windows: up/down operation, auto-up/down, speed.',
    ...OPT.operation,
    is_red_flag: 0,
    sub_items_json: [
      { label: 'Power Window Front Left', originalParams: [278] },
      { label: 'Power Window Front Right', originalParams: [279] },
      { label: 'Power Window Rear Left', originalParams: [280] },
      { label: 'Power Window Rear Right', originalParams: [281] },
    ],
  },
  {
    param_number: 5059, name: 'Infotainment & Connectivity', sub_group_id: SG.controls_comfort,
    detail: 'Test infotainment system, touchscreen response, USB ports, 12V socket.',
    ...OPT.operation,
    is_red_flag: 0,
    sub_items_json: [
      { label: 'Infotainment System', originalParams: [276] },
      { label: 'Touchscreen Response', originalParams: [285] },
      { label: 'USB Ports', originalParams: [305] },
      { label: '12V Socket', originalParams: [299] },
    ],
  },
  {
    param_number: 5060, name: 'Security & Access', sub_group_id: SG.controls_comfort,
    detail: 'Test remote key, central locking, immobilizer, fuel flap release.',
    ...OPT.operation,
    is_red_flag: 0,
    sub_items_json: [
      { label: 'Remote Key', originalParams: [282] },
      { label: 'Central Locking', originalParams: [273] },
      { label: 'Immobilizer Function', originalParams: [302] },
      { label: 'Fuel Flap Release', originalParams: [274] },
    ],
  },
  {
    param_number: 5061, name: 'Parking Aids', sub_group_id: SG.controls_comfort,
    detail: 'Test parking sensors and reverse camera.',
    ...OPT.operation, feature_filter: 'parking_sensors,rear_camera,360_camera',
    is_red_flag: 0,
    sub_items_json: [
      { label: 'Parking Sensors', originalParams: [277] },
      { label: 'Reverse Camera', originalParams: [283] },
    ],
  },
  {
    param_number: 5062, name: 'Sunroof & Horn', sub_group_id: SG.controls_comfort,
    detail: 'Test sunroof open/close/tilt operation. Test horn function.',
    ...OPT.operation,
    is_red_flag: 0,
    sub_items_json: [
      { label: 'Sunroof Operation', originalParams: [284] },
      { label: 'Horn Function', originalParams: [275] },
    ],
  },

  // --- Lighting (sg 22) ---
  {
    param_number: 5063, name: 'Exterior Lighting Suite', sub_group_id: SG.lighting,
    detail: 'Test all exterior lights: headlights (low/high), brake, indicators, hazard, fog, reverse.',
    ...OPT.operation,
    is_red_flag: 1,
    sub_items_json: [
      { label: 'Headlight Function', redFlag: true, originalParams: [289] },
      { label: 'Brake Light Function', redFlag: true, originalParams: [286] },
      { label: 'Indicator Function', redFlag: true, originalParams: [290] },
      { label: 'Hazard Light Function', redFlag: true, originalParams: [288] },
      { label: 'Fog Lamp Function', originalParams: [287] },
      { label: 'Reverse Light Function', originalParams: [291] },
    ],
  },

  // --- Mirrors (sg 23) ---
  {
    param_number: 5064, name: 'Mirror Systems', sub_group_id: SG.mirrors,
    detail: 'Test ORVMs: electric adjustment, fold function, glass condition both sides.',
    ...OPT.operation,
    is_red_flag: 0,
    sub_items_json: [
      { label: 'ORVM Adjustment', originalParams: [292] },
      { label: 'ORVM Condition Left', originalParams: [293] },
      { label: 'ORVM Condition Right', originalParams: [294] },
      { label: 'ORVM Fold Function', originalParams: [295] },
    ],
  },

  // --- Power & Charging (sg 24) ---
  {
    param_number: 5065, name: 'Battery & Charging System', sub_group_id: SG.power_charging,
    detail: 'Test battery health %, check mfg date, measure alternator voltage output.',
    ...OPT.condition,
    is_red_flag: 0,
    sub_items_json: [
      { label: 'Battery Health', originalParams: [297] },
      { label: 'Battery Mfg Date', originalParams: [298] },
      { label: 'Alternator Voltage', originalParams: [296] },
    ],
  },

  // --- Warnings & Systems (sg 25) ---
  {
    param_number: 5066, name: 'ABS Warning Light', sub_group_id: SG.warnings,
    detail: 'Check ABS warning light on dashboard. Should illuminate on ignition and turn off within seconds.',
    ...OPT.pass_fail,
    is_red_flag: 1,
    sub_items_json: [{ label: 'ABS Warning Light', redFlag: true, originalParams: [300] }],
  },
  {
    param_number: 5067, name: 'Airbag Warning Light', sub_group_id: SG.warnings,
    detail: 'Check airbag warning light. Should illuminate on ignition and turn off. Solid = airbag fault.',
    ...OPT.pass_fail,
    is_red_flag: 1,
    sub_items_json: [{ label: 'Airbag Warning Light', redFlag: true, originalParams: [301] }],
  },
  {
    param_number: 5068, name: 'Dashboard Warning Lights', sub_group_id: SG.warnings,
    detail: 'Check instrument cluster for any active warning lights and interior lighting function.',
    ...OPT.operation,
    is_red_flag: 0,
    sub_items_json: [
      { label: 'Instrument Cluster Warning', originalParams: [303] },
      { label: 'Interior Lighting', originalParams: [304] },
    ],
  },

  // --- Wipers & Visibility (sg 26) ---
  {
    param_number: 5069, name: 'Wipers & Visibility', sub_group_id: SG.wipers,
    detail: 'Test wipers: front/rear blade condition, motor function, washer jet spray, rear defogger.',
    ...OPT.operation,
    is_red_flag: 0,
    sub_items_json: [
      { label: 'Front Wiper Blade Condition', originalParams: [306] },
      { label: 'Rear Wiper Blade Condition', originalParams: [308] },
      { label: 'Wiper Motor Function', originalParams: [310] },
      { label: 'Washer Jet Function', originalParams: [309] },
      { label: 'Rear Defogger', originalParams: [307] },
    ],
  },

  // ============================================================
  // MODULE 7: INTERIOR & SAFETY (sg 27-28)
  // ============================================================

  // --- Cabin (sg 27) ---
  {
    param_number: 5070, name: 'Seat Condition & Function', sub_group_id: SG.cabin,
    detail: 'Check seat frame integrity, adjustment mechanism, rear seat fold function.',
    ...OPT.condition,
    is_red_flag: 0,
    sub_items_json: [
      { label: 'Seat Frame Integrity', originalParams: [319] },
      { label: 'Seat Adjustment', originalParams: [331] },
      { label: 'Rear Seat Fold', originalParams: [329] },
    ],
  },
  {
    param_number: 5071, name: 'Seatbelt System', sub_group_id: SG.cabin,
    detail: 'Test all seatbelts: lock mechanism (sharp pull test) and retractor function.',
    ...OPT.pass_fail,
    is_red_flag: 1,
    sub_items_json: [
      { label: 'Seatbelt Lock Test', redFlag: true, originalParams: [320] },
      { label: 'Seatbelt Retractor', originalParams: [321] },
    ],
  },
  {
    param_number: 5072, name: 'Interior Trim Condition', sub_group_id: SG.cabin,
    detail: 'Check dashboard for cracks, door trim condition, roof lining sag/stains.',
    ...OPT.condition,
    is_red_flag: 0,
    sub_items_json: [
      { label: 'Dashboard Cracks', originalParams: [315] },
      { label: 'Door Trim Condition', originalParams: [316] },
      { label: 'Roof Lining Condition', originalParams: [318] },
    ],
  },
  {
    param_number: 5073, name: 'Flood/Water Damage Check', sub_group_id: SG.cabin,
    detail: 'Check for flood evidence: musty cabin odor, carpet moisture, boot carpet water damage.',
    ...OPT.evidence,
    is_red_flag: 0,
    sub_items_json: [
      { label: 'Cabin Odor (Flood Check)', originalParams: [313] },
      { label: 'Carpet Moisture', originalParams: [314] },
      { label: 'Boot Carpet Condition', originalParams: [312] },
    ],
  },
  {
    param_number: 5074, name: 'Airbag Deployment Signs', sub_group_id: SG.cabin,
    detail: 'Check for signs of airbag deployment: dashboard repair, steering wheel replacement, pillar trim gaps.',
    ...OPT.evidence,
    is_red_flag: 1,
    sub_items_json: [{ label: 'Airbag Deployment Signs', redFlag: true, originalParams: [311] }],
  },
  {
    param_number: 5075, name: 'Odometer Tampering Evidence', sub_group_id: SG.cabin,
    detail: 'Cross-check pedal rubber wear and steering wheel wear against claimed odometer reading.',
    ...OPT.evidence, template_filter: 'used_car',
    is_red_flag: 1,
    sub_items_json: [
      { label: 'Pedal Wear vs Odometer', redFlag: true, originalParams: [317] },
      { label: 'Steering Wear vs Odometer', redFlag: true, originalParams: [322] },
    ],
  },

  // --- Equipment & Safety (sg 28) ---
  {
    param_number: 5076, name: 'Child Safety Features', sub_group_id: SG.equipment,
    detail: 'Test child lock function on rear doors, check ISOFIX mount presence.',
    ...OPT.operation,
    is_red_flag: 0,
    sub_items_json: [
      { label: 'Child Lock Function', originalParams: [324] },
      { label: 'ISOFIX Mounts', originalParams: [326] },
    ],
  },
  {
    param_number: 5077, name: 'Accessories & Equipment', sub_group_id: SG.equipment,
    detail: 'Check: number of keys, jack condition, tool kit, safety triangle, spare wheel kit, fire extinguisher.',
    ...OPT.condition,
    is_red_flag: 0,
    sub_items_json: [
      { label: 'Number of Keys', originalParams: [328] },
      { label: 'Jack Condition', originalParams: [327] },
      { label: 'Tool Kit', originalParams: [333] },
      { label: 'Safety Triangle', originalParams: [330] },
      { label: 'Spare Wheel Kit', originalParams: [332] },
      { label: 'Fire Extinguisher', originalParams: [325] },
    ],
  },
  {
    param_number: 5078, name: 'PDI Delivery Prep', sub_group_id: SG.equipment,
    detail: 'New car PDI: verify floor mat set present, transit protective film fully removed.',
    ...OPT.pass_fail, template_filter: 'new_car_pdi',
    is_red_flag: 0,
    sub_items_json: [
      { label: 'Floor Mat Set', originalParams: [421] },
      { label: 'Transit Protective Film Removed', originalParams: [422] },
    ],
  },

  // ============================================================
  // MODULE 8: DOCUMENTATION VALIDATION (sg 29-30, 39)
  // ============================================================

  // --- Registration & Legal (sg 29) ---
  {
    param_number: 5079, name: 'Chassis & Engine Number Match', sub_group_id: SG.registration,
    detail: 'Physically verify chassis number and engine number match RC document.',
    ...OPT.pass_fail,
    is_red_flag: 1,
    sub_items_json: [
      { label: 'Chassis Number Match', redFlag: true, originalParams: [334] },
      { label: 'Engine Number Match', redFlag: true, originalParams: [335] },
    ],
  },
  {
    param_number: 5080, name: 'Legal Documentation', sub_group_id: SG.registration,
    detail: 'Verify: RC original, insurance validity, pollution certificate, FASTag, hypothecation, loan NOC, challans, registration state, ownership count, NCB.',
    ...OPT.condition, template_filter: 'used_car',
    is_red_flag: 1,
    sub_items_json: [
      { label: 'RC Original Verification', redFlag: true, originalParams: [344] },
      { label: 'Insurance Validity', redFlag: true, originalParams: [338] },
      { label: 'Pollution Certificate', originalParams: [343] },
      { label: 'FASTag Linkage', originalParams: [336] },
      { label: 'Hypothecation Status', originalParams: [337] },
      { label: 'Loan NOC', originalParams: [339] },
      { label: 'Pending Challans', originalParams: [342] },
      { label: 'Registration State Match', originalParams: [345] },
      { label: 'Ownership Count', originalParams: [341] },
      { label: 'NCB Status', originalParams: [340] },
    ],
  },

  // --- Service & History (sg 30) ---
  {
    param_number: 5081, name: 'History Red Flags', sub_group_id: SG.service_history,
    detail: 'Cross-check for accident claims, flood records, total loss history.',
    ...OPT.evidence,
    is_red_flag: 1,
    sub_items_json: [
      { label: 'Accident Claim History', redFlag: true, originalParams: [346] },
      { label: 'Flood Record Check', redFlag: true, originalParams: [348] },
      { label: 'Total Loss Cross-Check', redFlag: true, originalParams: [352] },
    ],
  },
  {
    param_number: 5082, name: 'Service Records', sub_group_id: SG.service_history,
    detail: 'Check service book stamps, service gaps, warranty status, duplicate key, pending recalls.',
    ...OPT.condition,
    is_red_flag: 0,
    sub_items_json: [
      { label: 'Service Book Stamps', originalParams: [350] },
      { label: 'Service Gap Check', originalParams: [351] },
      { label: 'Warranty Remaining', originalParams: [353] },
      { label: 'Duplicate Key', originalParams: [347] },
      { label: 'Recall Pending', originalParams: [349] },
    ],
  },

  // --- PDI Documentation (sg 39) ---
  {
    param_number: 5083, name: 'PDI Documentation Pack', sub_group_id: SG.pdi_docs,
    detail: 'Verify: manufacturer invoice, temp registration/trade plate, insurance, owner manual, warranty card (stamped), free service coupon.',
    ...OPT.pass_fail, template_filter: 'new_car_pdi',
    is_red_flag: 1,
    sub_items_json: [
      { label: 'Manufacturer Invoice Verified', redFlag: true, originalParams: [423] },
      { label: 'Temp Registration/Trade Plate', originalParams: [424] },
      { label: 'Insurance Policy (New Vehicle)', redFlag: true, originalParams: [425] },
      { label: "Owner's Manual Present", originalParams: [426] },
      { label: 'Warranty Card Present & Stamped', originalParams: [427] },
      { label: 'First Free Service Coupon', originalParams: [428] },
    ],
  },

  // ============================================================
  // MODULE 9: ROAD TEST EVALUATION (sg 31-33) — ALL INACTIVE
  // ============================================================

  // --- Comfort & Handling (sg 31) ---
  {
    param_number: 5084, name: 'Ride Quality & Stability', sub_group_id: SG.comfort_handling,
    detail: 'Road test: body roll, highway noise, steering alignment drift, straight line stability, speedometer accuracy.',
    ...OPT.condition, context_filter: 'road_test_required', is_active: 0,
    is_red_flag: 1,
    sub_items_json: [
      { label: 'Body Roll', redFlag: true, originalParams: [354] },
      { label: 'Highway Noise', originalParams: [355] },
      { label: 'Steering Alignment Drift', redFlag: true, originalParams: [360] },
      { label: 'Straight Line Stability', redFlag: true, originalParams: [370] },
      { label: 'Speedometer Accuracy', originalParams: [359] },
    ],
  },
  {
    param_number: 5085, name: 'Transmission Under Drive', sub_group_id: SG.comfort_handling,
    detail: 'Road test: transmission in traffic, reverse maneuver, overtake response, parking brake on incline.',
    ...OPT.condition, context_filter: 'road_test_required', is_active: 0,
    is_red_flag: 0,
    sub_items_json: [
      { label: 'Transmission in Traffic', originalParams: [361] },
      { label: 'Reverse Maneuver', originalParams: [358] },
      { label: 'Overtake Response', originalParams: [356] },
      { label: 'Parking Brake on Incline', originalParams: [357] },
    ],
  },

  // --- Driving Dynamics (sg 32) ---
  {
    param_number: 5086, name: 'Acceleration & Power', sub_group_id: SG.driving_dynamics,
    detail: 'Road test: acceleration lag, gear hesitation, hill start, cruise control, suspension noise on bumps.',
    ...OPT.condition, context_filter: 'road_test_required', is_active: 0,
    is_red_flag: 0,
    sub_items_json: [
      { label: 'Acceleration Lag', originalParams: [363] },
      { label: 'Gear Hesitation', originalParams: [367] },
      { label: 'Hill Start Performance', originalParams: [368] },
      { label: 'Cruise Control', originalParams: [365] },
      { label: 'Suspension Noise on Bumps', originalParams: [371] },
    ],
  },
  {
    param_number: 5087, name: 'Systems Under Load', sub_group_id: SG.driving_dynamics,
    detail: 'Road test: steering vibration, AC performance under load, engine temperature rise.',
    ...OPT.condition, context_filter: 'road_test_required', is_active: 0,
    is_red_flag: 1,
    sub_items_json: [
      { label: 'Steering Vibration', originalParams: [369] },
      { label: 'AC Under Load', originalParams: [362] },
      { label: 'Engine Temperature Rise', redFlag: true, originalParams: [366] },
    ],
  },

  // --- Safety & Response (sg 33) ---
  {
    param_number: 5088, name: 'Braking Performance', sub_group_id: SG.safety_response,
    detail: 'Road test: emergency braking, brake pull, ABS activation feel, high speed stability.',
    ...OPT.condition, context_filter: 'road_test_required', is_active: 0,
    is_red_flag: 1,
    sub_items_json: [
      { label: 'Emergency Braking', redFlag: true, originalParams: [375] },
      { label: 'Brake Pull', redFlag: true, originalParams: [364] },
      { label: 'ABS Activation Feel', originalParams: [372] },
      { label: 'High Speed Stability', redFlag: true, originalParams: [376] },
    ],
  },
  {
    param_number: 5089, name: 'Transmission & Steering Response', sub_group_id: SG.safety_response,
    detail: 'Road test: automatic kickdown, clutch slip under load, traction control, steering return to center.',
    ...OPT.condition, context_filter: 'road_test_required', is_active: 0,
    is_red_flag: 1,
    sub_items_json: [
      { label: 'Automatic Kickdown', originalParams: [373] },
      { label: 'Clutch Slip Under Load', originalParams: [374] },
      { label: 'Traction Control', originalParams: [378] },
      { label: 'Steering Return', redFlag: true, originalParams: [377] },
    ],
  },
];

// ============================================================
// MAIN SEEDER FUNCTION
// ============================================================

async function seed() {
  try {
    await sequelize.authenticate();
    console.log('Connected to database.\n');

    let created = 0;
    let updated = 0;

    // Step 1: Create composite checkpoints
    console.log('--- Creating composite checkpoints ---');

    // Collect all originalParams for parent_id linking
    const paramToComposite = {}; // originalParamNumber → compositeParamNumber

    for (const comp of COMPOSITES) {
      // Collect original param numbers from sub_items
      const originalNums = [];
      for (const item of (comp.sub_items_json || [])) {
        if (item.originalParams) {
          originalNums.push(...item.originalParams);
        }
      }

      // Map original params to this composite
      for (const num of originalNums) {
        paramToComposite[num] = comp.param_number;
      }

      const data = {
        sub_group_id: comp.sub_group_id,
        parent_id: null,
        param_number: comp.param_number,
        name: comp.name,
        detail: comp.detail,
        input_type: comp.input_type,
        option_1: comp.option_1, score_1: comp.score_1,
        option_2: comp.option_2, score_2: comp.score_2,
        option_3: comp.option_3, score_3: comp.score_3,
        option_4: comp.option_4 || null, score_4: comp.score_4 ?? null,
        option_5: comp.option_5 || null, score_5: comp.score_5 ?? null,
        fuel_filter: comp.fuel_filter || 'All',
        transmission_filter: comp.transmission_filter || 'All',
        context_filter: comp.context_filter || null,
        template_filter: comp.template_filter || null,
        feature_filter: comp.feature_filter || null,
        sub_items_json: comp.sub_items_json,
        is_red_flag: comp.is_red_flag || 0,
        is_active: comp.is_active !== undefined ? comp.is_active : 1,
        is_composite: 1,
        sort_order: comp.param_number - 5000,
        weightage: 1.00,  // temporary, recalculated below
        weightage_pdi: null,
        created_at: new Date(),
      };

      const [record, wasCreated] = await InspectionParameter.findOrCreate({
        where: { param_number: comp.param_number },
        defaults: data,
      });

      if (wasCreated) {
        created++;
        console.log(`  Created: ${comp.param_number} - ${comp.name}`);
      } else {
        // Update existing
        await record.update(data);
        updated++;
        console.log(`  Updated: ${comp.param_number} - ${comp.name}`);
      }
    }

    console.log(`\nComposites: ${created} created, ${updated} updated (${COMPOSITES.length} total)`);

    // Step 2: Link old granular params to their composite parent
    console.log('\n--- Linking granular params to composite parents ---');

    let linked = 0;
    for (const [origNum, compNum] of Object.entries(paramToComposite)) {
      const origParam = await InspectionParameter.findOne({ where: { param_number: parseInt(origNum) } });
      const compParam = await InspectionParameter.findOne({ where: { param_number: compNum } });

      if (origParam && compParam && origParam.parent_id !== compParam.id) {
        await origParam.update({ parent_id: compParam.id });
        linked++;
      }
    }
    console.log(`Linked ${linked} granular params to composite parents`);

    // Step 3: Calculate weightages per module
    console.log('\n--- Calculating weightages ---');

    // Get all modules
    const InspectionModule = require('../models/inspection-module.model');
    const InspectionSubGroup = require('../models/inspection-sub-group.model');
    const modules = await InspectionModule.findAll({ order: [['sort_order', 'ASC']] });

    for (const mod of modules) {
      const subGroups = await InspectionSubGroup.findAll({ where: { module_id: mod.id } });
      const sgIds = subGroups.map(sg => sg.id);

      // Get active composites in this module
      const composites = await InspectionParameter.findAll({
        where: {
          sub_group_id: sgIds,
          is_composite: 1,
          is_active: 1,
        },
      });

      if (composites.length === 0) {
        console.log(`  ${mod.name}: no active composites, skipping`);
        continue;
      }

      // Distribute weights evenly (simple equal distribution)
      const weightPerParam = parseFloat((100.0 / composites.length).toFixed(2));
      let totalAssigned = 0;

      for (let i = 0; i < composites.length; i++) {
        const w = i === composites.length - 1
          ? parseFloat((100.0 - totalAssigned).toFixed(2))  // last one gets remainder
          : weightPerParam;
        totalAssigned += w;

        await composites[i].update({ weightage: w, weightage_pdi: w });
      }

      console.log(`  ${mod.name}: ${composites.length} composites × ~${weightPerParam}% = 100%`);
    }

    // Step 4: Adjust PDI weights for PDI-specific composites
    // PDI composites with template_filter='used_car' should have weightage_pdi=null (excluded from PDI)
    const usedCarOnly = await InspectionParameter.findAll({
      where: { is_composite: 1, template_filter: 'used_car' },
    });
    for (const p of usedCarOnly) {
      await p.update({ weightage_pdi: null });
    }
    console.log(`\nSet weightage_pdi=null for ${usedCarOnly.length} used_car-only composites`);

    // Summary
    const totalComposites = await InspectionParameter.count({ where: { is_composite: 1 } });
    const activeComposites = await InspectionParameter.count({ where: { is_composite: 1, is_active: 1 } });
    const linkedCount = await InspectionParameter.count({ where: { parent_id: { [require('sequelize').Op.ne]: null } } });

    console.log('\n========== SUMMARY ==========');
    console.log(`Total composites: ${totalComposites}`);
    console.log(`Active composites: ${activeComposites}`);
    console.log(`Granular params linked: ${linkedCount}`);
    console.log('Done!');

  } catch (error) {
    console.error('Seeder error:', error);
  } finally {
    await sequelize.close();
  }
}

seed();
