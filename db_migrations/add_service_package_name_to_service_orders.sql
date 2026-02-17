-- Migration: Add service_package_name to service_orders table
-- Date: 2024-12-17
-- Purpose: Store which service package was selected (Safety Pack or Inspection Only)

ALTER TABLE service_orders
ADD COLUMN service_package_name VARCHAR(100) NULL
COMMENT 'Name of the service package selected (e.g., Safety Pack, Inspection Only)';

-- Update existing records with a default value if needed
-- UPDATE service_orders SET service_package_name = 'Inspection Only' WHERE service_package_name IS NULL;
--  INSERT INTO service_plans (service_name, service_key, service_type,
--   description, default_amount, is_active, created_at, modified_at)
--   VALUES (
--       'Vehicle Intelligence + Service History',
--       'vehicle_intelligence_service_history',
--       5,
--       'Complete vehicle report with intelligence and service history',
--       0,
--       1,
--       NOW(),
--       NOW()
--   );
