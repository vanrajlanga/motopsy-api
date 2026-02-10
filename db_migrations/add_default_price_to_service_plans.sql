-- Add default_amount column to service_plans table
-- This will be used when a brand doesn't have a specific price

ALTER TABLE service_plans
ADD COLUMN default_amount DECIMAL(10,2) DEFAULT 0.00 COMMENT 'Default price for brands without specific pricing'
AFTER service_type;

-- Set default price for Service History Report (₹499)
UPDATE service_plans
SET default_amount = 499.00
WHERE service_key = 'service_history_report';
