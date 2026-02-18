/**
 * Inspection Parameters Seeder
 * Parses motopsy_parameters.csv and seeds:
 *   - inspection_modules (9 modules)
 *   - inspection_sub_groups (33 sub-groups)
 *   - inspection_parameters (378 parameters)
 *
 * Idempotent: uses findOrCreate on unique keys.
 * Run: node src/seeders/seed-inspection-parameters.js
 */

const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../.env') });

const { sequelize } = require('../config/database');
const InspectionModule = require('../models/inspection-module.model');
const InspectionSubGroup = require('../models/inspection-sub-group.model');
const InspectionParameter = require('../models/inspection-parameter.model');

// Module metadata: slug, icon, base_repair_cost, gamma
const MODULE_META = {
  'ENGINE SYSTEM': { slug: 'engine_system', icon: '🔧', base_repair_cost: 150000, gamma: 1.3 },
  'TRANSMISSION & DRIVETRAIN': { slug: 'transmission_drivetrain', icon: '⚙️', base_repair_cost: 120000, gamma: 1.25 },
  'STRUCTURAL INTEGRITY': { slug: 'structural_integrity', icon: '🏗️', base_repair_cost: 200000, gamma: 1.4 },
  'PAINT & PANEL MAPPING': { slug: 'paint_panel', icon: '🎨', base_repair_cost: 80000, gamma: 1.1 },
  'SUSPENSION & BRAKES': { slug: 'suspension_brakes', icon: '🛞', base_repair_cost: 100000, gamma: 1.2 },
  'ELECTRICAL & ELECTRONICS': { slug: 'electrical_electronics', icon: '⚡', base_repair_cost: 90000, gamma: 1.15 },
  'INTERIOR & SAFETY': { slug: 'interior_safety', icon: '💺', base_repair_cost: 50000, gamma: 1.0 },
  'DOCUMENTATION VALIDATION': { slug: 'documentation', icon: '📋', base_repair_cost: 10000, gamma: 0.8 },
  'ROAD TEST EVALUATION': { slug: 'road_test', icon: '🛣️', base_repair_cost: 70000, gamma: 1.2 },
};

