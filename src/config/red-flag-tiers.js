/**
 * Red Flag Tier System — Indian Used Car Market
 *
 * Three tiers of red flags with escalating scoring impact:
 *   Tier 1 (Instant Kill):  rating → 0, certification → "Not Certified"
 *   Tier 2 (Hard Cap):      rating capped at 2.0, decreasing with count
 *   Tier 3 (Soft Penalty):  flat 0.10 deduction per flag, max 1.50 total
 *
 * Warning zone: severity 0.50–0.69 → displayed on report, no score penalty
 * PDI: any red flag (any tier) → "Reject Delivery"
 *
 * Sub-items with severity < 0.50 are not flagged at all.
 * Sub-items with severity 0.50–0.69 are warnings (shown but no penalty).
 * Sub-items with severity ≥ 0.70 trigger their tier's penalty.
 *
 * TIER ITEMS are now stored in the `red_flag_tiers` database table and
 * loaded at startup via loadTiersFromDB(). The static arrays below serve
 * as a fallback in case the DB load fails.
 */

const logger = require('./logger');

// ── Tier metadata (structural — stays in config) ─────────────────────────────

const TIER_1 = {
  label: 'Instant Kill',
  description: 'Vehicle unsafe or fraudulent — rating forced to 0',
};

const TIER_2 = {
  label: 'Hard Cap',
  description: 'Major safety/structural issue — rating capped',
  baseCap: 2.0,
  perAdditional: 0.25,
  floorCap: 0.5,
};

const TIER_3 = {
  label: 'Soft Penalty',
  description: 'Maintenance/wear issue — minor rating deduction',
  perFlagDeduction: 0.10,
  maxDeduction: 1.50,
};

// ── Severity thresholds ─────────────────────────────────────────────────────
const SEVERITY_THRESHOLDS = {
  WARNING_MIN: 0.50,   // 0.50–0.69 = warning (displayed, no penalty)
  RED_FLAG_MIN: 0.70,  // ≥ 0.70 = triggers tier penalty
};

// ── Static fallback items (used if DB load fails) ───────────────────────────
const FALLBACK_TIER_1_ITEMS = [
  { paramNumber: 5024, subItemLabel: 'CNG Leak Test' },
  { paramNumber: 5029, subItemLabel: 'VIN Plate Tampering' },
  { paramNumber: 5029, subItemLabel: 'Chassis Stamping Mismatch' },
  { paramNumber: 5034, subItemLabel: 'Pillar Cut & Weld Evidence' },
  { paramNumber: 5015, subItemLabel: 'HV Cable Inspection' },
  { paramNumber: 5008, subItemLabel: 'Overheating Evidence' },
  { paramNumber: 5002, subItemLabel: 'Coolant-Oil Mixing' },
  { paramNumber: 5081, subItemLabel: 'Total Loss Cross-Check' },
  { paramNumber: 5079, subItemLabel: 'Chassis Number Match' },
  { paramNumber: 5079, subItemLabel: 'Engine Number Match' },
];

const FALLBACK_TIER_2_ITEMS = [
  { paramNumber: 5026, subItemLabel: 'Chassis Rail Straightness' },
  { paramNumber: 5026, subItemLabel: 'Cross-Member Alignment' },
  { paramNumber: 5027, subItemLabel: 'Engine Bay Structure Damage' },
  { paramNumber: 5027, subItemLabel: 'Firewall Distortion' },
  { paramNumber: 5027, subItemLabel: 'Crumple Zone Damage' },
  { paramNumber: 5034, subItemLabel: 'A-Pillar Condition' },
  { paramNumber: 5034, subItemLabel: 'B-Pillar Condition' },
  { paramNumber: 5035, subItemLabel: 'Roof Line Straightness' },
  { paramNumber: 5066, subItemLabel: 'ABS Warning Light' },
  { paramNumber: 5067, subItemLabel: 'Airbag Warning Light' },
  { paramNumber: 5074, subItemLabel: 'Airbag Deployment Signs' },
  { paramNumber: 5081, subItemLabel: 'Accident Claim History' },
  { paramNumber: 5081, subItemLabel: 'Flood Record Check' },
  { paramNumber: 5011, subItemLabel: 'ECU Tampering Signs' },
  { paramNumber: 5022, subItemLabel: 'Gear Slipping' },
  { paramNumber: 5080, subItemLabel: 'RC Original Verification' },
  { paramNumber: 5025, subItemLabel: 'Axle Play' },
  { paramNumber: 5075, subItemLabel: 'Pedal Wear vs Odometer' },
  { paramNumber: 5075, subItemLabel: 'Steering Wear vs Odometer' },
];

