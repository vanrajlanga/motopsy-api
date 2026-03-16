/**
 * Generate mechanic checklist Excel files with research-backed Indian market weightage
 * Usage: node scripts/generate-mechanic-sheets.js
 * Output: docs/Motopsy_Used_Car_Checklist.xlsx, docs/Motopsy_New_Car_PDI_Checklist.xlsx
 */

const ExcelJS = require('exceljs');
const path = require('path');
const { USED_CAR_WEIGHTS, PDI_WEIGHTS } = require('../src/config/inspection-weights');

// Weights imported from shared config (single source of truth)

// ── Checkpoint data ───────────────────────────────────────────────────────────

const ALL_CHECKPOINTS = [
  { module: 'Engine System', subgroup: 'Fluids & Lubrication', paramNum: 5001, name: 'Engine Oil Health', redFlag: false, options: 'Excellent | Good | Fair | Poor | Critical', feature: null, context: null, subItems: ['Engine Oil Level', 'Engine Oil Color', 'Engine Oil Contamination', 'Engine Oil Leakage (Top)', 'Engine Oil Leakage (Bottom)', 'Metal Particles in Oil', 'Oil Sludge Presence'] },
  { module: 'Engine System', subgroup: 'Fluids & Lubrication', paramNum: 5002, name: 'Coolant System Health', redFlag: true, options: 'Excellent | Good | Fair | Poor | Critical', feature: null, context: null, subItems: ['Coolant Level', 'Coolant Color -- RF', 'Coolant-Oil Mixing -- RF'] },
  { module: 'Engine System', subgroup: 'Fluids & Lubrication', paramNum: 5003, name: 'Brake Fluid Status', redFlag: false, options: 'Excellent | Good | Fair | Poor | Critical', feature: null, context: null, subItems: ['Brake Fluid Level', 'Brake Fluid Contamination'] },
  { module: 'Engine System', subgroup: 'Fluids & Lubrication', paramNum: 5004, name: 'Transmission Fluid Status', redFlag: false, options: 'Excellent | Good | Fair | Poor | Critical', feature: null, context: null, subItems: ['Transmission Fluid Level', 'Transmission Fluid Burn Smell'] },
  { module: 'Engine System', subgroup: 'Fluids & Lubrication', paramNum: 5005, name: 'Power Steering Fluid', redFlag: false, options: 'Excellent | Good | Fair | Poor | Critical', feature: null, context: null, subItems: ['Power Steering Fluid Level'] },
  { module: 'Engine System', subgroup: 'Combustion & Internal Health', paramNum: 5006, name: 'Engine Start & Idle', redFlag: false, options: 'Excellent | Good | Fair | Poor | Critical', feature: null, context: null, subItems: ['Cold Start Smoothness', 'Warm Start Smoothness', 'Idle Quality', 'Throttle Response Delay'] },
  { module: 'Engine System', subgroup: 'Combustion & Internal Health', paramNum: 5007, name: 'Engine Acoustic Assessment', redFlag: false, options: 'None | Faint | Noticeable | Loud | Severe', feature: null, context: null, subItems: ['Knocking Noise', 'Tapping Noise', 'Timing Chain Noise', 'Fuel Injector Noise', 'Fuel Pump Sound'] },
  { module: 'Engine System', subgroup: 'Combustion & Internal Health', paramNum: 5008, name: 'Overheating Evidence', redFlag: true, options: 'None | Suspected | Likely | Confirmed', feature: null, context: null, subItems: ['Overheating Evidence -- RF'] },
  { module: 'Engine System', subgroup: 'Combustion & Internal Health', paramNum: 5009, name: 'Radiator & Cooling', redFlag: false, options: 'Excellent | Good | Fair | Poor | Critical', feature: null, context: null, subItems: ['Radiator Condition', 'Radiator Fan Operation'] },
  { module: 'Engine System', subgroup: 'Combustion & Internal Health', paramNum: 5010, name: 'Turbo/Intercooler System', redFlag: false, options: 'Excellent | Good | Fair | Poor | Critical', feature: 'turbo', context: null, subItems: ['Turbo Charger Performance', 'Intercooler Condition'] },
  { module: 'Engine System', subgroup: 'Diagnostics & Electronics', paramNum: 5011, name: 'OBD Diagnostic Scan', redFlag: true, options: 'Excellent | Good | Fair | Poor | Critical', feature: null, context: null, subItems: ['OBD Active Error Codes', 'OBD Historical Codes', 'ABS Module Codes', 'Airbag Module Codes', 'Emission System Codes', 'ECU Tampering Signs -- RF', 'Compression Consistency'] },
  { module: 'Engine System', subgroup: 'Diesel Specific', paramNum: 5012, name: 'Diesel System Assessment', redFlag: false, options: 'Excellent | Good | Fair | Poor | Critical', feature: null, context: null, subItems: ['AdBlue/DEF Level', 'Diesel Injector Performance', 'DPF Condition', 'EGR Valve Condition', 'Fuel Water Separator', 'Glow Plug Function'] },
  { module: 'Engine System', subgroup: 'EV Powertrain', paramNum: 5013, name: 'EV Battery & Thermal', redFlag: false, options: 'Excellent | Good | Fair | Poor | Critical', feature: null, context: null, subItems: ['HV Battery SOH', '12V Auxiliary Battery', 'Battery Cooling', 'Thermal Management System'] },
  { module: 'Engine System', subgroup: 'EV Powertrain', paramNum: 5014, name: 'EV Motor & Charging', redFlag: true, options: 'Excellent | Good | Fair | Poor | Critical', feature: null, context: null, subItems: ['Electric Motor Noise', 'Electric Motor Vibration', 'Charging Port Condition', 'DC Fast Charge Test', 'L1/L2 Charging Test', 'Regenerative Braking', 'HV Cable Inspection -- RF'] },
  { module: 'Engine System', subgroup: 'CNG System', paramNum: 5015, name: 'CNG System Assessment', redFlag: true, options: 'Excellent | Good | Fair | Poor | Critical', feature: null, context: null, subItems: ['CNG Cylinder Condition', 'CNG Cylinder Expiry', 'CNG Filling Valve', 'CNG High Pressure Pipe', 'CNG Kit Certification', 'CNG Leak Test -- RF', 'CNG Low Pressure Pipe', 'CNG Pressure Gauge', 'CNG Pressure Regulator', 'CNG Solenoid Valve', 'CNG Switch Function', 'CNG Bracket Mount', 'CNG Fuel Line Clamps'] },
  { module: 'Engine System', subgroup: 'Mounts Belts & Mechanical', paramNum: 5016, name: 'Engine Bay Mechanical', redFlag: false, options: 'Excellent | Good | Fair | Poor | Critical', feature: null, context: null, subItems: ['Belt Condition', 'Hose Condition', 'Engine Mount Condition', 'Exhaust System Condition', 'Vacuum Leak Detection'] },
  { module: 'Engine System', subgroup: 'Mounts Belts & Mechanical', paramNum: 5017, name: 'Wiring Harness (Rodent Damage)', redFlag: false, options: 'Excellent | Good | Fair | Poor | Critical', feature: null, context: null, subItems: ['Wiring Harness Rodent Damage'] },
  { module: 'Engine System', subgroup: 'Mounts Belts & Mechanical', paramNum: 5018, name: 'Air Filter Condition', redFlag: false, options: 'Excellent | Good | Fair | Poor | Critical', feature: null, context: null, subItems: ['Air Filter Condition'] },
  { module: 'Engine System', subgroup: 'Mounts Belts & Mechanical', paramNum: 5019, name: 'Battery Terminal Condition', redFlag: false, options: 'Excellent | Good | Fair | Poor | Critical', feature: null, context: null, subItems: ['Battery Terminal Corrosion'] },
  { module: 'Transmission & Drivetrain', subgroup: 'Drivetrain', paramNum: 5020, name: 'CV Joint Assessment', redFlag: false, options: 'Excellent | Good | Fair | Poor | Critical', feature: null, context: null, subItems: ['CV Joint Boot Condition', 'CV Joint Noise'] },
  { module: 'Transmission & Drivetrain', subgroup: 'Gearbox & Clutch', paramNum: 5022, name: 'Manual Clutch System', redFlag: false, options: 'Excellent | Good | Fair | Poor | Critical', feature: null, context: null, subItems: ['Clutch Pedal Feel', 'Clutch Bite Height', 'Clutch Slippage'] },
  { module: 'Transmission & Drivetrain', subgroup: 'Gearbox & Clutch', paramNum: 5023, name: 'Manual Gearbox Operation', redFlag: false, options: 'Excellent | Good | Fair | Poor | Critical', feature: null, context: null, subItems: ['Gear Engagement Smoothness', 'Gear Grinding', 'Gear Selector Response', 'Manual Linkage Wear', 'Neutral Gear Noise', 'Reverse Gear Smoothness'] },
  { module: 'Transmission & Drivetrain', subgroup: 'Gearbox & Clutch', paramNum: 5024, name: 'Automatic Transmission Response', redFlag: false, options: 'Excellent | Good | Fair | Poor | Critical', feature: null, context: null, subItems: ['Automatic Shift Delay', 'Torque Converter Delay', 'Parking Pawl Condition', 'CVT Belt Noise', 'Dual Clutch Jerk'] },
  { module: 'Transmission & Drivetrain', subgroup: 'Gearbox & Clutch', paramNum: 5025, name: 'Transmission Physical Condition', redFlag: true, options: 'Excellent | Good | Fair | Poor | Critical', feature: null, context: null, subItems: ['Transmission Fluid Leak', 'Transmission Mount Condition', 'Transmission Overheating Signs', 'Gear Slipping -- RF', 'Gearbox Bearing Noise', 'Hill Assist Function'] },
  { module: 'Structural Integrity', subgroup: 'Chassis & Underbody', paramNum: 5026, name: 'Chassis & Frame Integrity', redFlag: true, options: 'Excellent | Good | Fair | Poor | Critical', feature: null, context: 'lift_required', subItems: ['Chassis Rail Straightness -- RF', 'Cross-Member Alignment -- RF', 'Subframe Condition'] },
  { module: 'Structural Integrity', subgroup: 'Chassis & Underbody', paramNum: 5027, name: 'Front Structure Assessment', redFlag: true, options: 'None | Suspected | Likely | Confirmed', feature: null, context: null, subItems: ['Engine Bay Structure Damage -- RF', 'Firewall Distortion -- RF', 'Crumple Zone Damage -- RF'] },
  { module: 'Structural Integrity', subgroup: 'Chassis & Underbody', paramNum: 5028, name: 'Underbody Condition', redFlag: false, options: 'Excellent | Good | Fair | Poor | Critical', feature: null, context: 'lift_required', subItems: ['Underbody Corrosion Coating', 'Underbody Rust Severity', 'Floor Pan Weld Marks', 'Structural Welding Evidence', 'Boot Floor Integrity', 'Spare Wheel Well Deformation'] },
  { module: 'Structural Integrity', subgroup: 'Frame & Stamps', paramNum: 5029, name: 'VIN/Chassis Verification', redFlag: true, options: 'None | Suspected | Likely | Confirmed', feature: null, context: null, subItems: ['VIN Plate Tampering -- RF', 'Chassis Stamping Mismatch -- RF'] },
  { module: 'Structural Integrity', subgroup: 'Frame & Stamps', paramNum: 5030, name: 'Repair/Accident Evidence', redFlag: false, options: 'None | Suspected | Likely | Confirmed', feature: null, context: null, subItems: ['Quarter Panel Weld Marks', 'Structural Adhesive Signs', 'Paint Overspray Inside Seals', 'Replaced Structural Panel', 'Door Hinge Weld Marks', 'Front Apron Condition', 'Rear Apron Condition', 'Impact Bar Condition', 'Frame Symmetry'] },
  { module: 'Structural Integrity', subgroup: 'Frame & Stamps', paramNum: 5031, name: 'Shock Mount & Side Sill', redFlag: false, options: 'Excellent | Good | Fair | Poor | Critical', feature: null, context: null, subItems: ['Shock Mount Structure', 'Side Sill Integrity', 'Roof Weld Consistency'] },
  { module: 'Structural Integrity', subgroup: 'Panels & Alignment', paramNum: 5032, name: 'Hood & Boot Mechanism', redFlag: false, options: 'All Working | Minor Issues | Issues Found | Major Issues | Non-Functional', feature: null, context: null, subItems: ['Bonnet Hinge Alignment', 'Bonnet Stay/Strut', 'Boot Hinge Alignment', 'Boot Strut', 'Door Check Strap'] },
  { module: 'Structural Integrity', subgroup: 'Panels & Alignment', paramNum: 5033, name: 'Panel Gap Assessment', redFlag: false, options: 'Excellent | Good | Fair | Poor | Critical', feature: null, context: null, subItems: ['Uneven Panel Gaps', 'Seal Tampering'] },
  { module: 'Structural Integrity', subgroup: 'Pillars & Roof', paramNum: 5034, name: 'Pillar Integrity', redFlag: true, options: 'Excellent | Good | Fair | Poor | Critical', feature: null, context: null, subItems: ['A-Pillar Condition -- RF', 'B-Pillar Condition -- RF', 'C-Pillar Condition', 'Pillar Cut & Weld Evidence -- RF'] },
  { module: 'Structural Integrity', subgroup: 'Pillars & Roof', paramNum: 5035, name: 'Roof Structure', redFlag: true, options: 'Excellent | Good | Fair | Poor | Critical', feature: null, context: null, subItems: ['Roof Line Straightness -- RF', 'Roof Rail Alignment', 'Roof Repaint Sign'] },
  { module: 'Structural Integrity', subgroup: 'Pillars & Roof', paramNum: 5036, name: 'Sunroof Integrity', redFlag: false, options: 'Excellent | Good | Fair | Poor | Critical', feature: 'sunroof', context: null, subItems: ['Sunroof Seal Condition', 'Sunroof Drainage Test'] },
  { module: 'Structural Integrity', subgroup: 'Seals & Rubber', paramNum: 5037, name: 'Weather Sealing', redFlag: false, options: 'Excellent | Good | Fair | Poor | Critical', feature: null, context: null, subItems: ['Door Rubber Seals', 'Windshield Seal', 'Boot/Tailgate Seal'] },
  { module: 'Paint & Panel Mapping', subgroup: 'Cosmetic & Consistency', paramNum: 5038, name: 'Paint Quality Assessment', redFlag: false, options: 'Excellent | Good | Fair | Poor | Critical', feature: null, context: null, subItems: ['Clear Coat Peel', 'Color Mismatch', 'Paint Overspray Detection', 'Edge Seal Paint Break', 'OEM Sticker Presence'] },
  { module: 'Paint & Panel Mapping', subgroup: 'Cosmetic & Consistency', paramNum: 5039, name: 'Glass Condition', redFlag: false, options: 'Excellent | Good | Fair | Poor | Critical', feature: null, context: null, subItems: ['Windshield Chips/Cracks', 'Windshield Replaced', 'Rear Windshield Condition', 'Glass Mfg Year'] },
  { module: 'Paint & Panel Mapping', subgroup: 'Cosmetic & Consistency', paramNum: 5040, name: 'Cosmetic Damage Assessment', redFlag: false, options: 'Excellent | Good | Fair | Poor | Critical', feature: null, context: null, subItems: ['Dent Density (Overall)', 'Scratch Density (Overall)', 'Stone Chip Severity', 'Rust Spot Presence', 'Under Hood/Boot Paint Consistency', 'Door Jamb Paint Consistency'] },
  { module: 'Paint & Panel Mapping', subgroup: 'Cosmetic & Consistency', paramNum: 5041, name: 'Lighting & Plate Condition', redFlag: false, options: 'Excellent | Good | Fair | Poor | Critical', feature: null, context: null, subItems: ['Headlight Lens Clarity', 'Headlight Mfg Year', 'Tail Light Lens Condition', 'Tail Light Mfg Year', 'Number Plate Condition'] },
  { module: 'Paint & Panel Mapping', subgroup: 'Cosmetic & Consistency', paramNum: 5042, name: 'Panel Gap & Fit', redFlag: false, options: 'Excellent | Good | Fair | Poor | Critical', feature: null, context: null, subItems: ['Panel Gap Uniformity'] },
  { module: 'Paint & Panel Mapping', subgroup: 'Front Section Panels', paramNum: 5043, name: 'Front Exterior Condition', redFlag: false, options: 'Excellent | Good | Fair | Poor | Critical', feature: null, context: null, subItems: ['Front Bumper Cover', 'Front Bumper Reinforcement', 'Bonnet/Hood', 'Left Front Fender', 'Right Front Fender', 'Front Grille', 'Headlight -- Left', 'Headlight -- Right', 'Fog Lamp Housing -- Left', 'Fog Lamp Housing -- Right'] },
  { module: 'Paint & Panel Mapping', subgroup: 'Side Panels -- Left', paramNum: 5044, name: 'Left Side Exterior', redFlag: false, options: 'Excellent | Good | Fair | Poor | Critical', feature: null, context: null, subItems: ['Left Front Door Outer', 'Left Front Door Inner Frame', 'Left Rear Door Outer', 'Left Rear Door Inner Frame', 'Left Side Skirt', 'Left A/B/C Pillars', 'Left Quarter Panel', 'Left ORVM Housing'] },
  { module: 'Paint & Panel Mapping', subgroup: 'Side Panels -- Right', paramNum: 5045, name: 'Right Side Exterior', redFlag: false, options: 'Excellent | Good | Fair | Poor | Critical', feature: null, context: null, subItems: ['Right Front Door Outer', 'Right Front Door Inner Frame', 'Right Rear Door Outer', 'Right Rear Door Inner Frame', 'Right Side Skirt', 'Right A/B/C Pillars', 'Right Quarter Panel', 'Right ORVM Housing'] },
  { module: 'Paint & Panel Mapping', subgroup: 'Rear Section Panels', paramNum: 5046, name: 'Rear Exterior Condition', redFlag: false, options: 'Excellent | Good | Fair | Poor | Critical', feature: null, context: null, subItems: ['Rear Bumper Cover', 'Rear Bumper Reinforcement', 'Boot Lid/Tailgate', 'Rear Windshield', 'Tail Lamp -- Left', 'Tail Lamp -- Right', 'Rear Reflector Panels', 'Rear Spoiler'] },
  { module: 'Paint & Panel Mapping', subgroup: 'Roof & Upper Structure', paramNum: 5047, name: 'Roof Exterior', redFlag: false, options: 'Excellent | Good | Fair | Poor | Critical', feature: null, context: null, subItems: ['Roof Panel', 'Roof Rails', 'Sunroof Panel', 'Shark Fin Antenna Housing'] },
  { module: 'Suspension & Brakes', subgroup: 'Brakes', paramNum: 5048, name: 'Brake Pad Condition', redFlag: true, options: 'Excellent | Good | Fair | Poor | Critical', feature: null, context: 'lift_required', subItems: ['Brake Pad Front Left -- RF', 'Brake Pad Front Right -- RF', 'Brake Pad Rear Left -- RF', 'Brake Pad Rear Right -- RF'] },
  { module: 'Suspension & Brakes', subgroup: 'Brakes', paramNum: 5049, name: 'Brake Disc & Hydraulics', redFlag: true, options: 'Excellent | Good | Fair | Poor | Critical', feature: null, context: 'lift_required', subItems: ['Brake Disc Scoring', 'Brake Fluid Leakage -- RF', 'Brake Line Corrosion -- RF'] },
  { module: 'Suspension & Brakes', subgroup: 'Brakes', paramNum: 5050, name: 'Handbrake/Parking Brake', redFlag: true, options: 'Pass | Marginal | Fail', feature: null, context: null, subItems: ['Handbrake Holding -- RF'] },
  { module: 'Suspension & Brakes', subgroup: 'Suspension', paramNum: 5052, name: 'Shock Absorber Condition', redFlag: false, options: 'Excellent | Good | Fair | Poor | Critical', feature: null, context: 'lift_required', subItems: ['Front Shock Leakage', 'Rear Shock Leakage'] },
  { module: 'Suspension & Brakes', subgroup: 'Suspension', paramNum: 5053, name: 'Suspension Function', redFlag: true, options: 'Excellent | Good | Fair | Poor | Critical', feature: null, context: null, subItems: ['Suspension Noise', 'Suspension Rebound Test', 'Anti-Roll Bar Link', 'Ball Joint Play -- RF', 'Control Arm Bush Wear'] },
  { module: 'Suspension & Brakes', subgroup: 'Suspension', paramNum: 5054, name: 'Steering System', redFlag: true, options: 'Excellent | Good | Fair | Poor | Critical', feature: null, context: null, subItems: ['Steering Free Play -- RF', 'Steering Column Noise', 'Steering Rack Leakage', 'Wheel Alignment', 'Wheel Bearing Noise'] },
  { module: 'Suspension & Brakes', subgroup: 'Tyres & Wheels', paramNum: 5055, name: 'Tyre Condition', redFlag: true, options: 'Excellent | Good | Fair | Poor | Critical', feature: null, context: null, subItems: ['Tyre Tread Front Left -- RF', 'Tyre Tread Front Right -- RF', 'Tyre Tread Rear Left -- RF', 'Tyre Tread Rear Right -- RF', 'Tyre Pressure', 'Tyre Mfg Year', 'Uneven Tyre Wear'] },
  { module: 'Suspension & Brakes', subgroup: 'Tyres & Wheels', paramNum: 5056, name: 'Wheels & Spare', redFlag: false, options: 'Excellent | Good | Fair | Poor | Critical', feature: null, context: null, subItems: ['Alloy Rim Damage', 'Spare Tyre Condition'] },
  { module: 'Electrical & Electronics', subgroup: 'Controls & Comfort', paramNum: 5057, name: 'Climate Control', redFlag: false, options: 'All Working | Minor Issues | Issues Found | Major Issues | Non-Functional', feature: null, context: null, subItems: ['AC Compressor Noise', 'AC Cooling Efficiency', 'Blower Motor'] },
  { module: 'Electrical & Electronics', subgroup: 'Controls & Comfort', paramNum: 5058, name: 'Power Windows', redFlag: false, options: 'All Working | Minor Issues | Issues Found | Major Issues | Non-Functional', feature: null, context: null, subItems: ['Power Window Front Left', 'Power Window Front Right', 'Power Window Rear Left', 'Power Window Rear Right'] },
  { module: 'Electrical & Electronics', subgroup: 'Controls & Comfort', paramNum: 5059, name: 'Infotainment & Connectivity', redFlag: false, options: 'All Working | Minor Issues | Issues Found | Major Issues | Non-Functional', feature: null, context: null, subItems: ['Infotainment System', 'Touchscreen Response', 'USB Ports', '12V Socket'] },
  { module: 'Electrical & Electronics', subgroup: 'Controls & Comfort', paramNum: 5060, name: 'Security & Access', redFlag: false, options: 'All Working | Minor Issues | Issues Found | Major Issues | Non-Functional', feature: null, context: null, subItems: ['Remote Key', 'Central Locking', 'Immobilizer Function', 'Fuel Flap Release'] },
  { module: 'Electrical & Electronics', subgroup: 'Controls & Comfort', paramNum: 5061, name: 'Parking Aids', redFlag: false, options: 'All Working | Minor Issues | Issues Found | Major Issues | Non-Functional', feature: 'parking_sensors', context: null, subItems: ['Parking Sensors', 'Reverse Camera'] },
  { module: 'Electrical & Electronics', subgroup: 'Controls & Comfort', paramNum: 5062, name: 'Sunroof & Horn', redFlag: false, options: 'All Working | Minor Issues | Issues Found | Major Issues | Non-Functional', feature: null, context: null, subItems: ['Sunroof Operation', 'Horn Function'] },
  { module: 'Electrical & Electronics', subgroup: 'Lighting', paramNum: 5063, name: 'Exterior Lighting Suite', redFlag: true, options: 'All Working | Minor Issues | Issues Found | Major Issues | Non-Functional', feature: null, context: null, subItems: ['Headlight Function -- RF', 'Brake Light Function -- RF', 'Indicator Function -- RF', 'Hazard Light Function -- RF', 'Fog Lamp Function', 'Reverse Light Function'] },
  { module: 'Electrical & Electronics', subgroup: 'Mirrors', paramNum: 5064, name: 'Mirror Systems', redFlag: false, options: 'All Working | Minor Issues | Issues Found | Major Issues | Non-Functional', feature: null, context: null, subItems: ['ORVM Adjustment', 'ORVM Condition Left', 'ORVM Condition Right', 'ORVM Fold Function'] },
  { module: 'Electrical & Electronics', subgroup: 'Power & Charging', paramNum: 5065, name: 'Battery & Charging System', redFlag: false, options: 'Excellent | Good | Fair | Poor | Critical', feature: null, context: null, subItems: ['Battery Health', 'Battery Mfg Date', 'Alternator Voltage'] },
  { module: 'Electrical & Electronics', subgroup: 'Warnings & Systems', paramNum: 5066, name: 'ABS Warning Light', redFlag: true, options: 'Pass | Marginal | Fail', feature: null, context: null, subItems: ['ABS Warning Light -- RF'] },
  { module: 'Electrical & Electronics', subgroup: 'Warnings & Systems', paramNum: 5067, name: 'Airbag Warning Light', redFlag: true, options: 'Pass | Marginal | Fail', feature: null, context: null, subItems: ['Airbag Warning Light -- RF'] },
  { module: 'Electrical & Electronics', subgroup: 'Warnings & Systems', paramNum: 5068, name: 'Dashboard Warning Lights', redFlag: false, options: 'All Working | Minor Issues | Issues Found | Major Issues | Non-Functional', feature: null, context: null, subItems: ['Instrument Cluster Warning', 'Interior Lighting'] },
  { module: 'Electrical & Electronics', subgroup: 'Wipers & Visibility', paramNum: 5069, name: 'Wipers & Visibility', redFlag: false, options: 'All Working | Minor Issues | Issues Found | Major Issues | Non-Functional', feature: null, context: null, subItems: ['Front Wiper Blade Condition', 'Rear Wiper Blade Condition', 'Wiper Motor Function', 'Washer Jet Function', 'Rear Defogger'] },
  { module: 'Interior & Safety', subgroup: 'Cabin', paramNum: 5070, name: 'Seat Condition & Function', redFlag: false, options: 'Excellent | Good | Fair | Poor | Critical', feature: null, context: null, subItems: ['Seat Frame Integrity', 'Seat Adjustment', 'Rear Seat Fold'] },
  { module: 'Interior & Safety', subgroup: 'Cabin', paramNum: 5071, name: 'Seatbelt System', redFlag: true, options: 'Pass | Marginal | Fail', feature: null, context: null, subItems: ['Seatbelt Lock Test -- RF', 'Seatbelt Retractor'] },
  { module: 'Interior & Safety', subgroup: 'Cabin', paramNum: 5072, name: 'Interior Trim Condition', redFlag: false, options: 'Excellent | Good | Fair | Poor | Critical', feature: null, context: null, subItems: ['Dashboard Cracks', 'Door Trim Condition', 'Roof Lining Condition'] },
  { module: 'Interior & Safety', subgroup: 'Cabin', paramNum: 5073, name: 'Flood/Water Damage Check', redFlag: false, options: 'None | Suspected | Likely | Confirmed', feature: null, context: null, subItems: ['Cabin Odor (Flood Check)', 'Carpet Moisture', 'Boot Carpet Condition'] },
  { module: 'Interior & Safety', subgroup: 'Cabin', paramNum: 5074, name: 'Airbag Deployment Signs', redFlag: true, options: 'None | Suspected | Likely | Confirmed', feature: null, context: null, subItems: ['Airbag Deployment Signs -- RF'] },
  { module: 'Interior & Safety', subgroup: 'Cabin', paramNum: 5075, name: 'Odometer Tampering Evidence', redFlag: true, options: 'None | Suspected | Likely | Confirmed', feature: null, context: null, subItems: ['Pedal Wear vs Odometer -- RF', 'Steering Wear vs Odometer -- RF'] },
  { module: 'Interior & Safety', subgroup: 'Equipment & Safety', paramNum: 5076, name: 'Child Safety Features', redFlag: false, options: 'All Working | Minor Issues | Issues Found | Major Issues | Non-Functional', feature: null, context: null, subItems: ['Child Lock Function', 'ISOFIX Mounts'] },
  { module: 'Interior & Safety', subgroup: 'Equipment & Safety', paramNum: 5077, name: 'Accessories & Equipment', redFlag: false, options: 'Excellent | Good | Fair | Poor | Critical', feature: null, context: null, subItems: ['Number of Keys', 'Jack Condition', 'Tool Kit', 'Safety Triangle', 'Spare Wheel Kit', 'Fire Extinguisher'] },
  { module: 'Interior & Safety', subgroup: 'Equipment & Safety', paramNum: 5078, name: 'PDI Delivery Prep', redFlag: false, options: 'Pass | Marginal | Fail', feature: null, context: null, subItems: ['Floor Mat Set', 'Transit Protective Film Removed'] },
  { module: 'Documentation Validation', subgroup: 'Registration & Legal', paramNum: 5079, name: 'Chassis & Engine Number Match', redFlag: true, options: 'Pass | Marginal | Fail', feature: null, context: null, subItems: ['Chassis Number Match -- RF', 'Engine Number Match -- RF'] },
  { module: 'Documentation Validation', subgroup: 'Registration & Legal', paramNum: 5080, name: 'Legal Documentation', redFlag: true, options: 'Excellent | Good | Fair | Poor | Critical', feature: null, context: null, subItems: ['RC Original Verification -- RF', 'Insurance Validity -- RF', 'Pollution Certificate', 'FASTag Linkage', 'Hypothecation Status', 'Loan NOC', 'Pending Challans', 'Registration State Match', 'Ownership Count', 'NCB Status'] },
  { module: 'Documentation Validation', subgroup: 'Service & History', paramNum: 5081, name: 'History Red Flags', redFlag: true, options: 'None | Suspected | Likely | Confirmed', feature: null, context: null, subItems: ['Accident Claim History -- RF', 'Flood Record Check -- RF', 'Total Loss Cross-Check -- RF'] },
  { module: 'Documentation Validation', subgroup: 'Service & History', paramNum: 5082, name: 'Service Records', redFlag: false, options: 'Excellent | Good | Fair | Poor | Critical', feature: null, context: null, subItems: ['Service Book Stamps', 'Service Gap Check', 'Warranty Remaining', 'Duplicate Key', 'Recall Pending'] },
  { module: 'Documentation Validation', subgroup: 'PDI Documentation', paramNum: 5083, name: 'PDI Documentation Pack', redFlag: true, options: 'Pass | Marginal | Fail', feature: null, context: null, subItems: ['Manufacturer Invoice Verified -- RF', 'Temp Registration/Trade Plate', 'Insurance Policy (New Vehicle) -- RF', "Owner's Manual Present", 'Warranty Card Present & Stamped', 'First Free Service Coupon'] },
  { module: 'Road Test Evaluation', subgroup: 'Comfort & Handling', paramNum: 5084, name: 'Ride Quality & Stability', redFlag: true, options: 'Excellent | Good | Fair | Poor | Critical', feature: null, context: 'road_test_required', subItems: ['Body Roll -- RF', 'Highway Noise', 'Steering Alignment Drift -- RF', 'Straight Line Stability -- RF', 'Speedometer Accuracy'] },
  { module: 'Road Test Evaluation', subgroup: 'Comfort & Handling', paramNum: 5085, name: 'Transmission Under Drive', redFlag: false, options: 'Excellent | Good | Fair | Poor | Critical', feature: null, context: 'road_test_required', subItems: ['Transmission in Traffic', 'Reverse Maneuver', 'Overtake Response', 'Parking Brake on Incline'] },
  { module: 'Road Test Evaluation', subgroup: 'Driving Dynamics', paramNum: 5086, name: 'Acceleration & Power', redFlag: false, options: 'Excellent | Good | Fair | Poor | Critical', feature: null, context: 'road_test_required', subItems: ['Acceleration Lag', 'Gear Hesitation', 'Hill Start Performance', 'Cruise Control', 'Suspension Noise on Bumps'] },
  { module: 'Road Test Evaluation', subgroup: 'Driving Dynamics', paramNum: 5087, name: 'Systems Under Load', redFlag: true, options: 'Excellent | Good | Fair | Poor | Critical', feature: null, context: 'road_test_required', subItems: ['Steering Vibration', 'AC Under Load', 'Engine Temperature Rise -- RF'] },
  { module: 'Road Test Evaluation', subgroup: 'Safety & Response', paramNum: 5088, name: 'Braking Performance', redFlag: true, options: 'Excellent | Good | Fair | Poor | Critical', feature: null, context: 'road_test_required', subItems: ['Emergency Braking -- RF', 'Brake Pull -- RF', 'ABS Activation Feel', 'High Speed Stability -- RF'] },
  { module: 'Road Test Evaluation', subgroup: 'Safety & Response', paramNum: 5089, name: 'Transmission & Steering Response', redFlag: true, options: 'Excellent | Good | Fair | Poor | Critical', feature: null, context: 'road_test_required', subItems: ['Automatic Kickdown', 'Clutch Slip Under Load', 'Traction Control', 'Steering Return -- RF'] },
];

