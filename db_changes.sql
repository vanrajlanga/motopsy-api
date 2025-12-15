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
