#!/usr/bin/env node
/**
 * End-to-end test: Red Flag Tiered Scoring System
 *
 * Creates temporary inspections + responses, runs scoring, verifies results,
 * and cleans up. Tests all 6 scenarios:
 *
 *   1. Clean Car          → high rating, Gold, no flags
 *   2. Tier 1: Instant Kill → rating = 0, Not Certified
 *   3. Tier 2: Hard Cap   → rating ≤ 2.0
 *   4. Tier 3: Soft Penalty → small deduction
 *   5. Mixed Tier 2 + 3   → cap + deduction
 *   6. Warning Zone Only  → no penalty, warnings tracked
 *
 * Usage: node scripts/test-scoring-tiers.js
 */

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const { sequelize } = require('../src/config/database');
// Load models/index to register all associations
require('../src/models/index');
const Inspection = require('../src/models/inspection.model');
const InspectionResponse = require('../src/models/inspection-response.model');
const InspectionParameter = require('../src/models/inspection-parameter.model');
const InspectionScore = require('../src/models/inspection-score.model');
const InspectionTemplate = require('../src/models/inspection-template.model');
const ScoringService = require('../src/services/scoring.service');
const { v4: uuidv4 } = require('uuid');

// Suppress SQL noise
sequelize.options.logging = false;

// Track created records for cleanup
const createdInspectionIds = [];

// ── Helpers ─────────────────────────────────────────────────────────────────

/**
 * Parse sub_items_json handling multi-level encoding
 */
function parseSubItems(raw) {
  let si = raw;
  while (typeof si === 'string') {
    try { si = JSON.parse(si); } catch (e) { return []; }
  }
  return Array.isArray(si) ? si : [];
}

/**
 * Build sub_item_responses JSON for a composite parameter.
 * @param {Array} subItems - parsed sub_items_json from parameter
 * @param {number} defaultOption - default selected option (1-5) for all sub-items
 * @param {number} defaultSeverity - default severity score
 * @param {Object} overrides - { label: { selectedOption, severityScore } } for specific sub-items
 */
function buildSubItemResponses(subItems, defaultOption, defaultSeverity, overrides = {}) {
  return subItems.map(si => {
    const ov = overrides[si.label];
    return {
      label: si.label,
      selectedOption: ov?.selectedOption ?? defaultOption,
      severityScore: ov?.severityScore ?? defaultSeverity,
      redFlag: si.redFlag || false,
    };
  });
}

/**
 * Calculate composite severity from sub-item responses (weighted average).
 */
function calcCompositeSeverity(subItems, subItemResponses) {
  const answered = subItemResponses.filter(r => r.selectedOption != null && r.selectedOption > 0);
  if (answered.length === 0) return 0;

  let weightedSum = 0;
  let totalWeight = 0;
  for (const r of answered) {
    const def = subItems.find(d => d.label === r.label);
    const w = def?.weight ?? 1;
    weightedSum += r.severityScore * w;
    totalWeight += w;
  }
  return totalWeight > 0 ? Math.round((weightedSum / totalWeight) * 10000) / 10000 : 0;
}

/**
 * Create a test inspection and responses.
 */
async function createTestInspection(label, params, redFlagOverrides = {}, options = {}) {
  const inspection = await Inspection.create({
    uuid: uuidv4(),
    fuel_type: options.fuelType || 'Petrol',
    transmission_type: 'Manual',
    has_lift: 0,
    road_test_possible: 1,
    status: 'completed',
    parameter_version: 2,
    template_id: options.templateId || 1,
    vehicle_reg_number: 'TEST' + Date.now().toString().slice(-6),
    vehicle_make: 'Maruti',
    vehicle_model: 'Swift',
    vehicle_year: 2020,
    ex_showroom_price: 800000,
    vehicle_market_value: 480000,
    repair_cost_tier: 'T1',
    odometer_km: 45000,
    inspector_name: `Test: ${label}`,
    started_at: new Date(),
    completed_at: new Date(),
    created_at: new Date(),
  });

  createdInspectionIds.push(inspection.id);

  // Default severity for "Good" condition
  const defaultOption = options.defaultOption || 2;
  const defaultSeverity = options.defaultSeverity || 0.15;

  // Create responses for all params
  const responseRecords = [];
  for (const p of params) {
    const subItems = parseSubItems(p.sub_items_json);
    const overrides = redFlagOverrides[p.param_number] || {};

    let subItemResponses = null;
    let severityScore = defaultSeverity;

    if (p.is_composite && subItems.length > 0) {
      subItemResponses = buildSubItemResponses(subItems, defaultOption, defaultSeverity, overrides);
      severityScore = calcCompositeSeverity(subItems, subItemResponses);
    }

    // If there's a whole-param severity override
    if (redFlagOverrides[p.param_number]?._severity != null) {
      severityScore = redFlagOverrides[p.param_number]._severity;
    }

    responseRecords.push({
      inspection_id: inspection.id,
      parameter_id: p.id,
      selected_option: defaultOption,
      severity_score: severityScore,
      sub_item_responses: subItemResponses || null,
      created_at: new Date(),
    });
  }

  await InspectionResponse.bulkCreate(responseRecords);
  return inspection;
}

