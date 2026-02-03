-- Historical Data Table Schema (Auto-matching version)
-- This table stores weekly snapshots of planning unit data for historical analysis
-- Retention: 30 days (older snapshots are automatically deleted by the weekly job)

-- Drop existing table if you need to recreate it
-- DROP TABLE IF EXISTS cpg_reporting_sandbox.default.planning_unit_stage_historical;

-- Create historical table by copying structure from current table
-- This automatically matches all columns from the source table
CREATE TABLE IF NOT EXISTS cpg_reporting_sandbox.default.planning_unit_stage_historical
AS 
SELECT 
  CURRENT_DATE() as snapshot_date,
  *
FROM cpg_reporting_sandbox.default.planning_unit_stage_current
WHERE 1=0;  -- Don't copy any data, just the structure

-- Add table properties for optimization
ALTER TABLE cpg_reporting_sandbox.default.planning_unit_stage_historical
SET TBLPROPERTIES (
  'delta.enableChangeDataFeed' = 'true',
  'delta.autoOptimize.optimizeWrite' = 'true',
  'delta.autoOptimize.autoCompact' = 'true'
);

-- Verify table was created
DESCRIBE cpg_reporting_sandbox.default.planning_unit_stage_historical;

-- Show sample to confirm structure
SELECT * FROM cpg_reporting_sandbox.default.planning_unit_stage_historical LIMIT 5;
