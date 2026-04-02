'use strict';

/**
 * Fix PDI weights for Paint & Panel, Interior & Safety, Documentation modules.
 *
 * Problem: Params with template_filter='used_car' are excluded from PDI totals,
 * but the remaining PDI-visible params weren't scaled up to compensate.
 *
 * Fix: Set weightage_pdi on PDI-visible params so they sum to exactly 100%.
 * UC weights (weightage) are untouched — already correct.
 */
module.exports = {
  async up(queryInterface) {
    // Paint & Panel: 9 PDI-visible params → 11.11% each, last 11.12%
    // (5040 Cosmetic Damage has template_filter='used_car', excluded from PDI)
    const paintParams = [5038, 5039, 5041, 5042, 5043, 5044, 5045, 5046, 5047];
    for (let i = 0; i < paintParams.length; i++) {
      const pdiWeight = i < paintParams.length - 1 ? 11.11 : 11.12;
      await queryInterface.sequelize.query(
        `UPDATE inspection_parameters SET weightage_pdi = ? WHERE param_number = ?`,
        { replacements: [pdiWeight, paintParams[i]] }
      );
    }

    // Interior & Safety: 8 PDI-visible params → 12.50% each
    // (5075 Odometer Tampering has template_filter='used_car', excluded from PDI)
    const interiorParams = [5070, 5071, 5072, 5073, 5074, 5076, 5077, 5078];
    for (const pn of interiorParams) {
      await queryInterface.sequelize.query(
        `UPDATE inspection_parameters SET weightage_pdi = ? WHERE param_number = ?`,
        { replacements: [12.50, pn] }
      );
    }

    // Documentation: 4 PDI-visible params → 25.00% each
    // (5080 Legal Documentation has template_filter='used_car', excluded from PDI)
    const docParams = [5079, 5081, 5082, 5083];
    for (const pn of docParams) {
      await queryInterface.sequelize.query(
        `UPDATE inspection_parameters SET weightage_pdi = ? WHERE param_number = ?`,
        { replacements: [25.00, pn] }
      );
    }

    console.log('PDI weights fixed: Paint & Panel (9×11.11+11.12), Interior (8×12.50), Documentation (4×25.00)');
  },

  async down(queryInterface) {
    // Restore Paint & Panel PDI to 10.00
    for (const pn of [5038, 5039, 5041, 5042, 5043, 5044, 5045, 5046, 5047]) {
      await queryInterface.sequelize.query(
        `UPDATE inspection_parameters SET weightage_pdi = 10.00 WHERE param_number = ?`,
        { replacements: [pn] }
      );
    }
    // Restore Interior PDI to 11.11 (last 11.12)
    for (const pn of [5070, 5071, 5072, 5073, 5074, 5076, 5077]) {
      await queryInterface.sequelize.query(
        `UPDATE inspection_parameters SET weightage_pdi = 11.11 WHERE param_number = ?`,
        { replacements: [pn] }
      );
    }
    await queryInterface.sequelize.query(
      `UPDATE inspection_parameters SET weightage_pdi = 11.12 WHERE param_number = 5078`
    );
    // Restore Documentation PDI to 20.00
    for (const pn of [5079, 5081, 5082, 5083]) {
      await queryInterface.sequelize.query(
        `UPDATE inspection_parameters SET weightage_pdi = 20.00 WHERE param_number = ?`,
        { replacements: [pn] }
      );
    }
    console.log('PDI weights reverted to original values');
  },
};
