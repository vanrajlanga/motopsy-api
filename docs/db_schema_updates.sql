-- Database Schema Updates for motopsy
-- These changes align the database with the .NET API entity definitions
-- Run this on the production database if needed

-- ============================================
-- 1. UserActivityLogs - Add Screen column
-- ============================================
ALTER TABLE UserActivityLogs ADD COLUMN Screen VARCHAR(500) NULL AFTER Action;

-- ============================================
-- 2. vehicledetailrequests - Add missing columns
-- ============================================
ALTER TABLE vehicledetailrequests
  ADD COLUMN PaymentHistoryId INT NULL AFTER UserId,
  ADD COLUMN Make VARCHAR(100) NULL AFTER RegistrationNumber,
  ADD COLUMN Model VARCHAR(100) NULL AFTER Make,
  ADD COLUMN Year VARCHAR(10) NULL AFTER Model,
  ADD COLUMN Trim VARCHAR(100) NULL AFTER Year,
  ADD COLUMN KmsDriven VARCHAR(50) NULL AFTER Trim,
  ADD COLUMN City VARCHAR(100) NULL AFTER KmsDriven,
  ADD COLUMN NoOfOwners VARCHAR(10) NULL AFTER City,
  ADD COLUMN Version VARCHAR(100) NULL AFTER NoOfOwners,
  ADD COLUMN TransactionType VARCHAR(50) NULL AFTER Version,
  ADD COLUMN CustomerType VARCHAR(50) NULL AFTER TransactionType;

-- ============================================
-- 3. physicalverifications - Add missing columns
-- ============================================
ALTER TABLE physicalverifications
  ADD COLUMN Name VARCHAR(50) NOT NULL DEFAULT '' AFTER UserId,
  CHANGE COLUMN AppointmentDate AppointmentAt DATETIME(6) NULL,
  ADD COLUMN Address VARCHAR(1000) NOT NULL DEFAULT '' AFTER Status,
  ADD COLUMN City VARCHAR(50) NOT NULL DEFAULT '' AFTER Address,
  ADD COLUMN State VARCHAR(50) NOT NULL DEFAULT '' AFTER City,
  ADD COLUMN Pincode INT NOT NULL DEFAULT 0 AFTER State,
  ADD COLUMN Country VARCHAR(50) NOT NULL DEFAULT '' AFTER Pincode,
  ADD COLUMN Description VARCHAR(1000) NOT NULL DEFAULT '' AFTER Country,
  ADD COLUMN Report LONGBLOB NULL AFTER ReportPath,
  ADD COLUMN ReportGeneratedAt DATETIME(6) NULL AFTER Report;

-- ============================================
-- Verification Queries
-- ============================================
-- DESCRIBE UserActivityLogs;
-- DESCRIBE vehicledetailrequests;
-- DESCRIBE physicalverifications;
