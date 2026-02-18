-- Add inspector name and photo columns to inspections table
ALTER TABLE inspections
  ADD COLUMN inspector_name VARCHAR(150) NULL AFTER gps_address,
  ADD COLUMN inspector_photo_path VARCHAR(500) NULL AFTER inspector_name;