function parseCSV(filePath) {
  const content = fs.readFileSync(filePath, 'utf-8');
  const lines = content.split('\n');

  const modules = [];
  let currentModule = null;
  let currentSubGroup = null;
  let moduleOrder = 0;
  let subGroupOrder = 0;
  let paramOrder = 0;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();

    // Skip empty lines, title lines, column headers
    if (!trimmed || trimmed.startsWith('MOTOPSY INSPECTION') || trimmed.startsWith('Organized by')) continue;
    if (trimmed.startsWith('#,Parameter Name')) continue;

    // Module header: "ENGINE SYSTEM  (Weight: 22% | 78 parameters)"
    const moduleMatch = trimmed.match(/^([A-Z][A-Z &]+?)\s+\(Weight:\s*(\d+)%/);
    if (moduleMatch) {
      moduleOrder++;
      subGroupOrder = 0;
      const moduleName = moduleMatch[1].trim();
      const weight = parseInt(moduleMatch[2]) / 100;
      const meta = MODULE_META[moduleName];

      currentModule = {
        name: moduleName.split(' ').map(w => w.charAt(0) + w.slice(1).toLowerCase()).join(' ')
          .replace(' & ', ' & ').replace(' And ', ' & '),
        rawName: moduleName,
        slug: meta ? meta.slug : moduleName.toLowerCase().replace(/[^a-z]+/g, '_'),
        icon: meta ? meta.icon : '📦',
        weight: weight,
        base_repair_cost: meta ? meta.base_repair_cost : 50000,
        gamma: meta ? meta.gamma : 1.0,
        sort_order: moduleOrder,
        subGroups: []
      };

      // Fix name casing
      currentModule.name = fixModuleName(moduleName);

      modules.push(currentModule);
      continue;
    }

    // Sub-group header: "    CNG System (8 checks)"
    const subGroupMatch = line.match(/^\s{2,}(\S.+?)\s*\((\d+)\s*checks?\)/);
    if (subGroupMatch) {
      subGroupOrder++;
      paramOrder = 0;
      currentSubGroup = {
        name: subGroupMatch[1].trim(),
        check_count: parseInt(subGroupMatch[2]),
        sort_order: subGroupOrder,
        parameters: []
      };
      if (currentModule) {
        currentModule.subGroups.push(currentSubGroup);
      }
      continue;
    }

    // Parameter data row: starts with a number
    const cells = parseCSVLine(line);
    if (cells.length >= 5 && /^\d+$/.test(cells[0].trim())) {
      paramOrder++;
      const paramNum = parseInt(cells[0].trim());
      const paramName = cells[1] ? cells[1].trim() : '';
      const paramDetail = cells[2] ? cells[2].trim() : '';
      const inputType = cells[3] ? cells[3].trim() : '';

      // Options are in columns 4-8 (indices 4,5,6,7,8)
      const options = [];
      for (let j = 4; j <= 8; j++) {
        const val = cells[j] ? cells[j].trim() : '';
        if (val) options.push(val);
      }

      // Scores are in columns 9-13 (indices 9,10,11,12,13)
      const scores = [];
      for (let j = 9; j <= 13; j++) {
        const val = cells[j] ? cells[j].trim() : '';
        if (val !== '') scores.push(parseFloat(val));
        else scores.push(null);
      }

      // Fuel filter: column 14 (index 14)
      const fuelFilter = cells[14] ? cells[14].trim() : 'All';
      // Transmission filter: column 15 (index 15)
      const transmissionFilter = cells[15] ? cells[15].trim() : 'All';
      // Red flag: column 16 (index 16)
      const redFlagStr = cells[16] ? cells[16].trim().toLowerCase() : 'no';
      const isRedFlag = redFlagStr === 'yes' || redFlagStr === '1' || redFlagStr === 'true';

      const param = {
        param_number: paramNum,
        name: paramName,
        detail: paramDetail,
        input_type: inputType,
        option_1: options[0] || null,
        option_2: options[1] || null,
        option_3: options[2] || null,
        option_4: options[3] || null,
        option_5: options[4] || null,
        score_1: scores[0] != null ? scores[0] : null,
        score_2: scores[1] != null ? scores[1] : null,
        score_3: scores[2] != null ? scores[2] : null,
        score_4: scores[3] != null ? scores[3] : null,
        score_5: scores[4] != null ? scores[4] : null,
        fuel_filter: fuelFilter || 'All',
        transmission_filter: transmissionFilter || 'All',
        is_red_flag: isRedFlag ? 1 : 0,
        sort_order: paramOrder
      };

      if (currentSubGroup) {
        currentSubGroup.parameters.push(param);
      }
    }
  }

  return modules;
}

/**
 * Parse a CSV line handling quoted fields with commas
 */
function parseCSVLine(line) {
  const cells = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      if (inQuotes && i + 1 < line.length && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      cells.push(current);
      current = '';
    } else {
      current += char;
    }
  }
  cells.push(current);
  return cells;
}

function fixModuleName(raw) {
  const mapping = {
    'ENGINE SYSTEM': 'Engine System',
    'TRANSMISSION & DRIVETRAIN': 'Transmission & Drivetrain',
    'STRUCTURAL INTEGRITY': 'Structural Integrity',
    'PAINT & PANEL MAPPING': 'Paint & Panel Mapping',
    'SUSPENSION & BRAKES': 'Suspension & Brakes',
    'ELECTRICAL & ELECTRONICS': 'Electrical & Electronics',
    'INTERIOR & SAFETY': 'Interior & Safety',
    'DOCUMENTATION VALIDATION': 'Documentation Validation',
    'ROAD TEST EVALUATION': 'Road Test Evaluation',
  };
  return mapping[raw] || raw;
}