const FALLBACK_TIER_3_ITEMS = [
  { paramNumber: 5048, subItemLabel: 'Brake Pad Front Left' },
  { paramNumber: 5048, subItemLabel: 'Brake Pad Front Right' },
  { paramNumber: 5048, subItemLabel: 'Brake Pad Rear Left' },
  { paramNumber: 5048, subItemLabel: 'Brake Pad Rear Right' },
  { paramNumber: 5049, subItemLabel: 'Brake Fluid Leakage' },
  { paramNumber: 5049, subItemLabel: 'Brake Line Corrosion' },
  { paramNumber: 5050, subItemLabel: 'Handbrake Holding' },
  { paramNumber: 5053, subItemLabel: 'Ball Joint Play' },
  { paramNumber: 5054, subItemLabel: 'Steering Free Play' },
  { paramNumber: 5025, subItemLabel: 'Driveshaft Alignment' },
  { paramNumber: 5055, subItemLabel: 'Tyre Tread Front Left' },
  { paramNumber: 5055, subItemLabel: 'Tyre Tread Front Right' },
  { paramNumber: 5055, subItemLabel: 'Tyre Tread Rear Left' },
  { paramNumber: 5055, subItemLabel: 'Tyre Tread Rear Right' },
  { paramNumber: 5063, subItemLabel: 'Headlight Function' },
  { paramNumber: 5063, subItemLabel: 'Brake Light Function' },
  { paramNumber: 5063, subItemLabel: 'Indicator Function' },
  { paramNumber: 5063, subItemLabel: 'Hazard Light Function' },
  { paramNumber: 5071, subItemLabel: 'Seatbelt Lock Test' },
  { paramNumber: 5080, subItemLabel: 'Insurance Validity' },
  { paramNumber: 5002, subItemLabel: 'Coolant Color' },
  { paramNumber: 5084, subItemLabel: 'Body Roll' },
  { paramNumber: 5084, subItemLabel: 'Steering Alignment Drift' },
  { paramNumber: 5084, subItemLabel: 'Straight Line Stability' },
  { paramNumber: 5086, subItemLabel: 'Engine Temperature Rise' },
  { paramNumber: 5088, subItemLabel: 'Emergency Braking' },
  { paramNumber: 5088, subItemLabel: 'Brake Pull' },
  { paramNumber: 5088, subItemLabel: 'High Speed Stability' },
  { paramNumber: 5089, subItemLabel: 'Steering Return' },
];

const FALLBACK_PDI_RED_FLAGS = [
  { paramNumber: 5083, subItemLabel: 'Manufacturer Invoice Verified' },
  { paramNumber: 5083, subItemLabel: 'Insurance Policy (New Vehicle)' },
];

// ── Runtime tier index ──────────────────────────────────────────────────────
// Key format: "paramNumber:subItemLabel" → tier number (1, 2, or 3)
const _tierIndex = new Map();
let _tiersLoadedFromDB = false;

/**
 * Build the tier index from static fallback arrays.
 * Called at module load and as fallback if DB load fails.
 */
