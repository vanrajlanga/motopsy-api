'use strict';

/**
 * Baseline migration — marks the existing production schema as the starting point.
 * All tables already exist in production. Future migrations build on top of this.
 *
 * This migration intentionally does nothing — it exists so that
 * `db:migrate` on a fresh database knows where migrations begin.
 */
module.exports = {
  async up(queryInterface) {
    // Schema already exists in production via the SQL dump.
    // This is a no-op marker migration.
    console.log('Baseline migration: existing schema acknowledged.');
  },

  async down() {
    // Cannot reverse the baseline — would require dropping all tables.
    throw new Error('Cannot reverse baseline migration. Restore from backup instead.');
  },
};
