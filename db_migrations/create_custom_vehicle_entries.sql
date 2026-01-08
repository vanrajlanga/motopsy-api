-- Create custom_vehicle_entries table to store user-provided vehicle data
-- This table captures vehicles not found in our database for future verification and addition

CREATE TABLE IF NOT EXISTS custom_vehicle_entries (
  id INT PRIMARY KEY AUTO_INCREMENT,
  user_id INT NOT NULL,
  vehicle_detail_id INT DEFAULT NULL,

  -- Custom vehicle data provided by user
  custom_make VARCHAR(255) NOT NULL,
  custom_model VARCHAR(255) NOT NULL,
  custom_version VARCHAR(255) NOT NULL,
  ex_showroom_price DECIMAL(15,2) NOT NULL COMMENT 'User-provided ex-showroom price in INR',
  kms_driven INT DEFAULT NULL,

  -- Tracking and status
  status ENUM('pending', 'approved', 'rejected') DEFAULT 'pending',
  admin_notes TEXT DEFAULT NULL,

  -- Timestamps
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  -- Foreign keys
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (vehicle_detail_id) REFERENCES vehicle_details(id) ON DELETE SET NULL,

  -- Indexes for performance
  INDEX idx_status (status),
  INDEX idx_created_at (created_at),
  INDEX idx_user_id (user_id),
  INDEX idx_make_model (custom_make, custom_model)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
