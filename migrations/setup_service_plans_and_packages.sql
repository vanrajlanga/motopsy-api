-- =====================================================
-- Migration: Complete Service Plans & Package Setup
-- Description: Sets up all service plans, dynamic pricing,
--              and package tracking for Motopsy platform
-- Created: 2026-02-17
-- Version: 1.0.0
-- =====================================================
-- Changes included:
-- 1. Add service_package_name column to service_orders
-- 2. Create Vehicle Intelligence + Service History combo plan
-- 3. Create Safety Pack service plan (dynamic pricing)
-- 4. Create Inspection Only service plan (dynamic pricing)
-- =====================================================

USE motopsy_db;

-- =====================================================
-- STEP 1: Add service_package_name to service_orders
-- =====================================================

SELECT '✅ Step 1: Adding service_package_name column...' AS 'Status';

ALTER TABLE service_orders
ADD COLUMN IF NOT EXISTS service_package_name VARCHAR(100) NULL
COMMENT 'Name of the service package selected (e.g., Safety Pack, Inspection Only)'
AFTER order_notes;

SELECT '   ✓ Column added successfully' AS '';

-- =====================================================
-- STEP 2: Create Vehicle Intelligence + Service History
-- =====================================================

SELECT '' AS '';
SELECT '✅ Step 2: Creating Vehicle Intelligence + Service History combo...' AS 'Status';

-- Check if plan already exists
SET @existing_combo_plan = (
    SELECT id FROM service_plans
    WHERE service_key = 'vehicle_intelligence_service_history'
    LIMIT 1
);

-- Create only if doesn't exist
INSERT INTO service_plans (
    service_name,
    service_key,
    service_type,
    description,
    default_amount,
    is_active,
    display_order,
    created_at,
    modified_at
)
SELECT * FROM (
    SELECT
        'Vehicle Intelligence + Service History' AS service_name,
        'vehicle_intelligence_service_history' AS service_key,
        5 AS service_type,
        'Complete vehicle report with intelligence and service history' AS description,
        0 AS default_amount,
        1 AS is_active,
        4 AS display_order,
        NOW() AS created_at,
        NOW() AS modified_at
) AS tmp
WHERE @existing_combo_plan IS NULL;

SELECT CASE
    WHEN @existing_combo_plan IS NULL
    THEN CONCAT('   ✓ Plan created with ID: ', LAST_INSERT_ID())
    ELSE CONCAT('   ⚠ Plan already exists with ID: ', @existing_combo_plan)
END AS '';

-- =====================================================
-- STEP 3: Create Safety Pack Service Plan
-- =====================================================

SELECT '' AS '';
SELECT '✅ Step 3: Creating Safety Pack service plan...' AS 'Status';

-- Check if plan already exists
SET @existing_safety_pack = (
    SELECT id FROM service_plans
    WHERE service_key = 'safety_pack'
    LIMIT 1
);

-- Delete existing options if plan exists (for clean setup)
DELETE FROM service_plan_options
WHERE service_plan_id = @existing_safety_pack;

-- Delete existing plan if exists
DELETE FROM service_plans
WHERE service_key = 'safety_pack';

-- Create Safety Pack service plan
INSERT INTO service_plans (
    service_name,
    service_key,
    service_type,
    description,
    default_amount,
    is_active,
    display_order,
    created_at,
    modified_at
)
VALUES (
    'Safety Pack',
    'safety_pack',
    6,  -- Combo service type
    'Complete protection: Vehicle Intelligence + Service History + PDI Inspection. Price calculated dynamically based on vehicle brand and category.',
    0,  -- Dynamic pricing - amount calculated by frontend
    1,
    5,
    NOW(),
    NOW()
);

SET @safety_pack_id = LAST_INSERT_ID();
SELECT CONCAT('   ✓ Safety Pack created with ID: ', @safety_pack_id) AS '';
SELECT '   ✓ Dynamic pricing enabled (default_amount = 0)' AS '';

-- =====================================================
-- STEP 4: Create Inspection Only Service Plan
-- =====================================================

SELECT '' AS '';
SELECT '✅ Step 4: Creating Inspection Only service plan...' AS 'Status';

-- Check if plan already exists
SET @existing_inspection_only = (
    SELECT id FROM service_plans
    WHERE service_key = 'inspection_only'
    LIMIT 1
);

-- Delete existing options if plan exists (for clean setup)
DELETE FROM service_plan_options
WHERE service_plan_id = @existing_inspection_only;

-- Delete existing plan if exists
DELETE FROM service_plans
WHERE service_key = 'inspection_only';

-- Create Inspection Only service plan
INSERT INTO service_plans (
    service_name,
    service_key,
    service_type,
    description,
    default_amount,
    is_active,
    display_order,
    created_at,
    modified_at
)
VALUES (
    'Inspection Only',
    'inspection_only',
    3,  -- PDI service type
    'Professional vehicle inspection. Price based on vehicle category (EV/Luxury/Premium/Standard).',
    0,  -- Dynamic pricing - amount calculated by frontend
    1,
    6,
    NOW(),
    NOW()
);

