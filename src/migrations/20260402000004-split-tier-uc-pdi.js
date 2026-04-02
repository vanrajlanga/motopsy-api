'use strict';

/**
 * Split red_flag_tiers into separate UC and PDI tier columns.
 *
 * Before: tier + is_pdi_only (is_pdi_only=1 means tier applies only to PDI)
 * After:  tier_uc + tier_pdi (independent tier per template)
 *
 * Migration:
 * - is_pdi_only=0 → tier_uc=tier, tier_pdi=tier (applies to both)
 * - is_pdi_only=1 → tier_uc=0, tier_pdi=tier (PDI only)
 */
module.exports = {
  async up(queryInterface, Sequelize) {
    // Add tier_uc and tier_pdi columns
    await queryInterface.addColumn('red_flag_tiers', 'tier_uc', {
      type: Sequelize.INTEGER,
      allowNull: false,
      defaultValue: 0,
      after: 'tier'
    });
    await queryInterface.addColumn('red_flag_tiers', 'tier_pdi', {
      type: Sequelize.INTEGER,
      allowNull: false,
      defaultValue: 0,
      after: 'tier_uc'
    });

    // Migrate: both templates get the tier by default
    await queryInterface.sequelize.query(
      `UPDATE red_flag_tiers SET tier_uc = tier, tier_pdi = tier WHERE is_pdi_only = 0`
    );
    // PDI-only tiers: UC gets 0, PDI keeps tier
    await queryInterface.sequelize.query(
      `UPDATE red_flag_tiers SET tier_uc = 0, tier_pdi = tier WHERE is_pdi_only = 1`
    );

    console.log('Split tier into tier_uc + tier_pdi');
  },

  async down(queryInterface) {
    await queryInterface.removeColumn('red_flag_tiers', 'tier_uc');
    await queryInterface.removeColumn('red_flag_tiers', 'tier_pdi');
    console.log('Removed tier_uc and tier_pdi columns');
  },
};
