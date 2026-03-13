/**
 * Repair Cost Tier Configuration
 *
 * Ties repair cost estimates to vehicle value and brand/segment.
 * Based on Indian market research:
 * - IRDAI total loss threshold (75% of IDV)
 * - Real spare parts & labor cost data across brands
 * - Brand-wise service cost multipliers (Maruti ~₹5K/yr vs BMW ~₹40K/yr)
 */

// IRDAI-based depreciation schedule (percentage of ex-showroom lost)
const IRDAI_DEPRECIATION = {
  0.5: 0.05,   // up to 6 months: 5%
  1:   0.15,   // 6 months to 1 year: 15%
  2:   0.20,   // 1 to 2 years: 20%
  3:   0.30,   // 2 to 3 years: 30%
  4:   0.40,   // 3 to 4 years: 40%
  5:   0.50,   // 4 to 5 years: 50%
};
// 5+ years: 50% (IRDAI says "negotiated", we cap at 50%)

// Maximum percentage of vehicle value each module could cost to fully repair
const MODULE_REPAIR_PERCENTS = {
  engine_system:             0.15,
  transmission_drivetrain:   0.12,
  structural_integrity:      0.12,
  paint_panel:               0.06,
  suspension_brakes:         0.06,
  electrical_electronics:    0.05,
  interior_safety:           0.04,
  documentation:             0.01,
  road_test:                 0.04,
};

// Hard cap: total repair cost cannot exceed this % of vehicle market value
const TOTAL_REPAIR_CAP_PERCENT = 0.60;

// Brand → Tier mapping (lowercase for matching)
// T1: Budget domestic (multiplier 0.7) - cheapest parts, widest service network
// T2: Mass market (multiplier 1.0) - baseline
// T3: Premium mass (multiplier 1.5) - some imported parts
// T4: Entry luxury (multiplier 2.5) - specialized parts, ₹25-30K per service
// T5: Full luxury (multiplier 3.5) - ₹7-10L transmission, ₹1.5L headlight

const TIER_DEFINITIONS = {
  T1: { multiplier: 0.7,  label: 'Budget Domestic' },
  T2: { multiplier: 1.0,  label: 'Mass Market' },
  T3: { multiplier: 1.5,  label: 'Premium Mass' },
  T4: { multiplier: 2.5,  label: 'Entry Luxury' },
  T5: { multiplier: 3.5,  label: 'Full Luxury' },
};

// Make → default tier (covers most models for the brand)
const MAKE_TIER_MAP = {
  // T1 - Budget Domestic
  'maruti':          'T1',
  'maruti suzuki':   'T1',
  'tata':            'T1',
  'tata motors':     'T1',
  'renault':         'T1',
  'datsun':          'T1',
  'bajaj':           'T1',
  'force':           'T1',
  'ashok leyland':   'T1',

  // T2 - Mass Market
  'hyundai':         'T2',
  'kia':             'T2',
  'honda':           'T2',
  'toyota':          'T2',
  'mahindra':        'T2',
  'mahindra & mahindra': 'T2',
  'nissan':          'T2',
  'ford':            'T2',
  'isuzu':           'T2',
  'mitsubishi':      'T2',
  'fiat':            'T2',
  'chevrolet':       'T2',

  // T3 - Premium Mass
  'skoda':           'T3',
  'volkswagen':      'T3',
  'mg':              'T3',
  'mg motor':        'T3',
  'jeep':            'T3',
  'citroen':         'T3',
  'citroën':         'T3',
  'mini':            'T3',

  // T4 - Entry Luxury (default for these makes; specific models override to T5)
  'bmw':             'T4',
  'audi':            'T4',
  'mercedes':        'T4',
  'mercedes-benz':   'T4',
  'mercedes benz':   'T4',
  'volvo':           'T4',
  'lexus':           'T4',

  // T5 - Full Luxury
  'jaguar':          'T5',
  'land rover':      'T5',
  'porsche':         'T5',
  'bentley':         'T5',
  'rolls royce':     'T5',
  'rolls-royce':     'T5',
  'ferrari':         'T5',
  'lamborghini':     'T5',
  'maserati':        'T5',
  'aston martin':    'T5',
};

