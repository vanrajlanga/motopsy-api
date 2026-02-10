-- Add service-related columns to payment_histories table
ALTER TABLE payment_histories
ADD COLUMN service_plan_option_id INT NULL COMMENT 'Service plan option ID for service orders',
ADD COLUMN service_data TEXT NULL COMMENT 'Temporary storage of service form data as JSON';

-- Add foreign key for service_plan_option_id
ALTER TABLE payment_histories
ADD CONSTRAINT fk_payment_histories_service_plan_option
FOREIGN KEY (service_plan_option_id) REFERENCES service_plan_options(id);

-- Add index for service_plan_option_id
CREATE INDEX idx_service_plan_option_id ON payment_histories(service_plan_option_id);

-- Update payment_for comment to include new service types
ALTER TABLE payment_histories
MODIFY COLUMN payment_for INT NOT NULL COMMENT '0=VehicleHistoryReport, 1=PhysicalVerification, 3=UsedVehiclePDI, 4=NewVehiclePDI';