function _buildFallbackIndex() {
  _tierIndex.clear();
  for (const item of FALLBACK_TIER_1_ITEMS) {
    _tierIndex.set(`${item.paramNumber}:${item.subItemLabel}`, 1);
  }
  for (const item of FALLBACK_TIER_2_ITEMS) {
    _tierIndex.set(`${item.paramNumber}:${item.subItemLabel}`, 2);
  }
  for (const item of FALLBACK_TIER_3_ITEMS) {
    _tierIndex.set(`${item.paramNumber}:${item.subItemLabel}`, 3);
  }
  for (const item of FALLBACK_PDI_RED_FLAGS) {
    _tierIndex.set(`${item.paramNumber}:${item.subItemLabel}`, 3);
  }
  _tiersLoadedFromDB = false;
}

// Initialize with fallback on module load
_buildFallbackIndex();

/**
 * Load tier items from the `red_flag_tiers` database table and rebuild
 * the in-memory lookup index. Falls back to static items on failure.
 *
 * @returns {Promise<boolean>} true if DB load succeeded, false if fell back
 */
async function loadTiersFromDB() {
  try {
    // Late-require to avoid circular dependency at module load time
    const RedFlagTier = require('../models/red-flag-tier.model');
    const rows = await RedFlagTier.findAll({
      attributes: ['param_number', 'sub_item_label', 'tier', 'is_pdi_only'],
      raw: true,
    });

    if (!rows || rows.length === 0) {
      logger.warn('red-flag-tiers: No rows in red_flag_tiers table — using static fallback');
      _buildFallbackIndex();
      return false;
    }

    _tierIndex.clear();
    for (const row of rows) {
      _tierIndex.set(`${row.param_number}:${row.sub_item_label}`, row.tier);
    }

    _tiersLoadedFromDB = true;
    logger.info(`red-flag-tiers: Loaded ${rows.length} tier items from database`);
    return true;
  } catch (err) {
    logger.error('red-flag-tiers: Failed to load from DB, using static fallback —', err.message);
    _buildFallbackIndex();
    return false;
  }
}

/**
 * Refresh the in-memory tier index from the database.
 * Call this after any admin CRUD mutation on the red_flag_tiers table.
 *
 * @returns {Promise<boolean>} true if refresh succeeded
 */
async function refreshTierIndex() {
  return loadTiersFromDB();
}

/**
 * Get the red flag tier for a specific sub-item.
 * @param {number} paramNumber - Composite checkpoint param_number
 * @param {string} subItemLabel - Exact sub-item label
 * @returns {number|null} 1, 2, 3 or null (not a red flag)
 */
function getSubItemTier(paramNumber, subItemLabel) {
  return _tierIndex.get(`${paramNumber}:${subItemLabel}`) || null;
}

/**
 * Check whether tiers are currently loaded from DB or using fallback.
 * @returns {boolean}
 */
function isTiersLoadedFromDB() {
  return _tiersLoadedFromDB;
}

/**
 * Calculate the Tier 2 rating cap based on number of Tier 2 flags.
 * First flag: cap at baseCap (2.0). Each additional: −0.25. Floor: 0.5.
 * @param {number} count - Number of triggered Tier 2 red flags
 * @returns {number} Maximum allowed rating
 */
function getTier2Cap(count) {
  if (count <= 0) return Infinity;
  const cap = TIER_2.baseCap - TIER_2.perAdditional * (count - 1);
  return Math.max(cap, TIER_2.floorCap);
}

/**
 * Calculate the Tier 3 total deduction.
 * @param {number} count - Number of triggered Tier 3 red flags
 * @returns {number} Total rating deduction (capped at maxDeduction)
 */
function getTier3Deduction(count) {
  if (count <= 0) return 0;
  return Math.min(count * TIER_3.perFlagDeduction, TIER_3.maxDeduction);
}

module.exports = {
  TIER_1,
  TIER_2,
  TIER_3,
  SEVERITY_THRESHOLDS,
  getSubItemTier,
  getTier2Cap,
  getTier3Deduction,
  loadTiersFromDB,
  refreshTierIndex,
  isTiersLoadedFromDB,
};
