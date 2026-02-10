-- Make service_plan_option_id nullable in service_orders table
-- This allows orders to use default pricing when specific brand pricing doesn't exist

ALTER TABLE service_orders
MODIFY COLUMN service_plan_option_id INT NULL COMMENT 'NULL when using default pricing';
