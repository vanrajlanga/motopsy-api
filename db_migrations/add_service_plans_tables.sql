-- Service Plans table
CREATE TABLE service_plans (
  id INT PRIMARY KEY AUTO_INCREMENT,
  service_key VARCHAR(100) NOT NULL UNIQUE COMMENT 'e.g., used_vehicle_pdi, new_vehicle_pdi',
  service_name VARCHAR(255) NOT NULL,
  description TEXT,
  service_type INT NOT NULL COMMENT 'Maps to payment_history.payment_for: 3=UsedVehiclePDI, 4=NewVehiclePDI',
  is_active BOOLEAN NOT NULL DEFAULT true,
  display_order INT DEFAULT 0,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  modified_at DATETIME,
  modified_by INT,
  FOREIGN KEY (modified_by) REFERENCES users(id),
  INDEX idx_service_key (service_key),
  INDEX idx_is_active (is_active)
);

-- Service Plan Options table (pricing tiers)
CREATE TABLE service_plan_options (
  id INT PRIMARY KEY AUTO_INCREMENT,
  service_plan_id INT NOT NULL,
  option_key VARCHAR(100) NOT NULL COMMENT 'e.g., all_ev, luxury, premium, standard',
  option_name VARCHAR(255) NOT NULL COMMENT 'Display: All EV, Luxury – Audi BMW 4×4',
  amount DECIMAL(10,2) NOT NULL,
  currency VARCHAR(10) NOT NULL DEFAULT 'INR',
  description TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  display_order INT DEFAULT 0,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  modified_at DATETIME,
  modified_by INT,
  FOREIGN KEY (service_plan_id) REFERENCES service_plans(id) ON DELETE CASCADE,
  FOREIGN KEY (modified_by) REFERENCES users(id),
  UNIQUE KEY unique_option (service_plan_id, option_key),
  INDEX idx_service_plan_id (service_plan_id),
  INDEX idx_is_active (is_active)
);

-- Service Orders table (form data + order tracking)
CREATE TABLE service_orders (
  id INT PRIMARY KEY AUTO_INCREMENT,
  user_id INT NOT NULL,
  payment_history_id INT NOT NULL,
  service_plan_id INT NOT NULL,
  service_plan_option_id INT NOT NULL,
  amount DECIMAL(10,2) NOT NULL DEFAULT 0.00 COMMENT 'Amount paid at time of order',

  -- Customer details
  name VARCHAR(255) NOT NULL,
  mobile_number VARCHAR(20) NOT NULL,
  email VARCHAR(255) NOT NULL,

  -- Vehicle details
  car_company VARCHAR(100),
  car_model VARCHAR(100),
  chassis_number VARCHAR(100),
  registration_number VARCHAR(20),
  car_model_year INT,

  -- Address details
  state VARCHAR(100) NOT NULL,
  city VARCHAR(100),
  address TEXT NOT NULL,
  postcode VARCHAR(20) NOT NULL,

  -- Additional
  order_notes TEXT,

  -- Status tracking
  status INT NOT NULL DEFAULT 0 COMMENT '0=Pending, 1=InProgress, 2=Completed, 3=Cancelled',
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  modified_at DATETIME,

  FOREIGN KEY (user_id) REFERENCES users(id),
  FOREIGN KEY (payment_history_id) REFERENCES payment_histories(id),
  FOREIGN KEY (service_plan_id) REFERENCES service_plans(id),
  FOREIGN KEY (service_plan_option_id) REFERENCES service_plan_options(id),
  INDEX idx_user_id (user_id),
  INDEX idx_payment_history_id (payment_history_id),
  INDEX idx_status (status)
);

-- Seed initial data
INSERT INTO service_plans (service_key, service_name, description, service_type, is_active, display_order)
VALUES
  ('used_vehicle_pdi', 'Used Vehicle PDI Report', 'Pre-Delivery Inspection for used vehicles with comprehensive scanning', 3, true, 1),
  ('new_vehicle_pdi', 'New Vehicle PDI Report', 'Pre-Delivery Inspection for new vehicles with detailed verification', 4, true, 2),
  ('service_history_report', 'Service History Report', 'Detailed service history report for your vehicle', 5, true, 3);

-- Seed pricing options for Used Vehicle PDI
INSERT INTO service_plan_options (service_plan_id, option_key, option_name, amount, currency, is_active, display_order)
VALUES
  (1, 'all_ev', 'All EV', 2199.00, 'INR', true, 1),
  (1, 'luxury', 'Luxury – Audi, BMW, 4×4', 2399.00, 'INR', true, 2),
  (1, 'premium', 'Premium – Above 1100cc', 2199.00, 'INR', true, 3),
  (1, 'standard', 'Up to 1100cc', 1999.00, 'INR', true, 4);

-- Seed pricing options for New Vehicle PDI (same pricing)
INSERT INTO service_plan_options (service_plan_id, option_key, option_name, amount, currency, is_active, display_order)
VALUES
  (2, 'all_ev', 'All EV', 2199.00, 'INR', true, 1),
  (2, 'luxury', 'Luxury – Audi, BMW, 4×4', 2399.00, 'INR', true, 2),
  (2, 'premium', 'Premium – Above 1100cc', 2199.00, 'INR', true, 3),
  (2, 'standard', 'Up to 1100cc', 1999.00, 'INR', true, 4);

-- Seed pricing options for Service History Report (brand-based pricing)
INSERT INTO service_plan_options (service_plan_id, option_key, option_name, amount, currency, is_active, display_order)
VALUES
  (3, 'maruti_suzuki', 'Maruti Suzuki', 250.00, 'INR', true, 1),
  (3, 'honda', 'Honda', 499.00, 'INR', true, 2),
  (3, 'hyundai', 'Hyundai', 499.00, 'INR', true, 3),
  (3, 'mahindra', 'Mahindra', 350.00, 'INR', true, 4),
  (3, 'tata_motors', 'Tata Motors', 350.00, 'INR', true, 5),
  (3, 'toyota', 'Toyota', 499.00, 'INR', true, 6),
  (3, 'renault', 'Renault', 350.00, 'INR', true, 7),
  (3, 'kia', 'Kia', 650.00, 'INR', true, 8),
  (3, 'volkswagen', 'Volkswagen', 499.00, 'INR', true, 9),
  (3, 'skoda', 'Skoda', 499.00, 'INR', true, 10),
  (3, 'jeep', 'Jeep', 599.00, 'INR', true, 11),
  (3, 'mg', 'MG (Morris Garages)', 599.00, 'INR', true, 12),
  (3, 'audi', 'Audi', 1299.00, 'INR', true, 13),
  (3, 'mercedes', 'Mercedes', 1299.00, 'INR', true, 14),
  (3, 'bmw', 'BMW', 2999.00, 'INR', true, 15);
