#!/usr/bin/env node
/**
 * Apply research-backed Indian market weights to the database at all 3 levels:
 *   1. Module weights → inspection_modules.weight + inspection_templates.module_weights
 *   2. Checkpoint weights → inspection_parameters.weightage + weightage_pdi
 *   3. Sub-item weights → inspection_parameters.sub_items_json (weight + weight_pdi fields)
 *
 * Safe to re-run (idempotent). Only updates composite params (param_number 5001–5089).
 *
 * Usage: node scripts/apply-research-weights.js
 */

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const { sequelize } = require('../src/config/database');
const InspectionModule = require('../src/models/inspection-module.model');
const InspectionParameter = require('../src/models/inspection-parameter.model');
const InspectionTemplate = require('../src/models/inspection-template.model');
const { USED_CAR_WEIGHTS, PDI_WEIGHTS, MODULE_NAME_TO_SLUG } = require('../src/config/inspection-weights');

async function applyWeights() {
  console.log('═══════════════════════════════════════════════════════');
  console.log('  Applying research-backed weights to database');
  console.log('═══════════════════════════════════════════════════════\n');

  const transaction = await sequelize.transaction();
  try {
    // ── Level 1: Module weights ──────────────────────────────────────────────
    console.log('── Level 1: Module weights ──');

    // Build template module_weights JSON objects (slug → decimal)
    const usedCarModWeights = {};
    const pdiModWeights = {};

    for (const [name, usedWeight] of Object.entries(USED_CAR_WEIGHTS.modules)) {
      const slug = MODULE_NAME_TO_SLUG[name];
      if (!slug) { console.warn(`  ⚠ Unknown module name: ${name}`); continue; }

      const pdiWeight = PDI_WEIGHTS.modules[name] ?? 0;

      // Update inspection_modules.weight (decimal 0-1, used as default for used_car)
      const [count] = await InspectionModule.update(
        { weight: (usedWeight / 100).toFixed(4) },
        { where: { slug }, transaction }
      );

      usedCarModWeights[slug] = parseFloat((usedWeight / 100).toFixed(4));
      pdiModWeights[slug] = parseFloat((pdiWeight / 100).toFixed(4));

      console.log(`  ${slug}: used=${usedWeight}% pdi=${pdiWeight}% ${count ? '✓' : '(not found)'}`);
    }

    // Update template module_weights JSON
    await InspectionTemplate.update(
      { module_weights: JSON.stringify(usedCarModWeights) },
      { where: { slug: 'used_car' }, transaction }
    );
    await InspectionTemplate.update(
      { module_weights: JSON.stringify(pdiModWeights) },
      { where: { slug: 'new_car_pdi' }, transaction }
    );
    console.log('  Templates updated ✓\n');

    // ── Level 2: Checkpoint weights ──────────────────────────────────────────
    console.log('── Level 2: Checkpoint weights ──');
    let l2Updated = 0;
    let l2Skipped = 0;

    for (const [paramNumStr, usedWeight] of Object.entries(USED_CAR_WEIGHTS.checkpoints)) {
      const paramNum = parseInt(paramNumStr);
      const pdiWeight = PDI_WEIGHTS.checkpoints[paramNum] ?? null;

      const [count] = await InspectionParameter.update(
        {
          weightage: usedWeight,
          weightage_pdi: pdiWeight,
        },
        { where: { param_number: paramNum }, transaction }
      );

      if (count > 0) {
        l2Updated++;
      } else {
        l2Skipped++;
        console.log(`  ⚠ param_number ${paramNum} not found in DB`);
      }
    }

    // PDI-only checkpoints (not in USED_CAR_WEIGHTS but in PDI_WEIGHTS)
    for (const [paramNumStr, pdiWeight] of Object.entries(PDI_WEIGHTS.checkpoints)) {
      const paramNum = parseInt(paramNumStr);
      if (USED_CAR_WEIGHTS.checkpoints[paramNum] != null) continue; // already handled

      const [count] = await InspectionParameter.update(
        { weightage_pdi: pdiWeight },
        { where: { param_number: paramNum }, transaction }
      );

      if (count > 0) {
        l2Updated++;
        console.log(`  PDI-only ${paramNum}: pdi=${pdiWeight}% ✓`);
      }
    }

    console.log(`  Updated: ${l2Updated}, Skipped: ${l2Skipped}\n`);

    // ── Level 3: Sub-item weights ────────────────────────────────────────────
    console.log('── Level 3: Sub-item weights ──');
    let l3Updated = 0;
    let l3Mismatches = 0;

    // Gather all param_numbers that have sub-item weights
    const allParamNums = new Set([
      ...Object.keys(USED_CAR_WEIGHTS.subItems).map(Number),
      ...Object.keys(PDI_WEIGHTS.subItems).map(Number),
    ]);

    for (const paramNum of allParamNums) {
      const param = await InspectionParameter.findOne({
        where: { param_number: paramNum },
        transaction
      });

      if (!param) {
        console.log(`  ⚠ param_number ${paramNum} not found`);
        continue;
      }

      // Parse existing sub_items_json (may be multi-level encoded)
      let subItems = param.sub_items_json;
      while (typeof subItems === 'string') {
        try { subItems = JSON.parse(subItems); } catch (e) { subItems = []; break; }
      }

      if (!Array.isArray(subItems) || subItems.length === 0) {
        console.log(`  ⚠ ${paramNum}: no sub_items_json`);
        continue;
      }

      const usedWeights = USED_CAR_WEIGHTS.subItems[paramNum] || null;
      const pdiWeights = PDI_WEIGHTS.subItems[paramNum] || null;

      // Validate array lengths match
      if (usedWeights && usedWeights.length !== subItems.length) {
        console.log(`  ✗ ${paramNum}: used weights length ${usedWeights.length} ≠ sub-items ${subItems.length}`);
        l3Mismatches++;
        continue;
      }
      if (pdiWeights && pdiWeights.length !== subItems.length) {
        console.log(`  ✗ ${paramNum}: PDI weights length ${pdiWeights.length} ≠ sub-items ${subItems.length}`);
        l3Mismatches++;
        continue;
      }

      // Apply weights to each sub-item
      const updatedSubItems = subItems.map((item, i) => {
        const updated = { ...item };
        if (usedWeights) updated.weight = usedWeights[i];
        if (pdiWeights) updated.weight_pdi = pdiWeights[i];
        return updated;
      });

      // Use raw SQL to avoid Sequelize double-encoding JSON
      await sequelize.query(
        'UPDATE inspection_parameters SET sub_items_json = ? WHERE param_number = ?',
        { replacements: [JSON.stringify(updatedSubItems), paramNum], transaction }
      );
      l3Updated++;
    }

    console.log(`  Updated: ${l3Updated}, Mismatches: ${l3Mismatches}\n`);

    await transaction.commit();

    // ── Verification ─────────────────────────────────────────────────────────
    console.log('── Verification ──');

    // Check module weight sums
    const modules = await InspectionModule.findAll({ attributes: ['slug', 'weight'] });
    const modSum = modules.reduce((s, m) => s + parseFloat(m.weight), 0);
    console.log(`  Module weights sum: ${(modSum * 100).toFixed(1)}% (expected: ~100%)`);

    // Check checkpoint weight sums per module (used_car)
    const composites = await InspectionParameter.findAll({
      where: { is_composite: 1, is_active: 1 },
      include: [{ model: require('../src/models/inspection-sub-group.model'), as: 'SubGroup', include: [{ model: InspectionModule, as: 'Module' }] }]
    });

    const moduleCheckpointSums = {};
    for (const p of composites) {
      const slug = p.SubGroup?.Module?.slug;
      if (!slug) continue;
      if (!moduleCheckpointSums[slug]) moduleCheckpointSums[slug] = 0;
      moduleCheckpointSums[slug] += parseFloat(p.weightage || 0);
    }

    for (const [slug, sum] of Object.entries(moduleCheckpointSums)) {
      const ok = Math.abs(sum - 100) < 1;
      console.log(`  ${slug} checkpoint sum: ${sum.toFixed(1)}% ${ok ? '✓' : '✗'}`);
    }

    // Check a sample sub-item weight sum
    const sample = await InspectionParameter.findOne({ where: { param_number: 5001 } });
    if (sample?.sub_items_json) {
      let items = sample.sub_items_json;
      if (typeof items === 'string') items = JSON.parse(items);
      const subSum = items.reduce((s, i) => s + (i.weight || 0), 0);
      console.log(`  Sample 5001 sub-item weight sum: ${subSum}% (expected: 100%)`);
    }

    console.log('\n✓ All weights applied successfully.');
  } catch (error) {
    await transaction.rollback();
    console.error('\n✗ Error applying weights:', error.message);
    throw error;
  } finally {
    await sequelize.close();
  }
}

applyWeights().catch(() => process.exit(1));
