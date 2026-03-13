/**
 * Fill PDI inspection #2 with realistic new-car responses.
 * Run: node src/seeders/fill-pdi-responses.js
 */
require('../models/index');
const InspectionResponse = require('../models/inspection-response.model');
const InspectionParameter = require('../models/inspection-parameter.model');
const Inspection = require('../models/inspection.model');
const { sequelize } = require('../config/database');

const INSPECTION_ID = 2;

// selectedOption: 1=best, 2=good/minor, 3=fair, 4=poor, 5=critical
// New car: mostly option 1 (perfect), a few option 2 (minor cosmetic findings)
const paramScenarios = {
  // Engine - all perfect (new car)
  5001: { opt: 1 }, 5002: { opt: 1 }, 5003: { opt: 1 }, 5004: { opt: 1 },
  5005: { opt: 1 }, 5006: { opt: 1 }, 5007: { opt: 1 }, 5008: { opt: 1 },
  5009: { opt: 1 }, 5011: { opt: 1 }, 5016: { opt: 1 }, 5017: { opt: 1 },
  5018: { opt: 1 }, 5019: { opt: 1 },

  // Transmission - perfect
  5020: { opt: 1 }, 5022: { opt: 1 }, 5023: { opt: 1 }, 5025: { opt: 1 },

  // Structural - all clean
  5027: { opt: 1 }, 5029: { opt: 1 }, 5030: { opt: 1 }, 5031: { opt: 1 },
  5032: { opt: 1 }, 5033: { opt: 1 }, 5034: { opt: 1 }, 5035: { opt: 1 },
  5037: { opt: 1 },

  // Paint & Panel - minor issues (common in PDI)
  5038: { opt: 2, notes: 'Minor dust marks on bonnet, needs polish' },
  5039: { opt: 1 },
  5041: { opt: 2, notes: 'RHS fog lamp has slight condensation' },
  5042: { opt: 2, notes: 'Minor gap inconsistency at boot lid' },
  5043: { opt: 1 }, 5044: { opt: 1 },
  5045: { opt: 2, notes: 'Small scratch near rear door handle' },
  5046: { opt: 1 }, 5047: { opt: 1 },

  // Suspension & Brakes - perfect
  5050: { opt: 1 }, 5053: { opt: 1 }, 5054: { opt: 1 },
  5055: { opt: 1 }, 5056: { opt: 1 },

  // Electrical - mostly perfect, one minor
  5057: { opt: 1 },
  5058: { opt: 2, notes: 'Rear left window slightly slow' },
  5059: { opt: 1 }, 5060: { opt: 1 }, 5062: { opt: 1 },
  5063: { opt: 1 }, 5064: { opt: 1 }, 5065: { opt: 1 },
  5066: { opt: 1 }, 5067: { opt: 1 }, 5068: { opt: 1 }, 5069: { opt: 1 },

  // Interior - mostly perfect
  5070: { opt: 1 }, 5071: { opt: 1 }, 5072: { opt: 1 },
  5073: { opt: 1 }, 5074: { opt: 1 }, 5076: { opt: 1 },
  5077: { opt: 1 },
  5078: { opt: 2, notes: 'Plastic film not fully removed from B-pillar' },

  // Documentation - perfect
  5079: { opt: 1 }, 5081: { opt: 1 }, 5082: { opt: 1 }, 5083: { opt: 1 },
};

// Severity by option: 1=perfect, 2=minor, 3=moderate, 4=major, 5=critical
const severityMap = { 1: 0, 2: 0.15, 3: 0.35, 4: 0.65, 5: 0.95 };

(async () => {
  try {
    const responses = await InspectionResponse.findAll({
      where: { inspection_id: INSPECTION_ID },
      include: [{ model: InspectionParameter, as: 'Parameter', attributes: ['id', 'param_number', 'name'] }],
      nest: true
    });

    const t = await sequelize.transaction();
    let updated = 0;

    for (const resp of responses) {
      const pn = resp.Parameter.param_number;
      const scenario = paramScenarios[pn];
      if (!scenario) {
        console.log('No scenario for', pn, resp.Parameter.name);
        continue;
      }
      await resp.update({
        selected_option: scenario.opt,
        severity_score: severityMap[scenario.opt],
        notes: scenario.notes || null
      }, { transaction: t });
      updated++;
    }

    await Inspection.update(
      { total_answered_params: updated },
      { where: { id: INSPECTION_ID }, transaction: t }
    );

    await t.commit();
    console.log(`Updated ${updated} of ${responses.length} responses for PDI inspection #${INSPECTION_ID}`);
    process.exit(0);
  } catch (e) {
    console.error(e.message);
    process.exit(1);
  }
})();
