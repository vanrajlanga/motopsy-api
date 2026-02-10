-- Add service_plan_id column to payment_histories table
-- This is needed to identify the service plan when using default pricing

ALTER TABLE payment_histories
ADD COLUMN service_plan_id INT NULL COMMENT 'Service plan ID for service orders'
AFTER service_plan_option_id;

-- Add foreign key constraint
ALTER TABLE payment_histories
ADD CONSTRAINT fk_payment_history_service_plan
FOREIGN KEY (service_plan_id) REFERENCES service_plans(id);
