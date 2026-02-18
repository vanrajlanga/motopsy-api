-- ============================================================
-- Motopsy Inspection System - Database Schema
-- Run against: motopsy_db (local) or motopsy (production)
-- ============================================================

-- 1. inspection_modules (9 rows)
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

-- 2. inspection_sub_groups (33 rows)
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

-- 3. inspection_parameters (378 rows)
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

-- 4. inspections (main sessions)
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

-- 5. inspection_responses (per-parameter findings)
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

-- 6. inspection_photos (for Major/Critical findings)
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

-- 7. inspection_scores (computed results)
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

-- 8. inspection_certificates
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
