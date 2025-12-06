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
-- 4. VehicleDetails - Add all Surepass rc-full API fields
-- Added: 2025-12-06
-- These columns store the complete vehicle information from Surepass API
-- ============================================
ALTER TABLE VehicleDetails
ADD COLUMN IF NOT EXISTS ClientId VARCHAR(255) NULL,
ADD COLUMN IF NOT EXISTS FatherName VARCHAR(500) NULL,
ADD COLUMN IF NOT EXISTS PresentAddress TEXT NULL,
ADD COLUMN IF NOT EXISTS PermanentAddress TEXT NULL,
ADD COLUMN IF NOT EXISTS MobileNumber VARCHAR(50) NULL,
ADD COLUMN IF NOT EXISTS VehicleCategory VARCHAR(255) NULL,
ADD COLUMN IF NOT EXISTS MakerDescription VARCHAR(500) NULL,
ADD COLUMN IF NOT EXISTS MakerModel VARCHAR(255) NULL,
ADD COLUMN IF NOT EXISTS BodyType VARCHAR(100) NULL,
ADD COLUMN IF NOT EXISTS NormsType VARCHAR(100) NULL,
ADD COLUMN IF NOT EXISTS FitUpTo VARCHAR(100) NULL,
ADD COLUMN IF NOT EXISTS Financer VARCHAR(500) NULL,
ADD COLUMN IF NOT EXISTS Financed TINYINT(1) DEFAULT 0,
ADD COLUMN IF NOT EXISTS InsuranceCompany VARCHAR(500) NULL,
ADD COLUMN IF NOT EXISTS InsurancePolicyNumber VARCHAR(255) NULL,
ADD COLUMN IF NOT EXISTS InsuranceValidUpto VARCHAR(100) NULL,
ADD COLUMN IF NOT EXISTS ManufacturingDate VARCHAR(100) NULL,
ADD COLUMN IF NOT EXISTS ManufacturingDateFormatted VARCHAR(50) NULL,
ADD COLUMN IF NOT EXISTS RegisteredAt VARCHAR(255) NULL,
ADD COLUMN IF NOT EXISTS LatestBy VARCHAR(255) NULL,
ADD COLUMN IF NOT EXISTS LessInfo TINYINT(1) DEFAULT 0,
ADD COLUMN IF NOT EXISTS TaxUpto VARCHAR(100) NULL,
ADD COLUMN IF NOT EXISTS TaxPaidUpto VARCHAR(100) NULL,
ADD COLUMN IF NOT EXISTS CubicCapacity VARCHAR(50) NULL,
ADD COLUMN IF NOT EXISTS VehicleGrossWeight VARCHAR(50) NULL,
ADD COLUMN IF NOT EXISTS NoCylinders VARCHAR(20) NULL,
ADD COLUMN IF NOT EXISTS SeatCapacity VARCHAR(20) NULL,
ADD COLUMN IF NOT EXISTS SleeperCapacity VARCHAR(20) NULL,
ADD COLUMN IF NOT EXISTS StandingCapacity VARCHAR(20) NULL,
ADD COLUMN IF NOT EXISTS Wheelbase VARCHAR(50) NULL,
ADD COLUMN IF NOT EXISTS UnladenWeight VARCHAR(50) NULL,
ADD COLUMN IF NOT EXISTS VehicleCategoryDescription VARCHAR(500) NULL,
ADD COLUMN IF NOT EXISTS PUCCNumber VARCHAR(100) NULL,
ADD COLUMN IF NOT EXISTS PUCCUpto VARCHAR(100) NULL,
ADD COLUMN IF NOT EXISTS PermitNumber VARCHAR(100) NULL,
ADD COLUMN IF NOT EXISTS PermitIssueDate VARCHAR(100) NULL,
ADD COLUMN IF NOT EXISTS PermitValidFrom VARCHAR(100) NULL,
ADD COLUMN IF NOT EXISTS PermitValidUpto VARCHAR(100) NULL,
ADD COLUMN IF NOT EXISTS PermitType VARCHAR(100) NULL,
ADD COLUMN IF NOT EXISTS NationalPermitNumber VARCHAR(100) NULL,
ADD COLUMN IF NOT EXISTS NationalPermitUpto VARCHAR(100) NULL,
ADD COLUMN IF NOT EXISTS NationalPermitIssuedBy VARCHAR(255) NULL,
ADD COLUMN IF NOT EXISTS NonUseStatus VARCHAR(100) NULL,
ADD COLUMN IF NOT EXISTS NonUseFrom VARCHAR(100) NULL,
ADD COLUMN IF NOT EXISTS NonUseTo VARCHAR(100) NULL,
ADD COLUMN IF NOT EXISTS BlacklistStatus TEXT NULL,
ADD COLUMN IF NOT EXISTS NocDetails TEXT NULL,
ADD COLUMN IF NOT EXISTS OwnerNumber VARCHAR(20) NULL,
ADD COLUMN IF NOT EXISTS RcStatus VARCHAR(100) NULL,
ADD COLUMN IF NOT EXISTS MaskedName VARCHAR(500) NULL,
ADD COLUMN IF NOT EXISTS ChallanDetails TEXT NULL,
ADD COLUMN IF NOT EXISTS Variant VARCHAR(255) NULL,
ADD COLUMN IF NOT EXISTS VehicleDetailRequestId INT NULL;

-- ============================================
-- 5. vehiclechallandetails - Add Surepass challan API fields
-- Added: 2025-12-06
-- These columns store traffic violation details from Surepass API
-- ============================================
ALTER TABLE vehiclechallandetails
ADD COLUMN IF NOT EXISTS ChallanPlace VARCHAR(500) NULL,
ADD COLUMN IF NOT EXISTS State VARCHAR(100) NULL,
ADD COLUMN IF NOT EXISTS Rto VARCHAR(255) NULL,
ADD COLUMN IF NOT EXISTS OffenseDetails TEXT NULL,
ADD COLUMN IF NOT EXISTS AccusedName VARCHAR(500) NULL,
ADD COLUMN IF NOT EXISTS CourtChallan TINYINT(1) DEFAULT 0,
ADD COLUMN IF NOT EXISTS UpstreamCode VARCHAR(100) NULL;

-- Update ChallanDate to VARCHAR to store date strings from Surepass
ALTER TABLE vehiclechallandetails MODIFY COLUMN ChallanDate VARCHAR(100) NULL;

-- ============================================
-- 6. VehicleDetails - Fix column sizes for long values
-- Added: 2025-12-06
-- BlacklistStatus can contain very long messages from Surepass
-- ============================================
ALTER TABLE VehicleDetails MODIFY COLUMN BlacklistStatus TEXT NULL;

-- ============================================
-- 7. VehicleDetails - Add ExShowroomPrice for resale value calculation
-- Added: 2025-12-06
-- Stores original ex-showroom price from Surepass Vehicle Price Check API
-- Used for custom resale value calculation (replacing Droom API)
-- ============================================
ALTER TABLE VehicleDetails
ADD COLUMN IF NOT EXISTS ExShowroomPrice DECIMAL(12,2) NULL;

-- ============================================
-- Verification Queries
-- ============================================
-- DESCRIBE UserActivityLogs;
-- DESCRIBE vehicledetailrequests;
-- DESCRIBE physicalverifications;
-- DESCRIBE VehicleDetails;
-- DESCRIBE vehiclechallandetails;