SET @inspection_only_id = LAST_INSERT_ID();
SELECT CONCAT('   ✓ Inspection Only created with ID: ', @inspection_only_id) AS '';
SELECT '   ✓ Dynamic pricing enabled (default_amount = 0)' AS '';

-- =====================================================
-- VERIFICATION: All Service Plans
-- =====================================================

SELECT '' AS '';
SELECT '========================================' AS '';
SELECT 'VERIFICATION: Service Plans Created' AS '';
SELECT '========================================' AS '';

SELECT
    id AS 'ID',
    service_name AS 'Service Name',
    service_key AS 'Service Key',
    service_type AS 'Type',
    CASE
        WHEN default_amount = 0 THEN 'Dynamic Pricing ✅'
        ELSE CONCAT('Fixed: ₹', default_amount)
    END AS 'Pricing',
    CASE
        WHEN is_active = 1 THEN 'Active ✅'
        ELSE 'Inactive ❌'
    END AS 'Status'
FROM service_plans
WHERE service_key IN (
    'new_vehicle_pdi',
    'used_vehicle_pdi',
    'service_history_report',
    'vehicle_intelligence_service_history',
    'safety_pack',
    'inspection_only'
)
ORDER BY display_order;

-- =====================================================
-- VERIFICATION: Service Orders Schema
-- =====================================================

SELECT '' AS '';
SELECT '========================================' AS '';
SELECT 'VERIFICATION: service_orders Columns' AS '';
SELECT '========================================' AS '';

SELECT
    COLUMN_NAME AS 'Column',
    DATA_TYPE AS 'Type',
    IS_NULLABLE AS 'Nullable',
    COLUMN_COMMENT AS 'Comment'
FROM INFORMATION_SCHEMA.COLUMNS
WHERE TABLE_SCHEMA = 'motopsy_db'
  AND TABLE_NAME = 'service_orders'
  AND COLUMN_NAME IN ('service_package_name', 'appointment_date', 'appointment_time_slot')
ORDER BY ORDINAL_POSITION;

-- =====================================================
-- PRICING CALCULATION REFERENCE
-- =====================================================

SELECT '' AS '';
SELECT '========================================' AS '';
SELECT 'PRICING FORMULAS (DYNAMIC)' AS '';
SELECT '========================================' AS '';

SELECT
    'Safety Pack' AS 'Package',
    'Vehicle Intelligence (DB) + Service History (DB) + Inspection (DB)' AS 'Formula',
    'All prices fetched dynamically from database' AS 'Note';

SELECT
    'Inspection Only' AS 'Package',
    'Inspection price (category-based from used_vehicle_pdi options)' AS 'Formula',
    'Price varies by vehicle category' AS 'Note';

SELECT
    'Vehicle Intelligence + Service History' AS 'Package',
    'Vehicle Intelligence (DB) + Service History (brand-based from DB)' AS 'Formula',
    'Dynamic pricing based on selected brand' AS 'Note';

-- =====================================================
-- COMPLETION STATUS
-- =====================================================

SELECT '' AS '';
SELECT '========================================' AS '';
SELECT '✅ MIGRATION COMPLETED SUCCESSFULLY' AS '';
SELECT '========================================' AS '';

SELECT
    'Changes Applied:' AS 'Summary',
    '' AS '';

SELECT '1. service_package_name column added to service_orders ✅' AS ''
UNION ALL
SELECT '2. Vehicle Intelligence + Service History plan created ✅'
UNION ALL
SELECT '3. Safety Pack service plan created ✅'
UNION ALL
SELECT '4. Inspection Only service plan created ✅'
UNION ALL
SELECT '5. All plans configured with dynamic pricing ✅';

SELECT '' AS '';
SELECT 'Next Steps:' AS '';
SELECT '1. Restart Node.js backend server' AS ''
UNION ALL
SELECT '2. Clear frontend cache / rebuild Angular app' AS ''
UNION ALL
SELECT '3. Test all service booking flows' AS ''
UNION ALL
SELECT '4. Verify orders in admin panel' AS '';

-- =====================================================
-- ROLLBACK INSTRUCTIONS
-- =====================================================
-- If you need to rollback this migration, run:
--
-- DELETE FROM service_plan_options
-- WHERE service_plan_id IN (
--     SELECT id FROM service_plans
--     WHERE service_key IN ('safety_pack', 'inspection_only')
-- );
--
-- DELETE FROM service_plans
-- WHERE service_key IN (
--     'vehicle_intelligence_service_history',
--     'safety_pack',
--     'inspection_only'
-- );
--
-- ALTER TABLE service_orders
-- DROP COLUMN service_package_name;
-- =====================================================