// ── Test Cases ──────────────────────────────────────────────────────────────

async function runTests() {
  console.log('══════════════════════════════════════════════════════════════');
  console.log('  RED FLAG TIERED SCORING — End-to-End Test Suite');
  console.log('══════════════════════════════════════════════════════════════\n');

  // Load all active composite params (used_car template)
  const allParams = await InspectionParameter.findAll({
    where: { is_composite: 1, is_active: 1 },
    order: [['param_number', 'ASC']],
  });

  // Filter out PDI-only params
  const usedCarParams = allParams.filter(p =>
    !p.template_filter || p.template_filter.includes('used_car') || p.template_filter === null
  );

  console.log(`Loaded ${usedCarParams.length} active used_car composite params\n`);

  const results = [];

  // ── TEST 1: Clean Car ─────────────────────────────────────────────────
  {
    const label = '1. Clean Car (no red flags)';
    console.log(`── ${label} ──`);
    const insp = await createTestInspection(label, usedCarParams);
    const result = await ScoringService.calculateScores(insp.id);
    const d = result.value;

    results.push({
      test: label,
      pass: d.rating >= 4.0 && !d.hasRedFlags && !d.hasWarnings && d.certification === 'Gold',
      rating: d.rating,
      baseRating: d.baseRating,
      cert: d.certification,
      tier: d.redFlagTier,
      t1: d.tier1Count, t2: d.tier2Count, t3: d.tier3Count,
      warnings: d.warningCount,
    });
    console.log(`  Rating: ${d.rating} | Cert: ${d.certification} | RedFlags: ${d.hasRedFlags} | Warnings: ${d.warningCount}`);
    console.log(`  Expected: ≥4.0, Gold, no flags → ${results[results.length-1].pass ? '✓ PASS' : '✗ FAIL'}\n`);
  }

  // ── TEST 2: Tier 1 — Instant Kill (VIN Tampering) ─────────────────────
  {
    const label = '2. Tier 1: Instant Kill (VIN Tampering)';
    console.log(`── ${label} ──`);

    const overrides = {
      5029: {
        'VIN Plate Tampering': { selectedOption: 5, severityScore: 0.95 },
        'Chassis Stamping Mismatch': { selectedOption: 5, severityScore: 0.95 },
      },
    };

    const insp = await createTestInspection(label, usedCarParams, overrides);
    const result = await ScoringService.calculateScores(insp.id);
    const d = result.value;

    results.push({
      test: label,
      pass: d.rating === 0 && d.redFlagTier === 1 && d.tier1Count >= 2 && d.certification === 'Not Certified',
      rating: d.rating,
      baseRating: d.baseRating,
      cert: d.certification,
      tier: d.redFlagTier,
      t1: d.tier1Count, t2: d.tier2Count, t3: d.tier3Count,
      warnings: d.warningCount,
    });
    console.log(`  Rating: ${d.rating} | Base: ${d.baseRating} | Cert: ${d.certification}`);
    console.log(`  Tier: ${d.redFlagTier} | T1:${d.tier1Count} T2:${d.tier2Count} T3:${d.tier3Count}`);
    console.log(`  Red flags: ${d.redFlagParams?.map(f => f.subItemLabel).join(', ')}`);
    console.log(`  Expected: rating=0, Tier 1, Not Certified → ${results[results.length-1].pass ? '✓ PASS' : '✗ FAIL'}\n`);
  }

  // ── TEST 3: Tier 2 — Hard Cap (Chassis Damage + Airbag Warning) ───────
  {
    const label = '3. Tier 2: Hard Cap (Chassis + Airbag)';
    console.log(`── ${label} ──`);

    const overrides = {
      5026: {
        'Chassis Rail Straightness': { selectedOption: 4, severityScore: 0.70 },
        'Cross-Member Alignment': { selectedOption: 4, severityScore: 0.70 },
      },
      5067: {
        'Airbag Warning Light': { selectedOption: 5, severityScore: 0.95 },
      },
    };

    const insp = await createTestInspection(label, usedCarParams, overrides);
    const result = await ScoringService.calculateScores(insp.id);
    const d = result.value;

    // 3 Tier 2 flags: cap = 2.0 - 0.25*(3-1) = 1.50
    const expectedCap = 2.0 - 0.25 * (3 - 1);
    results.push({
      test: label,
      pass: d.rating <= 2.0 && d.redFlagTier === 2 && d.tier2Count === 3,
      rating: d.rating,
      baseRating: d.baseRating,
      cert: d.certification,
      tier: d.redFlagTier,
      t1: d.tier1Count, t2: d.tier2Count, t3: d.tier3Count,
      tier2Cap: d.tier2Cap,
      warnings: d.warningCount,
    });
    console.log(`  Rating: ${d.rating} | Base: ${d.baseRating} | Cert: ${d.certification}`);
    console.log(`  Tier: ${d.redFlagTier} | T2 count: ${d.tier2Count} | T2 cap: ${d.tier2Cap}`);
    console.log(`  Red flags: ${d.redFlagParams?.map(f => f.subItemLabel).join(', ')}`);
    console.log(`  Expected: rating≤2.0, Tier 2, cap=${expectedCap} → ${results[results.length-1].pass ? '✓ PASS' : '✗ FAIL'}\n`);
  }

  // ── TEST 4: Tier 3 — Soft Penalty (Brake Pads + Lights) ──────────────
  {
    const label = '4. Tier 3: Soft Penalty (Brakes + Lights)';
    console.log(`── ${label} ──`);

    const overrides = {
      5048: {
        'Brake Pad Front Left': { selectedOption: 5, severityScore: 0.95 },
        'Brake Pad Front Right': { selectedOption: 5, severityScore: 0.95 },
        'Brake Pad Rear Left': { selectedOption: 4, severityScore: 0.70 },
        'Brake Pad Rear Right': { selectedOption: 4, severityScore: 0.70 },
      },
      5063: {
        'Headlight Function': { selectedOption: 4, severityScore: 0.70 },
        'Brake Light Function': { selectedOption: 4, severityScore: 0.70 },
      },
    };

    const insp = await createTestInspection(label, usedCarParams, overrides);
    const result = await ScoringService.calculateScores(insp.id);
    const d = result.value;

    // 6 Tier 3 flags: deduction = min(6 × 0.10, 1.50) = 0.60
    const expectedDeduction = Math.min(6 * 0.10, 1.50);
    results.push({
      test: label,
      pass: d.redFlagTier === 3 && d.tier3Count === 6 && d.tier1Count === 0 && d.tier2Count === 0
            && Math.abs(d.tier3Deduction - expectedDeduction) < 0.01,
      rating: d.rating,
      baseRating: d.baseRating,
      cert: d.certification,
      tier: d.redFlagTier,
      t1: d.tier1Count, t2: d.tier2Count, t3: d.tier3Count,
      deduction: d.tier3Deduction,
      warnings: d.warningCount,
    });
    console.log(`  Rating: ${d.rating} | Base: ${d.baseRating} | Cert: ${d.certification}`);
    console.log(`  Tier: ${d.redFlagTier} | T3 count: ${d.tier3Count} | Deduction: ${d.tier3Deduction}`);
    console.log(`  Expected: Tier 3 only, 6 flags, deduction=${expectedDeduction} → ${results[results.length-1].pass ? '✓ PASS' : '✗ FAIL'}\n`);
  }

  // ── TEST 5: Mixed Tier 2 + Tier 3 ────────────────────────────────────
  {
    const label = '5. Mixed: Tier 2 (ABS) + Tier 3 (Brakes × 4)';
    console.log(`── ${label} ──`);

    const overrides = {
      // Tier 2: ABS warning
      5066: {
        'ABS Warning Light': { selectedOption: 5, severityScore: 0.95 },
      },
      // Tier 3: all 4 brake pads worn
      5048: {
        'Brake Pad Front Left': { selectedOption: 5, severityScore: 0.95 },
        'Brake Pad Front Right': { selectedOption: 5, severityScore: 0.95 },
        'Brake Pad Rear Left': { selectedOption: 5, severityScore: 0.95 },
        'Brake Pad Rear Right': { selectedOption: 5, severityScore: 0.95 },
      },
    };

    const insp = await createTestInspection(label, usedCarParams, overrides);
    const result = await ScoringService.calculateScores(insp.id);
    const d = result.value;

    // Tier 2: 1 flag → cap at 2.0, then Tier 3: 4 flags → −0.40
    // Final: min(baseRating, 2.0) − 0.40
    results.push({
      test: label,
      pass: d.redFlagTier === 2 && d.tier2Count === 1 && d.tier3Count === 4
            && d.rating <= 2.0 && d.tier2Cap === 2.0,
      rating: d.rating,
      baseRating: d.baseRating,
      cert: d.certification,
      tier: d.redFlagTier,
      t1: d.tier1Count, t2: d.tier2Count, t3: d.tier3Count,
      tier2Cap: d.tier2Cap,
      deduction: d.tier3Deduction,
      warnings: d.warningCount,
    });
    console.log(`  Rating: ${d.rating} | Base: ${d.baseRating} | Cert: ${d.certification}`);
    console.log(`  Tier: ${d.redFlagTier} | T2:${d.tier2Count} (cap=${d.tier2Cap}) | T3:${d.tier3Count} (−${d.tier3Deduction})`);
    console.log(`  Expected: cap at 2.0, then −0.40 = ~1.60 → ${results[results.length-1].pass ? '✓ PASS' : '✗ FAIL'}\n`);
  }

  // ── TEST 6: Warning Zone Only (severity 0.50–0.69) ───────────────────
  {
    const label = '6. Warning Zone Only (no penalty)';
    console.log(`── ${label} ──`);

    // Red flag sub-items at severity 0.60 (warning range)
    const overrides = {
      5029: {
        'VIN Plate Tampering': { selectedOption: 3, severityScore: 0.60 },
      },
      5026: {
        'Chassis Rail Straightness': { selectedOption: 3, severityScore: 0.55 },
      },
      5048: {
        'Brake Pad Front Left': { selectedOption: 3, severityScore: 0.65 },
      },
    };

    const insp = await createTestInspection(label, usedCarParams, overrides);
    const result = await ScoringService.calculateScores(insp.id);
    const d = result.value;

    results.push({
      test: label,
      pass: !d.hasRedFlags && d.hasWarnings && d.warningCount === 3
            && d.redFlagTier === null && d.rating === d.baseRating,
      rating: d.rating,
      baseRating: d.baseRating,
      cert: d.certification,
      tier: d.redFlagTier,
      t1: d.tier1Count, t2: d.tier2Count, t3: d.tier3Count,
      warnings: d.warningCount,
      warningDetails: d.warningParams?.map(w => `${w.subItemLabel}(${w.severityScore})`).join(', '),
    });
    console.log(`  Rating: ${d.rating} | Base: ${d.baseRating} | Cert: ${d.certification}`);
    console.log(`  Warnings: ${d.warningCount} — ${results[results.length-1].warningDetails}`);
    console.log(`  RedFlags: ${d.hasRedFlags} | Tier: ${d.redFlagTier}`);
    console.log(`  Expected: no penalty, 3 warnings, rating=baseRating → ${results[results.length-1].pass ? '✓ PASS' : '✗ FAIL'}\n`);
  }

  // ── Summary ───────────────────────────────────────────────────────────
  console.log('══════════════════════════════════════════════════════════════');
  console.log('  RESULTS SUMMARY');
  console.log('══════════════════════════════════════════════════════════════\n');

  let passCount = 0;
  for (const r of results) {
    const icon = r.pass ? '✓' : '✗';
    console.log(`  ${icon} ${r.test}`);
    console.log(`    Rating: ${r.rating} (base: ${r.baseRating}) | Cert: ${r.cert} | Tier: ${r.tier ?? '—'}`);
    console.log(`    T1:${r.t1} T2:${r.t2} T3:${r.t3} Warn:${r.warnings}`);
    if (r.tier2Cap != null) console.log(`    T2 cap: ${r.tier2Cap}`);
    if (r.deduction != null) console.log(`    T3 deduction: ${r.deduction}`);
    console.log();
    if (r.pass) passCount++;
  }

  console.log(`  ${passCount}/${results.length} tests passed\n`);

  return passCount === results.length;
}

// ── Cleanup ─────────────────────────────────────────────────────────────────

async function cleanup() {
  if (createdInspectionIds.length === 0) return;

  console.log('── Cleanup ──');
  for (const id of createdInspectionIds) {
    await InspectionScore.destroy({ where: { inspection_id: id } });
    await InspectionResponse.destroy({ where: { inspection_id: id } });
    await Inspection.destroy({ where: { id } });
  }
  console.log(`  Cleaned up ${createdInspectionIds.length} test inspections\n`);
}

// ── Main ────────────────────────────────────────────────────────────────────

(async () => {
  try {
    const allPassed = await runTests();
    await cleanup();
    await sequelize.close();
    process.exit(allPassed ? 0 : 1);
  } catch (error) {
    console.error('\n✗ Test suite error:', error);
    await cleanup().catch(() => {});
    await sequelize.close();
    process.exit(1);
  }
})();