async function seed() {
  try {
    await sequelize.authenticate();
    console.log('✅ Database connected');

    // Sync tables (create if not exist)
    await InspectionModule.sync();
    await InspectionSubGroup.sync();
    await InspectionParameter.sync();

    const csvPath = path.join(__dirname, '../data/motopsy_parameters.csv');
    const modules = parseCSV(csvPath);

    let totalParams = 0;

    const transaction = await sequelize.transaction();

    try {
      for (const mod of modules) {
        const [dbModule] = await InspectionModule.findOrCreate({
          where: { slug: mod.slug },
          defaults: {
            name: mod.name,
            icon: mod.icon,
            weight: mod.weight,
            base_repair_cost: mod.base_repair_cost,
            gamma: mod.gamma,
            sort_order: mod.sort_order,
            created_at: new Date()
          },
          transaction
        });

        // Update if already exists (in case data changed)
        await dbModule.update({
          name: mod.name,
          icon: mod.icon,
          weight: mod.weight,
          base_repair_cost: mod.base_repair_cost,
          gamma: mod.gamma,
          sort_order: mod.sort_order,
          modified_at: new Date()
        }, { transaction });

        console.log(`  📦 Module: ${mod.name} (${mod.subGroups.length} sub-groups)`);

        for (const sg of mod.subGroups) {
          const [dbSubGroup] = await InspectionSubGroup.findOrCreate({
            where: {
              module_id: dbModule.id,
              name: sg.name
            },
            defaults: {
              check_count: sg.check_count,
              sort_order: sg.sort_order,
              created_at: new Date()
            },
            transaction
          });

          await dbSubGroup.update({
            check_count: sg.check_count,
            sort_order: sg.sort_order,
            modified_at: new Date()
          }, { transaction });

          console.log(`    📂 Sub-group: ${sg.name} (${sg.parameters.length} params)`);

          for (const param of sg.parameters) {
            await InspectionParameter.findOrCreate({
              where: { param_number: param.param_number },
              defaults: {
                sub_group_id: dbSubGroup.id,
                name: param.name,
                detail: param.detail,
                input_type: param.input_type,
                option_1: param.option_1,
                option_2: param.option_2,
                option_3: param.option_3,
                option_4: param.option_4,
                option_5: param.option_5,
                score_1: param.score_1,
                score_2: param.score_2,
                score_3: param.score_3,
                score_4: param.score_4,
                score_5: param.score_5,
                fuel_filter: param.fuel_filter,
                transmission_filter: param.transmission_filter,
                is_red_flag: param.is_red_flag,
                sort_order: param.sort_order,
                created_at: new Date()
              },
              transaction
            });

            // Update existing parameter data
            await InspectionParameter.update({
              sub_group_id: dbSubGroup.id,
              name: param.name,
              detail: param.detail,
              input_type: param.input_type,
              option_1: param.option_1,
              option_2: param.option_2,
              option_3: param.option_3,
              option_4: param.option_4,
              option_5: param.option_5,
              score_1: param.score_1,
              score_2: param.score_2,
              score_3: param.score_3,
              score_4: param.score_4,
              score_5: param.score_5,
              fuel_filter: param.fuel_filter,
              transmission_filter: param.transmission_filter,
              is_red_flag: param.is_red_flag,
              sort_order: param.sort_order,
              modified_at: new Date()
            }, {
              where: { param_number: param.param_number },
              transaction
            });

            totalParams++;
          }
        }
      }

      await transaction.commit();
      console.log(`\n✅ Seeder complete: ${modules.length} modules, ${totalParams} parameters`);

      // Verification
      const moduleCount = await InspectionModule.count();
      const subGroupCount = await InspectionSubGroup.count();
      const paramCount = await InspectionParameter.count();
      console.log(`📊 Verification: ${moduleCount} modules, ${subGroupCount} sub-groups, ${paramCount} parameters`);

    } catch (error) {
      await transaction.rollback();
      throw error;
    }

  } catch (error) {
    console.error('❌ Seeder failed:', error);
    process.exit(1);
  } finally {
    await sequelize.close();
    process.exit(0);
  }
}

seed();
