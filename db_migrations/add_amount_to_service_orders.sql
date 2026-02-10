-- Add amount column to service_orders table to store the price at time of order
-- This ensures historical orders maintain their original pricing

ALTER TABLE service_orders
ADD COLUMN amount DECIMAL(10,2) NOT NULL DEFAULT 0.00 COMMENT 'Amount paid at time of order'
AFTER service_plan_option_id;

-- Update existing records with amount from service_plan_options
UPDATE service_orders so
JOIN service_plan_options spo ON so.service_plan_option_id = spo.id
SET so.amount = spo.amount
WHERE so.amount = 0.00;
