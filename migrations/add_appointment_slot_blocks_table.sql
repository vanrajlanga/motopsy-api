CREATE TABLE IF NOT EXISTS appointment_slot_blocks (
  id INT AUTO_INCREMENT PRIMARY KEY,
  block_date DATE NOT NULL COMMENT 'Date to block',
  time_slot VARCHAR(20) NULL COMMENT 'NULL means entire day is blocked',
  reason VARCHAR(255) NULL COMMENT 'Reason for blocking (shown to admin)',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  modified_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_block_date (block_date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
