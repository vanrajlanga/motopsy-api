'use strict';

/**
 * Add is_active_pdi column for per-template enable/disable.
 *
 * - is_active   → UC (Used Car) active status
 * - is_active_pdi → PDI (New Car PDI) active status
 *
 * Migrates existing template_filter values:
 * - template_filter='used_car'    → is_active_pdi=0 (UC only)
 * - template_filter='new_car_pdi' → is_active=0, is_active_pdi=1 (PDI only)
 * - NULL                          → both stay as current is_active value
 *
 * Also adds enabled_pdi to sub_items_json entries (copies from enabled).
 */
module.exports = {
  async up(queryInterface, Sequelize) {
    // 1. Add is_active_pdi column
    await queryInterface.addColumn('inspection_parameters', 'is_active_pdi', {
      type: Sequelize.TINYINT(1),
      allowNull: false,
      defaultValue: 1,
      after: 'is_active'
    });

    // 2. Copy current is_active to is_active_pdi as default
    await queryInterface.sequelize.query(
      `UPDATE inspection_parameters SET is_active_pdi = is_active`
    );

    // 3. Migrate template_filter='used_car' → PDI off
    await queryInterface.sequelize.query(
      `UPDATE inspection_parameters SET is_active_pdi = 0 WHERE template_filter = 'used_car'`
    );

    // 4. Migrate template_filter='new_car_pdi' → UC off, PDI on
    await queryInterface.sequelize.query(
      `UPDATE inspection_parameters SET is_active = 0, is_active_pdi = 1 WHERE template_filter = 'new_car_pdi'`
    );

    // 5. Add enabled_pdi to sub_items_json
    const [rows] = await queryInterface.sequelize.query(
      `SELECT id, sub_items_json FROM inspection_parameters WHERE sub_items_json IS NOT NULL AND sub_items_json != '[]'`
    );

    for (const row of rows) {
      let items = row.sub_items_json;
      if (typeof items === 'string') {
        try { items = JSON.parse(items); } catch { continue; }
      }
      if (!Array.isArray(items)) continue;

      let changed = false;
      items.forEach(si => {
        if (si.enabled_pdi === undefined) {
          si.enabled_pdi = si.enabled !== undefined ? si.enabled : true;
          changed = true;
        }
      });

      if (changed) {
        await queryInterface.sequelize.query(
          `UPDATE inspection_parameters SET sub_items_json = ? WHERE id = ?`,
          { replacements: [JSON.stringify(items), row.id] }
        );
      }
    }

    console.log('Added is_active_pdi column, migrated template_filter values, added enabled_pdi to sub-items');
  },

  async down(queryInterface) {
    // Restore template_filter from is_active/is_active_pdi
    await queryInterface.sequelize.query(
      `UPDATE inspection_parameters SET is_active = 1 WHERE template_filter = 'new_car_pdi'`
    );

    await queryInterface.removeColumn('inspection_parameters', 'is_active_pdi');

    console.log('Removed is_active_pdi column');
  },
};