const PDI_EXCLUDE = [5040, 5075, 5080, 5082, 5084, 5085, 5086, 5087, 5088, 5089];

// ── Colors ────────────────────────────────────────────────────────────────────

const COLORS = {
  headerBg: 'FF1A237E', headerFont: 'FFFFFFFF',
  moduleBg: 'FF283593', moduleFont: 'FFFFFFFF',
  subgroupBg: 'FFE8EAF6', subgroupFont: 'FF1A237E',
  subItemBg: 'FFF5F5F5',
  redFlagBg: 'FFFFEBEE', redFlagFont: 'FFC62828',
  borderColor: 'FFB0BEC5',
  greenBg: 'FFE8F5E9', yellowBg: 'FFFFFDE7', orangeBg: 'FFFFF3E0',
  redBg: 'FFFFEBEE', criticalBg: 'FFFFCDD2',
  weightBg: 'FFF3E5F5', weightFont: 'FF6A1B9A',
  checkBg: 'FFE8F5E9',
};

const LAST_COL = 'N';

// ── Sheet builder ─────────────────────────────────────────────────────────────

async function buildSheet(data, weights, title, certRows, outputPath) {
  const wb = new ExcelJS.Workbook();
  wb.creator = 'Motopsy';
  wb.created = new Date();

  const ws = wb.addWorksheet('Checklist', {
    views: [{ state: 'frozen', ySplit: 3 }],
  });

  ws.columns = [
    { header: 'Done', key: 'done', width: 6 },
    { header: '#', key: 'idx', width: 5 },
    { header: 'Module', key: 'module', width: 22 },
    { header: 'Subgroup', key: 'subgroup', width: 22 },
    { header: 'Param #', key: 'paramNum', width: 9 },
    { header: 'Checkpoint / Sub-Item', key: 'name', width: 38 },
    { header: 'Red Flag', key: 'redFlag', width: 10 },
    { header: 'Weightage', key: 'weightage', width: 12 },
    { header: 'Rating Scale', key: 'options', width: 40 },
    { header: 'Rating', key: 'rating', width: 14 },
    { header: 'N/A', key: 'na', width: 6 },
    { header: 'Notes', key: 'notes', width: 30 },
    { header: 'Feature', key: 'feature', width: 14 },
    { header: 'Context', key: 'context', width: 14 },
  ];

  // Title
  ws.mergeCells(`A1:${LAST_COL}1`);
  const titleRow = ws.getRow(1);
  titleRow.getCell(1).value = title;
  titleRow.getCell(1).font = { bold: true, size: 16, color: { argb: 'FFFFFFFF' } };
  titleRow.getCell(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.headerBg } };
  titleRow.getCell(1).alignment = { horizontal: 'center', vertical: 'middle' };
  titleRow.height = 36;

  // Subtitle
  ws.mergeCells(`A2:${LAST_COL}2`);
  const subtitleRow = ws.getRow(2);
  const totalSI = data.reduce((s, d) => s + d.subItems.length, 0);
  subtitleRow.getCell(1).value = `Generated: ${new Date().toISOString().split('T')[0]} | Checkpoints: ${data.length} | Sub-Items: ${totalSI} | Weights: Indian Market Research-Backed`;
  subtitleRow.getCell(1).font = { size: 10, italic: true, color: { argb: 'FF666666' } };
  subtitleRow.getCell(1).alignment = { horizontal: 'center' };
  subtitleRow.height = 22;

  // Header
  const headerRow = ws.getRow(3);
  headerRow.values = ['Done', '#', 'Module', 'Subgroup', 'Param #', 'Checkpoint / Sub-Item', 'Red Flag', 'Weight %', 'Rating Scale', 'Rating', 'N/A', 'Notes', 'Feature', 'Context'];
  headerRow.font = { bold: true, size: 10, color: { argb: COLORS.headerFont } };
  headerRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.headerBg } };
  headerRow.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
  headerRow.height = 28;

  let rowNum = 4;
  let cpIdx = 0;
  let lastMod = '', lastSG = '';

  for (const cp of data) {
    cpIdx++;
    const moduleW = weights.modules[cp.module] || 0;
    const cpW = weights.checkpoints[cp.paramNum] || 0;
    const siWeights = weights.subItems[cp.paramNum] || [];

    // Module header
    if (cp.module !== lastMod) {
      const r = ws.getRow(rowNum);
      ws.mergeCells(`A${rowNum}:${LAST_COL}${rowNum}`);
      r.getCell(1).value = `MODULE: ${cp.module.toUpperCase()} — ${moduleW}% of VRI`;
      r.getCell(1).font = { bold: true, size: 11, color: { argb: COLORS.moduleFont } };
      r.getCell(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.moduleBg } };
      r.getCell(1).alignment = { horizontal: 'left', vertical: 'middle' };
      r.height = 26;
      rowNum++;
      lastMod = cp.module;
      lastSG = '';
    }

    // Subgroup header
    if (cp.subgroup !== lastSG) {
      const r = ws.getRow(rowNum);
      ws.mergeCells(`A${rowNum}:${LAST_COL}${rowNum}`);
      r.getCell(1).value = `  ${cp.subgroup}`;
      r.getCell(1).font = { bold: true, size: 10, color: { argb: COLORS.subgroupFont } };
      r.getCell(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.subgroupBg } };
      r.height = 22;
      rowNum++;
      lastSG = cp.subgroup;
    }

    // Checkpoint row
    const cpRow = ws.getRow(rowNum);
    cpRow.values = [
      true, cpIdx, cp.module, cp.subgroup, cp.paramNum, cp.name,
      cp.redFlag ? 'RED FLAG' : '', `${cpW}%`,
      cp.options, '', '', '', cp.feature || '', cp.context || '',
    ];
    cpRow.font = { bold: true, size: 10 };
    cpRow.height = 24;

    // Weight cell
    cpRow.getCell(8).font = { bold: true, size: 9, color: { argb: COLORS.weightFont } };
    cpRow.getCell(8).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.weightBg } };
    cpRow.getCell(8).alignment = { horizontal: 'center', vertical: 'middle' };

    if (cp.redFlag) {
      cpRow.getCell(7).font = { bold: true, size: 9, color: { argb: COLORS.redFlagFont } };
      cpRow.getCell(7).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.redFlagBg } };
    }

    cpRow.getCell(1).alignment = { horizontal: 'center', vertical: 'middle' };
    cpRow.getCell(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.checkBg } };

    cpRow.eachCell(c => {
      c.border = { top: { style: 'thin', color: { argb: COLORS.borderColor } }, bottom: { style: 'thin', color: { argb: COLORS.borderColor } } };
      if (!c.alignment) c.alignment = {};
      c.alignment.vertical = 'middle';
      c.alignment.wrapText = true;
    });
    cpRow.getCell(2).alignment = { horizontal: 'center', vertical: 'middle' };
    cpRow.getCell(5).alignment = { horizontal: 'center', vertical: 'middle' };
    rowNum++;

    // Sub-item rows
    for (let si = 0; si < cp.subItems.length; si++) {
      const item = cp.subItems[si];
      const isRF = item.includes('-- RF');
      const label = item.replace(' -- RF', '');
      const siW = siWeights[si] || 0;

      const siRow = ws.getRow(rowNum);
      siRow.values = [
        true, '', '', '', '', `    ${label}`,
        isRF ? 'RF' : '', `${siW}%`,
        '', '', '', '', '', '',
      ];
      siRow.font = { size: 9, color: { argb: 'FF424242' } };
      siRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.subItemBg } };
      siRow.height = 20;

      // Sub-item weight
      siRow.getCell(8).font = { size: 8, color: { argb: COLORS.weightFont } };
      siRow.getCell(8).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.weightBg } };
      siRow.getCell(8).alignment = { horizontal: 'center', vertical: 'middle' };

      siRow.getCell(1).alignment = { horizontal: 'center', vertical: 'middle' };
      siRow.getCell(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.checkBg } };

      if (isRF) {
        siRow.getCell(7).font = { bold: true, size: 8, color: { argb: COLORS.redFlagFont } };
        siRow.getCell(7).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.redFlagBg } };
      }

      siRow.eachCell(c => {
        c.border = { bottom: { style: 'hair', color: { argb: 'FFE0E0E0' } } };
        if (!c.alignment) c.alignment = {};
        c.alignment.vertical = 'middle';
      });

      // Rating dropdown
      const opts = cp.options.split(' | ').map(o => o.trim());
      siRow.getCell(10).dataValidation = {
        type: 'list', allowBlank: true,
        formulae: [`"${opts.join(',')}"`],
      };
      siRow.getCell(11).dataValidation = {
        type: 'list', allowBlank: true, formulae: ['"N/A"'],
      };
      siRow.getCell(11).alignment = { horizontal: 'center', vertical: 'middle' };

      rowNum++;
    }
  }

  // ── Weight legend ──
  rowNum++;
  ws.mergeCells(`A${rowNum}:${LAST_COL}${rowNum}`);
  const leg = ws.getRow(rowNum);
  leg.getCell(1).value = 'WEIGHT %: Module header = % of total VRI score. Checkpoint = % within module. Sub-item = % within checkpoint. Effective VRI impact = Module% x Checkpoint% x SubItem% / 10000.';
  leg.getCell(1).font = { size: 9, italic: true, color: { argb: COLORS.weightFont } };
  leg.getCell(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.weightBg } };
  leg.getCell(1).alignment = { wrapText: true };
  leg.height = 32;
  rowNum += 2;

  // ── Module summary ──
  ws.mergeCells(`A${rowNum}:${LAST_COL}${rowNum}`);
  const mwT = ws.getRow(rowNum);
  mwT.getCell(1).value = 'MODULE WEIGHT SUMMARY';
  mwT.getCell(1).font = { bold: true, size: 12, color: { argb: COLORS.headerFont } };
  mwT.getCell(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.headerBg } };
  mwT.getCell(1).alignment = { horizontal: 'center' };
  mwT.height = 28;
  rowNum++;

  const mwH = ws.getRow(rowNum);
  mwH.values = ['', '', '', '', 'Module', '', '', 'Weight %', '', 'Checkpoints'];
  mwH.font = { bold: true, size: 10 };
  mwH.height = 22;
  rowNum++;

  const modCounts = {};
  for (const cp of data) modCounts[cp.module] = (modCounts[cp.module] || 0) + 1;

  let totalW = 0;
  for (const [mod, w] of Object.entries(weights.modules)) {
    if (!modCounts[mod]) continue;
    totalW += w;
    const r = ws.getRow(rowNum);
    r.values = ['', '', '', '', mod, '', '', `${w}%`, '', modCounts[mod]];
    r.font = { size: 10 };
    r.getCell(5).font = { bold: true, size: 10 };
    r.getCell(8).font = { bold: true, size: 10, color: { argb: COLORS.weightFont } };
    r.getCell(8).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.weightBg } };
    r.getCell(8).alignment = { horizontal: 'center' };
    r.height = 22;
    rowNum++;
  }

  const totR = ws.getRow(rowNum);
  totR.values = ['', '', '', '', 'TOTAL', '', '', `${totalW}%`, '', data.length];
  totR.font = { bold: true, size: 10 };
  totR.getCell(8).font = { bold: true, size: 10, color: { argb: COLORS.weightFont } };
  totR.getCell(8).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.weightBg } };
  totR.getCell(8).alignment = { horizontal: 'center' };
  rowNum += 2;

  // ── Certification ──
  ws.mergeCells(`A${rowNum}:${LAST_COL}${rowNum}`);
  const cT = ws.getRow(rowNum);
  cT.getCell(1).value = 'CERTIFICATION GRADES';
  cT.getCell(1).font = { bold: true, size: 12, color: { argb: COLORS.headerFont } };
  cT.getCell(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.headerBg } };
  cT.getCell(1).alignment = { horizontal: 'center' };
  cT.height = 28;
  rowNum++;

  const cH = ws.getRow(rowNum);
  cH.values = ['', '', '', '', 'VRI Score', '', '', 'Certification', '', 'Meaning'];
  cH.font = { bold: true, size: 10 };
  rowNum++;

  const cClrs = [COLORS.greenBg, COLORS.yellowBg, COLORS.orangeBg, COLORS.redBg];
  for (let i = 0; i < certRows.length; i++) {
    const cr = certRows[i];
    const r = ws.getRow(rowNum);
    r.values = ['', '', '', '', cr.score, '', '', cr.cert, '', cr.meaning];
    r.font = { size: 10 };
    r.getCell(5).font = { bold: true, size: 10 };
    r.getCell(8).font = { bold: true, size: 10 };
    r.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: cClrs[i] } };
    r.height = 22;
    rowNum++;
  }

  // Conditional formatting for Rating (col J)
  ws.addConditionalFormatting({
    ref: `J4:J${rowNum}`,
    rules: [
      { type: 'containsText', operator: 'containsText', text: 'Critical', style: { fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.criticalBg } }, font: { bold: true, color: { argb: COLORS.redFlagFont } } }, priority: 1 },
      { type: 'containsText', operator: 'containsText', text: 'Fail', style: { fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.criticalBg } }, font: { bold: true, color: { argb: COLORS.redFlagFont } } }, priority: 2 },
      { type: 'containsText', operator: 'containsText', text: 'Severe', style: { fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.criticalBg } }, font: { bold: true, color: { argb: COLORS.redFlagFont } } }, priority: 3 },
      { type: 'containsText', operator: 'containsText', text: 'Poor', style: { fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.orangeBg } }, font: { bold: true, color: { argb: 'FFE65100' } } }, priority: 4 },
      { type: 'containsText', operator: 'containsText', text: 'Confirmed', style: { fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.criticalBg } }, font: { bold: true, color: { argb: COLORS.redFlagFont } } }, priority: 5 },
      { type: 'containsText', operator: 'containsText', text: 'Excellent', style: { fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.greenBg } }, font: { bold: true, color: { argb: 'FF2E7D32' } } }, priority: 6 },
      { type: 'containsText', operator: 'containsText', text: 'Pass', style: { fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.greenBg } }, font: { bold: true, color: { argb: 'FF2E7D32' } } }, priority: 7 },
      { type: 'containsText', operator: 'containsText', text: 'All Working', style: { fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.greenBg } }, font: { bold: true, color: { argb: 'FF2E7D32' } } }, priority: 8 },
      { type: 'containsText', operator: 'containsText', text: 'None', style: { fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.greenBg } }, font: { bold: true, color: { argb: 'FF2E7D32' } } }, priority: 9 },
    ],
  });

  ws.pageSetup = { orientation: 'landscape', fitToPage: true, fitToWidth: 1, fitToHeight: 0 };

  await wb.xlsx.writeFile(outputPath);
  console.log(`Written: ${outputPath}`);
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  const docsDir = path.join(__dirname, '..', 'docs');

  // Used Car
  await buildSheet(
    ALL_CHECKPOINTS.filter(c => ![5078, 5083].includes(c.paramNum)),
    USED_CAR_WEIGHTS,
    'MOTOPSY - Used Car Inspection Checklist',
    [
      { score: '>= 4.5', cert: 'Gold', meaning: 'Excellent condition, minimal wear' },
      { score: '>= 3.8', cert: 'Silver', meaning: 'Good condition, normal wear' },
      { score: '>= 3.0', cert: 'Verified', meaning: 'Fair condition, some issues noted' },
      { score: '< 3.0', cert: 'Not Certified', meaning: 'Significant issues, not recommended' },
    ],
    path.join(docsDir, 'Motopsy_Used_Car_Checklist.xlsx'),
  );

  // PDI
  const pdiData = ALL_CHECKPOINTS.filter(c => !PDI_EXCLUDE.includes(c.paramNum));
  pdiData.sort((a, b) => a.paramNum - b.paramNum);

  await buildSheet(
    pdiData,
    PDI_WEIGHTS,
    'MOTOPSY - New Car PDI (Pre-Delivery Inspection) Checklist',
    [
      { score: '>= 4.5', cert: 'Accept Delivery', meaning: 'Car is ready - hand over to customer' },
      { score: '>= 3.8', cert: 'Accept with Rectification', meaning: 'Minor issues, dealer fixes later' },
      { score: '>= 3.0', cert: 'Rectify Before Delivery', meaning: 'Issues must be fixed before handing over' },
      { score: '< 3.0 or RF', cert: 'Reject Delivery', meaning: 'Do NOT deliver - serious defects found' },
    ],
    path.join(docsDir, 'Motopsy_New_Car_PDI_Checklist.xlsx'),
  );
}

main().catch(err => { console.error(err); process.exit(1); });
