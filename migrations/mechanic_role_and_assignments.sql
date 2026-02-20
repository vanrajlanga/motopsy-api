-- ============================================================
-- Migration: Mechanic Role + Auto-Assignment System
-- Date: 2026-02-20
-- ============================================================

-- 1. Add Mechanic role
INSERT INTO roles (name, normalized_name, created_at, modified_at)
VALUES ('Mechanic', 'MECHANIC', NOW(), NOW())
ON DUPLICATE KEY UPDATE modified_at = NOW();

-- 2. Re-enable appointment scheduling fields on service_orders
ALTER TABLE service_orders
  ADD COLUMN IF NOT EXISTS appointment_date DATE NULL COMMENT 'Scheduled appointment date',
  ADD COLUMN IF NOT EXISTS appointment_time_slot VARCHAR(20) NULL COMMENT 'Time slot e.g. 10:00-11:00',
  ADD COLUMN IF NOT EXISTS mechanic_id INT NULL COMMENT 'Assigned mechanic (FK to users)';

-- 3. Add FK constraint for mechanic_id
ALTER TABLE service_orders
  ADD CONSTRAINT fk_service_orders_mechanic
  FOREIGN KEY (mechanic_id) REFERENCES users(id) ON DELETE SET NULL;

-- 4. Add service_order_id to inspections (links inspection to service order)
ALTER TABLE inspections
  ADD COLUMN IF NOT EXISTS service_order_id INT NULL COMMENT 'Linked service order';

ALTER TABLE inspections
  ADD CONSTRAINT fk_inspections_service_order
  FOREIGN KEY (service_order_id) REFERENCES service_orders(id) ON DELETE SET NULL;

-- 5. Index for faster mechanic order lookups
CREATE INDEX IF NOT EXISTS idx_service_orders_mechanic ON service_orders(mechanic_id);
CREATE INDEX IF NOT EXISTS idx_service_orders_appointment ON service_orders(appointment_date, appointment_time_slot);
CREATE INDEX IF NOT EXISTS idx_inspections_service_order ON inspections(service_order_id);
