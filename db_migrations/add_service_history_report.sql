-- Add Service History Report service plan and brand-based pricing options

-- Insert Service History Report service plan
INSERT INTO service_plans (service_key, service_name, description, service_type, is_active, display_order, created_at)
VALUES
  ('service_history_report', 'Service History Report', 'Detailed service history report for your vehicle', 5, true, 3, NOW());

-- Get the service plan ID (it should be 3 if PDI services are 1 and 2)
SET @service_plan_id = LAST_INSERT_ID();

-- Insert pricing options for each brand
INSERT INTO service_plan_options (service_plan_id, option_key, option_name, amount, currency, is_active, display_order, created_at)
VALUES
  (@service_plan_id, 'maruti_suzuki', 'Maruti Suzuki', 250.00, 'INR', true, 1, NOW()),
  (@service_plan_id, 'honda', 'Honda', 499.00, 'INR', true, 2, NOW()),
  (@service_plan_id, 'hyundai', 'Hyundai', 499.00, 'INR', true, 3, NOW()),
  (@service_plan_id, 'mahindra', 'Mahindra', 350.00, 'INR', true, 4, NOW()),
  (@service_plan_id, 'tata_motors', 'Tata Motors', 350.00, 'INR', true, 5, NOW()),
  (@service_plan_id, 'toyota', 'Toyota', 499.00, 'INR', true, 6, NOW()),
  (@service_plan_id, 'renault', 'Renault', 350.00, 'INR', true, 7, NOW()),
  (@service_plan_id, 'kia', 'Kia', 650.00, 'INR', true, 8, NOW()),
  (@service_plan_id, 'volkswagen', 'Volkswagen', 499.00, 'INR', true, 9, NOW()),
  (@service_plan_id, 'skoda', 'Skoda', 499.00, 'INR', true, 10, NOW()),
  (@service_plan_id, 'jeep', 'Jeep', 599.00, 'INR', true, 11, NOW()),
  (@service_plan_id, 'mg', 'MG (Morris Garages)', 599.00, 'INR', true, 12, NOW()),
  (@service_plan_id, 'audi', 'Audi', 1299.00, 'INR', true, 13, NOW()),
  (@service_plan_id, 'mercedes', 'Mercedes', 1299.00, 'INR', true, 14, NOW()),
  (@service_plan_id, 'bmw', 'BMW', 2999.00, 'INR', true, 15, NOW());
