'use strict';

/**
 * Fix sub-item weights for 6 parameters where UC/PDI totals != 100%.
 *
 * Issues:
 * - 5001 Engine Oil Health: UC=116%, PDI=100% → scale UC down
 * - 5024 Auto Transmission Response: UC=116%, PDI=100%, has 1 disabled sub-item → scale active UC down
 * - 5021 Drivetrain System: all weights null → equal distribution
 * - 5051 ABS Function: weight null → set to 100
 * - 5078 PDI Delivery Prep: weights null → equal distribution
 * - 5083 PDI Documentation Pack: weights null → equal distribution
 */
module.exports = {
  async up(queryInterface) {
    const fixes = {
      // 5001: UC totals 116, scale by 100/116 = 0.8621
      // PDI already 100, keep as-is
      5001: (items) => {
        const ucTotal = items.reduce((s, i) => s + (i.weight || 0), 0);
        const factor = 100 / ucTotal;
        items.forEach((si, i) => {
          si.weight = i < items.length - 1
            ? Math.round(si.weight * factor * 100) / 100
            : si.weight; // last one adjusted below
        });
        // Fix rounding on last item
        const newTotal = items.slice(0, -1).reduce((s, i) => s + i.weight, 0);
        items[items.length - 1].weight = Math.round((100 - newTotal) * 100) / 100;
        return items;
      },

      // 5024: UC=116 with 4 active + 1 disabled (Parking Pawl, weight=16)
      // Active UC = 100, but total = 116. Scale ALL UC by 100/116
      // PDI already 100, keep as-is
      5024: (items) => {
        const ucTotal = items.reduce((s, i) => s + (i.weight || 0), 0);
        const factor = 100 / ucTotal;
        items.forEach((si, i) => {
          si.weight = i < items.length - 1
            ? Math.round(si.weight * factor * 100) / 100
            : si.weight;
        });
        const newTotal = items.slice(0, -1).reduce((s, i) => s + i.weight, 0);
        items[items.length - 1].weight = Math.round((100 - newTotal) * 100) / 100;
        return items;
      },

      // 5021: 8 sub-items, all null → equal distribution
      5021: (items) => {
        const each = Math.floor((100 / items.length) * 100) / 100;
        items.forEach((si, i) => {
          si.weight = i < items.length - 1 ? each : Math.round((100 - each * (items.length - 1)) * 100) / 100;
          si.weight_pdi = si.weight;
          if (si.enabled === undefined) si.enabled = true;
        });
        return items;
      },

      // 5051: 1 sub-item → 100
      5051: (items) => {
        items[0].weight = 100;
        items[0].weight_pdi = 100;
        if (items[0].enabled === undefined) items[0].enabled = true;
        return items;
      },

      // 5078: 2 sub-items → 50 each
      5078: (items) => {
        items.forEach(si => {
          si.weight = 50;
          si.weight_pdi = 50;
          if (si.enabled === undefined) si.enabled = true;
        });
        return items;
      },

      // 5083: 6 sub-items → equal distribution
      5083: (items) => {
        const each = Math.floor((100 / items.length) * 100) / 100;
        items.forEach((si, i) => {
          si.weight = i < items.length - 1 ? each : Math.round((100 - each * (items.length - 1)) * 100) / 100;
          si.weight_pdi = si.weight;
          if (si.enabled === undefined) si.enabled = true;
        });
        return items;
      },
    };

    for (const [paramNum, fixFn] of Object.entries(fixes)) {
      const [[row]] = await queryInterface.sequelize.query(
        `SELECT sub_items_json FROM inspection_parameters WHERE param_number = ?`,
        { replacements: [paramNum] }
      );
      let items = row.sub_items_json;
      if (typeof items === 'string') items = JSON.parse(items);

      const fixed = fixFn(items);
      const ucCheck = fixed.reduce((s, i) => s + (i.weight || 0), 0);
      const pdiCheck = fixed.reduce((s, i) => s + (i.weight_pdi != null ? i.weight_pdi : (i.weight || 0)), 0);
      console.log(`${paramNum}: UC=${ucCheck.toFixed(1)}%, PDI=${pdiCheck.toFixed(1)}%`);

      await queryInterface.sequelize.query(
        `UPDATE inspection_parameters SET sub_items_json = ? WHERE param_number = ?`,
        { replacements: [JSON.stringify(fixed), paramNum] }
      );
    }

    console.log('All 6 sub-item weight issues fixed.');
  },

  async down() {
    throw new Error('Cannot auto-reverse sub-item weight changes. Restore from backup.');
  },
};
