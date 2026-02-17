-- =====================================================
-- Migration: Add Appointment Scheduling Fields
-- Description: Adds appointment_date and appointment_time_slot
--              columns to service_orders table for scheduling
--              service visits
-- Created: 2026-02-17
-- =====================================================

-- Add appointment columns to service_orders table
ALTER TABLE service_orders
ADD COLUMN appointment_date DATE NULL COMMENT 'Scheduled appointment date for service visit' AFTER order_notes,
ADD COLUMN appointment_time_slot VARCHAR(20) NULL COMMENT 'Time slot for appointment (e.g., 09:00-10:00)' AFTER appointment_date,
ADD INDEX idx_appointment_date (appointment_date) COMMENT 'Index for filtering/sorting by appointment date';

-- =====================================================
-- Rollback Script (if needed)
-- =====================================================
-- To rollback this migration, run:
--
-- ALTER TABLE service_orders
-- DROP INDEX idx_appointment_date,
-- DROP COLUMN appointment_time_slot,
-- DROP COLUMN appointment_date;
-- =====================================================

-- Verification Query
-- Run this to verify the columns were added successfully:
-- DESCRIBE service_orders;
