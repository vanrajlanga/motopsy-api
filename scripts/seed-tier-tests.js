#!/usr/bin/env node
/**
 * Seed 6 test inspections for browser testing.
 * Creates inspections, populates responses, and triggers scoring.
 * Does NOT clean up — data remains for admin panel review.
 */

const path = require('path');
const apiRoot = '/Users/chintangohil/Projects/motopsy/motopsy-api';
require(path.join(apiRoot, 'node_modules', 'dotenv')).config({ path: path.join(apiRoot, '.env') });
process.chdir(apiRoot);

const { sequelize } = require('../src/config/database');
require('../src/models/index');
const Inspection = require('../src/models/inspection.model');
const InspectionResponse = require('../src/models/inspection-response.model');
const InspectionParameter = require('../src/models/inspection-parameter.model');
const InspectionScore = require('../src/models/inspection-score.model');
const ScoringService = require('../src/services/scoring.service');
const { v4: uuidv4 } = require('uuid');

sequelize.options.logging = false;

function parseSubItems(raw) {
  let si = raw;
  while (typeof si === 'string') {
    try { si = JSON.parse(si); } catch (e) { return []; }
  }
  return Array.isArray(si) ? si : [];
}

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

function calcCompositeSeverity(subItems, subItemResponses) {
  const answered = subItemResponses.filter(r => r.selectedOption != null && r.selectedOption > 0);
  if (answered.length === 0) return 0;
  let weightedSum = 0, totalWeight = 0;
  for (const r of answered) {
    const def = subItems.find(d => d.label === r.label);
    const w = def?.weight ?? 1;
    weightedSum += r.severityScore * w;
    totalWeight += w;
  }
  return totalWeight > 0 ? Math.round((weightedSum / totalWeight) * 10000) / 10000 : 0;
}

async function createInspection(label, params, overrides = {}, opts = {}) {
  const insp = await Inspection.create({
    uuid: uuidv4(),
    fuel_type: opts.fuelType || 'Petrol',
    transmission_type: 'Manual',
    has_lift: 0,
    road_test_possible: 1,
    status: 'completed',
    parameter_version: 2,
    template_id: opts.templateId || 1,
    vehicle_reg_number: 'TEST' + Date.now().toString().slice(-6),
    vehicle_make: opts.make || 'Maruti',
    vehicle_model: opts.model || 'Swift',
    vehicle_year: opts.year || 2021,
    ex_showroom_price: 800000,
    vehicle_market_value: 480000,
    repair_cost_tier: 'T1',
    odometer_km: opts.km || 35000,
    inspector_name: label,
    started_at: new Date(),
    completed_at: new Date(),
    created_at: new Date(),
  });

  const defaultOpt = 2, defaultSev = 0.15;
  const records = [];

  for (const p of params) {
    const subItems = parseSubItems(p.sub_items_json);
    const ov = overrides[p.param_number] || {};
    let subItemResponses = null;
    let severity = defaultSev;

    if (p.is_composite && subItems.length > 0) {
      subItemResponses = buildSubItemResponses(subItems, defaultOpt, defaultSev, ov);
      severity = calcCompositeSeverity(subItems, subItemResponses);
    }

    records.push({
      inspection_id: insp.id,
      parameter_id: p.id,
      selected_option: defaultOpt,
      severity_score: severity,
      sub_item_responses: subItemResponses || null,
      created_at: new Date(),
    });
  }

  await InspectionResponse.bulkCreate(records);
  const result = await ScoringService.calculateScores(insp.id);
  await Inspection.update({ status: 'scored' }, { where: { id: insp.id } });
  return { id: insp.id, ...result.value };
}

