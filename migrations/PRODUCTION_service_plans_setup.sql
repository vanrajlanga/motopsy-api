-- =====================================================
-- PRODUCTION MIGRATION: Service Plans Setup
-- Run this on LIVE/PRODUCTION database
-- Date: 2026-02-17
-- =====================================================

USE motopsy_db;

-- 1. Add service_package_name column
ALTER TABLE service_orders
ADD COLUMN IF NOT EXISTS service_package_name VARCHAR(100) NULL
COMMENT 'Name of the service package selected (e.g., Safety Pack, Inspection Only)'
AFTER order_notes;

-- 2. Create Vehicle Intelligence + Service History combo
INSERT INTO service_plans (
    service_name, service_key, service_type, description,
    default_amount, is_active, display_order, created_at, modified_at
)
SELECT
    'Vehicle Intelligence + Service History',
    'vehicle_intelligence_service_history',
    5,
    'Complete vehicle report with intelligence and service history',
    0, 1, 4, NOW(), NOW()
FROM DUAL
WHERE NOT EXISTS (
    SELECT 1 FROM service_plans
    WHERE service_key = 'vehicle_intelligence_service_history'
);

-- 3. Clean up existing Safety Pack/Inspection Only (if any)
DELETE FROM service_plan_options
WHERE service_plan_id IN (
    SELECT id FROM service_plans
    WHERE service_key IN ('safety_pack', 'inspection_only')
);

DELETE FROM service_plans
WHERE service_key IN ('safety_pack', 'inspection_only');

-- 4. Create Safety Pack service plan
INSERT INTO service_plans (
    service_name, service_key, service_type, description,
    default_amount, is_active, display_order, created_at, modified_at
)
VALUES (
    'Safety Pack',
    'safety_pack',
    6,
    'Complete protection: Vehicle Intelligence + Service History + PDI Inspection',
    0, 1, 5, NOW(), NOW()
);

-- 5. Create Inspection Only service plan
INSERT INTO service_plans (
    service_name, service_key, service_type, description,
    default_amount, is_active, display_order, created_at, modified_at
)
VALUES (
    'Inspection Only',
    'inspection_only',
    3,
    'Professional vehicle inspection based on category',
    0, 1, 6, NOW(), NOW()
);

-- =====================================================
-- VERIFICATION QUERY (Optional - run after migration)
-- =====================================================
-- SELECT id, service_name, service_key, default_amount, is_active
-- FROM service_plans
-- WHERE service_key IN (
--     'vehicle_intelligence_service_history',
--     'safety_pack',
--     'inspection_only'
-- );
-- =====================================================
