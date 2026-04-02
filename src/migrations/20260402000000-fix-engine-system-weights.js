'use strict';

/**
 * Fix Engine System parameter weights to sum to exactly 100% for active params.
 *
 * Problem: When composites were created, 4 standalone granular params weren't
 * zeroed out, causing the active total to be 106.38% UC / 108.32% PDI.
 *
 * Fix: Proportional scaling — multiply all active weights by (100 / currentTotal)
 * to preserve relative importance while hitting exactly 100%.
 */
module.exports = {
  async up(queryInterface) {
    // Proportionally scaled weights (UC factor: 0.9400, PDI factor: 0.9232)
    const updates = [
      { param_number: 15,   weightage: 0.60, weightage_pdi: 0.65 },
      { param_number: 16,   weightage: 0.60, weightage_pdi: 0.65 },
      { param_number: 17,   weightage: 8.46, weightage_pdi: 9.99 },
      { param_number: 5001, weightage: 4.70, weightage_pdi: 4.62 },
      { param_number: 5002, weightage: 4.70, weightage_pdi: 4.62 },
      { param_number: 5003, weightage: 4.70, weightage_pdi: 4.62 },
      { param_number: 5004, weightage: 4.70, weightage_pdi: 4.62 },
      { param_number: 5005, weightage: 4.70, weightage_pdi: 4.62 },
      { param_number: 5006, weightage: 4.70, weightage_pdi: 4.62 },
      { param_number: 5007, weightage: 4.70, weightage_pdi: 4.62 },
      { param_number: 5008, weightage: 4.70, weightage_pdi: 4.62 },
      { param_number: 5009, weightage: 4.70, weightage_pdi: 4.62 },
      { param_number: 5010, weightage: 4.70, weightage_pdi: 4.62 },
      { param_number: 5011, weightage: 4.70, weightage_pdi: 4.62 },
      { param_number: 5012, weightage: 4.70, weightage_pdi: 4.62 },
      { param_number: 5013, weightage: 4.70, weightage_pdi: 4.62 },
      { param_number: 5014, weightage: 4.70, weightage_pdi: 4.62 },
      { param_number: 5015, weightage: 4.70, weightage_pdi: 4.62 },
      { param_number: 5016, weightage: 4.94, weightage_pdi: 4.86 },
      { param_number: 5017, weightage: 4.94, weightage_pdi: 4.86 },
      { param_number: 5018, weightage: 4.94, weightage_pdi: 4.86 },
      { param_number: 5019, weightage: 5.02, weightage_pdi: 4.83 },
    ];

    for (const u of updates) {
      await queryInterface.sequelize.query(
        `UPDATE inspection_parameters SET weightage = ?, weightage_pdi = ? WHERE param_number = ?`,
        { replacements: [u.weightage, u.weightage_pdi, u.param_number] }
      );
    }

    console.log('Engine System: 22 active params scaled to UC=100.00%, PDI=100.00%');
  },

  async down(queryInterface) {
    // Restore original weights
    const originals = [
      { param_number: 15,   weightage: 0.64, weightage_pdi: 0.70 },
      { param_number: 16,   weightage: 0.64, weightage_pdi: 0.70 },
      { param_number: 17,   weightage: 9.00, weightage_pdi: 10.82 },
      { param_number: 5001, weightage: 5.00, weightage_pdi: 5.00 },
      { param_number: 5002, weightage: 5.00, weightage_pdi: 5.00 },
      { param_number: 5003, weightage: 5.00, weightage_pdi: 5.00 },
      { param_number: 5004, weightage: 5.00, weightage_pdi: 5.00 },
      { param_number: 5005, weightage: 5.00, weightage_pdi: 5.00 },
      { param_number: 5006, weightage: 5.00, weightage_pdi: 5.00 },
      { param_number: 5007, weightage: 5.00, weightage_pdi: 5.00 },
      { param_number: 5008, weightage: 5.00, weightage_pdi: 5.00 },
      { param_number: 5009, weightage: 5.00, weightage_pdi: 5.00 },
      { param_number: 5010, weightage: 5.00, weightage_pdi: 5.00 },
      { param_number: 5011, weightage: 5.00, weightage_pdi: 5.00 },
      { param_number: 5012, weightage: 5.00, weightage_pdi: 5.00 },
      { param_number: 5013, weightage: 5.00, weightage_pdi: 5.00 },
      { param_number: 5014, weightage: 5.00, weightage_pdi: 5.00 },
      { param_number: 5015, weightage: 5.00, weightage_pdi: 5.00 },
      { param_number: 5016, weightage: 5.26, weightage_pdi: 5.26 },
      { param_number: 5017, weightage: 5.26, weightage_pdi: 5.26 },
      { param_number: 5018, weightage: 5.26, weightage_pdi: 5.26 },
      { param_number: 5019, weightage: 5.32, weightage_pdi: 5.32 },
    ];

    for (const u of originals) {
      await queryInterface.sequelize.query(
        `UPDATE inspection_parameters SET weightage = ?, weightage_pdi = ? WHERE param_number = ?`,
        { replacements: [u.weightage, u.weightage_pdi, u.param_number] }
      );
    }

    console.log('Engine System: weights reverted to original values');
  },
};