(async () => {
  const params = await InspectionParameter.findAll({
    where: { is_composite: 1, is_active: 1 },
    order: [['param_number', 'ASC']],
  });
  const usedCar = params.filter(p => !p.template_filter || p.template_filter.includes('used_car') || p.template_filter === null);

  console.log('Creating 6 test inspections...\n');

  // 1. Clean Car
  const t1 = await createInspection('TEST: Clean Car', usedCar, {}, { make: 'Maruti', model: 'Baleno', year: 2022, km: 25000 });
  console.log(`1. Clean Car      → ID:${t1.id} Rating:${t1.rating} Cert:${t1.certification}`);

  // 2. Tier 1: VIN Tampering
  const t2 = await createInspection('TEST: Tier-1 VIN Tampered', usedCar, {
    5029: {
      'VIN Plate Tampering': { selectedOption: 5, severityScore: 0.95 },
      'Chassis Stamping Mismatch': { selectedOption: 5, severityScore: 0.95 },
    },
  }, { make: 'Hyundai', model: 'Creta', year: 2020, km: 55000 });
  console.log(`2. Tier 1 Kill    → ID:${t2.id} Rating:${t2.rating} Cert:${t2.certification} T1:${t2.tier1Count}`);

  // 3. Tier 2: Chassis + Airbag
  const t3 = await createInspection('TEST: Tier-2 Chassis Damage', usedCar, {
    5026: {
      'Chassis Rail Straightness': { selectedOption: 4, severityScore: 0.70 },
      'Cross-Member Alignment': { selectedOption: 4, severityScore: 0.70 },
    },
    5067: {
      'Airbag Warning Light': { selectedOption: 5, severityScore: 0.95 },
    },
  }, { make: 'Honda', model: 'City', year: 2019, km: 68000 });
  console.log(`3. Tier 2 Cap     → ID:${t3.id} Rating:${t3.rating} Cert:${t3.certification} T2:${t3.tier2Count} Cap:${t3.tier2Cap}`);

  // 4. Tier 3: Brake Pads + Lights
  const t4 = await createInspection('TEST: Tier-3 Worn Brakes', usedCar, {
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
  }, { make: 'Tata', model: 'Nexon', year: 2020, km: 48000 });
  console.log(`4. Tier 3 Penalty → ID:${t4.id} Rating:${t4.rating} Cert:${t4.certification} T3:${t4.tier3Count} Ded:${t4.tier3Deduction}`);

  // 5. Mixed Tier 2 + 3
  const t5 = await createInspection('TEST: Mixed T2+T3', usedCar, {
    5066: { 'ABS Warning Light': { selectedOption: 5, severityScore: 0.95 } },
    5048: {
      'Brake Pad Front Left': { selectedOption: 5, severityScore: 0.95 },
      'Brake Pad Front Right': { selectedOption: 5, severityScore: 0.95 },
      'Brake Pad Rear Left': { selectedOption: 5, severityScore: 0.95 },
      'Brake Pad Rear Right': { selectedOption: 5, severityScore: 0.95 },
    },
  }, { make: 'Kia', model: 'Seltos', year: 2021, km: 42000 });
  console.log(`5. Mixed T2+T3   → ID:${t5.id} Rating:${t5.rating} Cert:${t5.certification} T2:${t5.tier2Count} T3:${t5.tier3Count}`);

  // 6. Warning Zone
  const t6 = await createInspection('TEST: Warnings Only', usedCar, {
    5029: { 'VIN Plate Tampering': { selectedOption: 3, severityScore: 0.60 } },
    5026: { 'Chassis Rail Straightness': { selectedOption: 3, severityScore: 0.55 } },
    5048: { 'Brake Pad Front Left': { selectedOption: 3, severityScore: 0.65 } },
  }, { make: 'Toyota', model: 'Glanza', year: 2022, km: 20000 });
  console.log(`6. Warnings Only  → ID:${t6.id} Rating:${t6.rating} Cert:${t6.certification} Warn:${t6.warningCount}`);

  console.log('\nAll test inspections created. IDs:', [t1.id, t2.id, t3.id, t4.id, t5.id, t6.id].join(', '));
  console.log('Browse: http://localhost:4201/admin/inspections');

  await sequelize.close();
})();
