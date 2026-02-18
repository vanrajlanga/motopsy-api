-- =====================================================
-- Motopsy Database Changes Log
-- Run these queries on production database
-- =====================================================

-- =====================================================
-- Date: 2025-12-15
-- Feature: Dynamic Coupon Codes System
-- =====================================================

-- 1. Create coupons table
CREATE TABLE IF NOT EXISTS coupons (
    id INT PRIMARY KEY AUTO_INCREMENT,
    coupon_name VARCHAR(255) NOT NULL,
    coupon_code VARCHAR(100) NOT NULL UNIQUE,
    discount_type ENUM('percentage', 'fixed') NOT NULL DEFAULT 'percentage',
    discount_value DECIMAL(10, 2) NOT NULL,
    description TEXT,
    expiry_date DATETIME NULL,
    max_uses INT NULL DEFAULT NULL COMMENT 'NULL means unlimited',
    current_uses INT NOT NULL DEFAULT 0,
    min_order_amount DECIMAL(10, 2) NULL DEFAULT NULL,
    max_discount_amount DECIMAL(10, 2) NULL DEFAULT NULL COMMENT 'Cap for percentage discounts',
    is_active TINYINT(1) NOT NULL DEFAULT 1,
    created_by INT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    modified_at DATETIME NULL,
    FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL,
    INDEX idx_coupon_code (coupon_code),
    INDEX idx_is_active (is_active),
    INDEX idx_expiry_date (expiry_date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 2. Create coupon_usage_history table (tracks which payment used which coupon)
CREATE TABLE IF NOT EXISTS coupon_usage_history (
    id INT PRIMARY KEY AUTO_INCREMENT,
    coupon_id INT NOT NULL,
    user_id INT NOT NULL,
    payment_history_id INT NULL,
    original_amount DECIMAL(10, 2) NOT NULL,
    discount_amount DECIMAL(10, 2) NOT NULL,
    final_amount DECIMAL(10, 2) NOT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (coupon_id) REFERENCES coupons(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (payment_history_id) REFERENCES payment_histories(id) ON DELETE SET NULL,
    INDEX idx_coupon_id (coupon_id),
    INDEX idx_user_id (user_id),
    INDEX idx_payment_history_id (payment_history_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 3. Create coupon_audit_log table (tracks changes to coupons)
CREATE TABLE IF NOT EXISTS coupon_audit_log (
    id INT PRIMARY KEY AUTO_INCREMENT,
    coupon_id INT NOT NULL,
    action ENUM('created', 'updated', 'deleted', 'activated', 'deactivated') NOT NULL,
    changed_by INT NULL,
    old_values JSON NULL,
    new_values JSON NULL,
    ip_address VARCHAR(45) NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (coupon_id) REFERENCES coupons(id) ON DELETE CASCADE,
    FOREIGN KEY (changed_by) REFERENCES users(id) ON DELETE SET NULL,
    INDEX idx_coupon_id (coupon_id),
    INDEX idx_action (action),
    INDEX idx_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 4. Add coupon tracking columns to payment_histories table
ALTER TABLE payment_histories
ADD COLUMN coupon_id INT NULL AFTER modified_at,
ADD COLUMN original_amount DECIMAL(18, 2) NULL AFTER coupon_id,
ADD COLUMN discount_amount DECIMAL(18, 2) NULL AFTER original_amount,
ADD FOREIGN KEY (coupon_id) REFERENCES coupons(id) ON DELETE SET NULL;

-- 5. Insert default coupon (migrate existing hardcoded coupon)
INSERT INTO coupons (coupon_name, coupon_code, discount_type, discount_value, description, is_active, created_at)
VALUES ('Motopsy 99% Off', 'motopsy99', 'percentage', 99.00, '99% discount on vehicle history report', 1, NOW());

-- =====================================================
-- End of changes for: Dynamic Coupon Codes System
-- =====================================================

-- =====================================================
-- Date: 2026-01-19
-- Feature: Flag Discrepancy - User-flagged vehicle specification mismatches
-- =====================================================

-- 1. Create vehicle_spec_discrepancies table
CREATE TABLE IF NOT EXISTS vehicle_spec_discrepancies (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL,
    registration_number VARCHAR(50) NULL,
    old_vehicle_detail_id INT NOT NULL COMMENT 'Original report that was flagged',
    old_matched_spec_id INT NULL,
    old_make VARCHAR(255) NULL,
    old_model VARCHAR(255) NULL,
    old_version VARCHAR(255) NULL,
    new_vehicle_detail_id INT NULL COMMENT 'Corrected report (NULL if car_not_found)',
    new_matched_spec_id INT NULL,
    new_make VARCHAR(255) NULL,
    new_model VARCHAR(255) NULL,
    new_version VARCHAR(255) NULL,
    car_not_found TINYINT(1) NOT NULL DEFAULT 0 COMMENT 'True if user selected "My car is not in the list"',
    user_notes TEXT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (old_vehicle_detail_id) REFERENCES vehicle_details(id) ON DELETE CASCADE,
    FOREIGN KEY (new_vehicle_detail_id) REFERENCES vehicle_details(id) ON DELETE SET NULL,
    INDEX idx_user_id (user_id),
    INDEX idx_old_vehicle_detail_id (old_vehicle_detail_id),
    INDEX idx_new_vehicle_detail_id (new_vehicle_detail_id),
    INDEX idx_registration_number (registration_number),
    INDEX idx_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =====================================================
-- End of changes for: Flag Discrepancy Feature
-- =====================================================

-- =====================================================
-- Date: 2026-01-24
-- Feature: Role-Based Access Control for Admin Panel
-- =====================================================

-- NOTE: The 'roles' and 'user_roles' tables already exist in the database
-- This section only adds initial data if not already present

-- 1. Insert default roles (if not exists)
INSERT IGNORE INTO roles (id, created_at, modified_at, name, normalized_name) VALUES
(1, NOW(), NOW(), 'Admin', 'ADMIN'),
(2, NOW(), NOW(), 'Operator', 'OPERATOR');

-- 2. Assign Admin role to existing admin users (is_admin=1)
-- Run this only once to migrate existing admins
INSERT IGNORE INTO user_roles (user_id, role_id)
SELECT id, 1 FROM users WHERE is_admin = 1;

-- 3. Helper query to assign Operator role to a user
-- UPDATE: Replace <USER_ID> with actual user ID
-- INSERT INTO user_roles (user_id, role_id) VALUES (<USER_ID>, 2);

-- 4. Helper query to view all users with their roles
-- SELECT u.id, u.email, u.first_name, r.name as role
-- FROM users u
-- LEFT JOIN user_roles ur ON u.id = ur.user_id
-- LEFT JOIN roles r ON ur.role_id = r.id
-- WHERE ur.role_id IS NOT NULL;

-- =====================================================
-- End of changes for: Role-Based Access Control
-- =====================================================

-- =====================================================
-- Date: 2026-01-24
-- Feature: Service History Module
-- =====================================================

-- 1. Create service_history table
CREATE TABLE IF NOT EXISTS service_history (
    id INT PRIMARY KEY AUTO_INCREMENT,
    client_id VARCHAR(100) NULL COMMENT 'Surepass client_id from response',
    id_number VARCHAR(50) NOT NULL COMMENT 'Vehicle registration number',
    maker VARCHAR(50) NOT NULL COMMENT 'Vehicle maker (maruti, hyundai, mahindra)',
    service_history_details JSON NULL COMMENT 'Array of service records from Surepass',
    status_code INT NULL COMMENT 'API response status code',
    success TINYINT(1) DEFAULT 0 COMMENT 'Whether API call was successful',
    message VARCHAR(255) NULL COMMENT 'API response message',
    searched_by INT NULL COMMENT 'User ID who performed the search',
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (searched_by) REFERENCES users(id) ON DELETE SET NULL,
    INDEX idx_id_number (id_number),
    INDEX idx_maker (maker),
    INDEX idx_searched_by (searched_by),
    INDEX idx_created_at (created_at),
    INDEX idx_success (success)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =====================================================
-- End of changes for: Service History Module
-- =====================================================

-- =====================================================
-- Date: 2026-02-13
-- Feature: Vehicle Inspection System (378-parameter checklist)
-- =====================================================

-- 1. Create inspection_modules table (9 modules)
CREATE TABLE IF NOT EXISTS `inspection_modules` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `name` VARCHAR(100) NOT NULL,
  `slug` VARCHAR(50) NOT NULL,
  `icon` VARCHAR(10) NULL,
  `weight` DECIMAL(4,2) NOT NULL,
  `base_repair_cost` DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  `gamma` DECIMAL(4,2) NOT NULL DEFAULT 1.30,
  `sort_order` INT NOT NULL DEFAULT 0,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `modified_at` DATETIME NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_inspection_modules_slug` (`slug`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 2. Create inspection_sub_groups table (33 sub-groups)
CREATE TABLE IF NOT EXISTS `inspection_sub_groups` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `module_id` INT NOT NULL,
  `name` VARCHAR(100) NOT NULL,
  `check_count` INT NOT NULL DEFAULT 0,
  `sort_order` INT NOT NULL DEFAULT 0,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `modified_at` DATETIME NULL,
  PRIMARY KEY (`id`),
  KEY `idx_sub_groups_module` (`module_id`),
  CONSTRAINT `fk_sub_groups_module` FOREIGN KEY (`module_id`) REFERENCES `inspection_modules` (`id`) ON UPDATE CASCADE ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 3. Create inspection_parameters table (378 parameters)
CREATE TABLE IF NOT EXISTS `inspection_parameters` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `sub_group_id` INT NOT NULL,
  `param_number` INT NOT NULL,
  `name` VARCHAR(150) NOT NULL,
  `detail` TEXT NULL,
  `input_type` VARCHAR(50) NULL,
  `option_1` VARCHAR(100) NULL,
  `option_2` VARCHAR(100) NULL,
  `option_3` VARCHAR(100) NULL,
  `option_4` VARCHAR(100) NULL,
  `option_5` VARCHAR(100) NULL,
  `score_1` DECIMAL(3,2) NULL,
  `score_2` DECIMAL(3,2) NULL,
  `score_3` DECIMAL(3,2) NULL,
  `score_4` DECIMAL(3,2) NULL,
  `score_5` DECIMAL(3,2) NULL,
  `fuel_filter` VARCHAR(100) NULL DEFAULT 'All',
  `transmission_filter` VARCHAR(100) NULL DEFAULT 'All',
  `is_red_flag` TINYINT(1) NOT NULL DEFAULT 0,
  `sort_order` INT NOT NULL DEFAULT 0,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `modified_at` DATETIME NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_parameters_param_number` (`param_number`),
  KEY `idx_parameters_sub_group` (`sub_group_id`),
  CONSTRAINT `fk_parameters_sub_group` FOREIGN KEY (`sub_group_id`) REFERENCES `inspection_sub_groups` (`id`) ON UPDATE CASCADE ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 4. Create inspections table (main sessions)
CREATE TABLE IF NOT EXISTS `inspections` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `uuid` CHAR(36) NOT NULL,
  `technician_id` INT NOT NULL,
  `vehicle_reg_number` VARCHAR(20) NULL,
  `vehicle_make` VARCHAR(80) NULL,
  `vehicle_model` VARCHAR(80) NULL,
  `vehicle_year` INT NULL,
  `fuel_type` ENUM('Petrol','Diesel','CNG','Electric','Hybrid') NOT NULL,
  `transmission_type` ENUM('Manual','Automatic','CVT','DCT','AMT') NOT NULL,
  `odometer_km` INT NULL,
  `gps_latitude` DECIMAL(10,7) NULL,
  `gps_longitude` DECIMAL(10,7) NULL,
  `gps_address` VARCHAR(255) NULL,
  `status` ENUM('draft','in_progress','completed','scored','certified') NOT NULL DEFAULT 'draft',
  `total_applicable_params` INT NULL DEFAULT 0,
  `total_answered_params` INT NULL DEFAULT 0,
  `started_at` DATETIME NULL,
  `completed_at` DATETIME NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `modified_at` DATETIME NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_inspections_uuid` (`uuid`),
  KEY `idx_inspections_technician` (`technician_id`),
  KEY `idx_inspections_status` (`status`),
  CONSTRAINT `fk_inspections_technician` FOREIGN KEY (`technician_id`) REFERENCES `users` (`id`) ON UPDATE CASCADE ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 5. Create inspection_responses table (per-parameter findings)
CREATE TABLE IF NOT EXISTS `inspection_responses` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `inspection_id` INT NOT NULL,
  `parameter_id` INT NOT NULL,
  `selected_option` TINYINT NULL COMMENT '1-5 matching option_1..option_5, or null if unanswered',
  `severity_score` DECIMAL(3,2) NULL DEFAULT NULL,
  `notes` TEXT NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `modified_at` DATETIME NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_responses_inspection_param` (`inspection_id`, `parameter_id`),
  KEY `idx_responses_parameter` (`parameter_id`),
  CONSTRAINT `fk_responses_inspection` FOREIGN KEY (`inspection_id`) REFERENCES `inspections` (`id`) ON UPDATE CASCADE ON DELETE CASCADE,
  CONSTRAINT `fk_responses_parameter` FOREIGN KEY (`parameter_id`) REFERENCES `inspection_parameters` (`id`) ON UPDATE CASCADE ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 6. Create inspection_photos table (for Major/Critical findings)
CREATE TABLE IF NOT EXISTS `inspection_photos` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `response_id` INT NOT NULL,
  `file_path` VARCHAR(500) NOT NULL,
  `file_name` VARCHAR(255) NOT NULL,
  `file_size` INT NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_photos_response` (`response_id`),
  CONSTRAINT `fk_photos_response` FOREIGN KEY (`response_id`) REFERENCES `inspection_responses` (`id`) ON UPDATE CASCADE ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 7. Create inspection_scores table (computed results)
CREATE TABLE IF NOT EXISTS `inspection_scores` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `inspection_id` INT NOT NULL,
  `engine_risk` DECIMAL(5,4) NULL DEFAULT 0.0000,
  `structural_risk` DECIMAL(5,4) NULL DEFAULT 0.0000,
  `transmission_risk` DECIMAL(5,4) NULL DEFAULT 0.0000,
  `paint_risk` DECIMAL(5,4) NULL DEFAULT 0.0000,
  `suspension_risk` DECIMAL(5,4) NULL DEFAULT 0.0000,
  `electrical_risk` DECIMAL(5,4) NULL DEFAULT 0.0000,
  `interior_risk` DECIMAL(5,4) NULL DEFAULT 0.0000,
  `road_test_risk` DECIMAL(5,4) NULL DEFAULT 0.0000,
  `documents_risk` DECIMAL(5,4) NULL DEFAULT 0.0000,
  `vri` DECIMAL(5,4) NULL DEFAULT 0.0000,
  `rating` DECIMAL(3,2) NULL DEFAULT 0.00,
  `certification` ENUM('Gold','Silver','Verified','Not Certified') NULL,
  `has_red_flags` TINYINT(1) NOT NULL DEFAULT 0,
  `red_flag_params` JSON NULL,
  `total_repair_cost` DECIMAL(10,2) NULL DEFAULT 0.00,
  `repair_cost_breakdown` JSON NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `modified_at` DATETIME NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_scores_inspection` (`inspection_id`),
  CONSTRAINT `fk_scores_inspection` FOREIGN KEY (`inspection_id`) REFERENCES `inspections` (`id`) ON UPDATE CASCADE ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 8. Create inspection_certificates table
CREATE TABLE IF NOT EXISTS `inspection_certificates` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `inspection_id` INT NOT NULL,
  `certificate_number` VARCHAR(30) NOT NULL,
  `qr_code_data` VARCHAR(500) NULL,
  `rating` DECIMAL(3,2) NULL,
  `certification` ENUM('Gold','Silver','Verified','Not Certified') NULL,
  `issued_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `expires_at` DATETIME NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_certificates_inspection` (`inspection_id`),
  UNIQUE KEY `uk_certificates_number` (`certificate_number`),
  CONSTRAINT `fk_certificates_inspection` FOREIGN KEY (`inspection_id`) REFERENCES `inspections` (`id`) ON UPDATE CASCADE ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 9. Make technician_id nullable (inspection form is public, no auth)
ALTER TABLE `inspections` MODIFY COLUMN `technician_id` INT NULL;

-- NOTE: After creating tables, run the parameter seeder:
-- node src/seeders/seed-inspection-parameters.js

-- =====================================================
-- End of changes for: Vehicle Inspection System
-- =====================================================

-- =====================================================
-- Date: 2026-02-13
-- Feature: Admin Parameter Management (Enable/Disable)
-- =====================================================

-- 1. Add is_active column to inspection_parameters
ALTER TABLE `inspection_parameters` ADD COLUMN `is_active` TINYINT(1) NOT NULL DEFAULT 1 AFTER `sort_order`;

-- =====================================================
-- End of changes for: Admin Parameter Management
-- =====================================================