// Model patterns that upgrade a T4 make to T5 (higher-end models)
// Uses substring matching on vehicle_model (case-insensitive)
const T5_MODEL_UPGRADES = {
  'bmw': ['5 series', '6 series', '7 series', '8 series', 'x5', 'x6', 'x7', 'z4', 'i7', 'ix', 'm5', 'm8'],
  'audi': ['a5', 'a6', 'a7', 'a8', 'q5', 'q7', 'q8', 'e-tron', 'rs', 'r8'],
  'mercedes-benz': ['e-class', 'e class', 's-class', 's class', 'gle', 'gls', 'g-class', 'g class',
                     'cls', 'amg gt', 'eqe', 'eqs', 'maybach'],
  'mercedes': ['e-class', 'e class', 's-class', 's class', 'gle', 'gls', 'g-class', 'g class',
               'cls', 'amg gt', 'eqe', 'eqs', 'maybach'],
  'mercedes benz': ['e-class', 'e class', 's-class', 's class', 'gle', 'gls', 'g-class', 'g class',
                    'cls', 'amg gt', 'eqe', 'eqs', 'maybach'],
  'volvo': ['xc90', 's90', 'v90'],
  'lexus': ['ls', 'lx', 'lc', 'rx'],
};

/**
 * Determine repair cost tier from vehicle make and model.
 * @param {string} make - Vehicle make (e.g., "Maruti Suzuki", "BMW")
 * @param {string} model - Vehicle model (e.g., "Swift", "3 Series")
 * @returns {{ tier: string, multiplier: number, label: string }}
 */
function getRepairTier(make, model) {
  if (!make) return { tier: 'T2', ...TIER_DEFINITIONS.T2 };

  const makeLower = make.toLowerCase().trim();
  const modelLower = (model || '').toLowerCase().trim();

  // Find base tier from make
  let tier = MAKE_TIER_MAP[makeLower] || null;

  // If not found by exact match, try partial matching
  if (!tier) {
    for (const [key, value] of Object.entries(MAKE_TIER_MAP)) {
      if (makeLower.includes(key) || key.includes(makeLower)) {
        tier = value;
        break;
      }
    }
  }

  // Default unknown brands to T2 (mass market baseline)
  if (!tier) tier = 'T2';

  // Check if a T4 make should be upgraded to T5 based on model
  if (tier === 'T4' && modelLower) {
    const upgradePatterns = T5_MODEL_UPGRADES[makeLower] || [];
    for (const pattern of upgradePatterns) {
      if (modelLower.includes(pattern)) {
        tier = 'T5';
        break;
      }
    }
  }

  return { tier, ...TIER_DEFINITIONS[tier] };
}

/**
 * Calculate current market value from ex-showroom price using IRDAI depreciation.
 * @param {number} exShowroomPrice - Original ex-showroom price in INR
 * @param {number} vehicleAge - Age in years (fractional OK, e.g., 2.5)
 * @returns {number} Depreciated market value
 */
function calculateMarketValue(exShowroomPrice, vehicleAge) {
  if (!exShowroomPrice || exShowroomPrice <= 0) return 0;
  if (!vehicleAge || vehicleAge <= 0) return exShowroomPrice;

  // Find applicable depreciation rate from IRDAI schedule
  let depreciationRate = 0.50; // default for 5+ years

  const brackets = Object.entries(IRDAI_DEPRECIATION)
    .map(([age, rate]) => ({ age: parseFloat(age), rate }))
    .sort((a, b) => a.age - b.age);

  for (const bracket of brackets) {
    if (vehicleAge <= bracket.age) {
      depreciationRate = bracket.rate;
      break;
    }
  }

  const marketValue = exShowroomPrice * (1 - depreciationRate);
  return Math.round(marketValue);
}

/**
 * Get the tier multiplier by tier code.
 * @param {string} tierCode - e.g., 'T1', 'T2', 'T3', 'T4', 'T5'
 * @returns {number} multiplier
 */
function getTierMultiplier(tierCode) {
  const def = TIER_DEFINITIONS[tierCode];
  return def ? def.multiplier : TIER_DEFINITIONS.T2.multiplier;
}

module.exports = {
  IRDAI_DEPRECIATION,
  MODULE_REPAIR_PERCENTS,
  TOTAL_REPAIR_CAP_PERCENT,
  TIER_DEFINITIONS,
  MAKE_TIER_MAP,
  getRepairTier,
  calculateMarketValue,
  getTierMultiplier,
};
