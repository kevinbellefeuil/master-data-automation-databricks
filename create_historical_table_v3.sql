-- Historical Data Table Schema (with Column Mapping enabled)
-- This handles column names with spaces and special characters
-- Retention: 30 days (older snapshots are automatically deleted by the weekly job)

-- Drop existing table if needed
DROP TABLE IF EXISTS cpg_reporting_sandbox.default.planning_unit_stage_historical;

-- Create historical table with column mapping enabled
-- This allows column names with spaces like "CURRENT PLUNITID"
CREATE TABLE cpg_reporting_sandbox.default.planning_unit_stage_historical
TBLPROPERTIES (
  'delta.columnMapping.mode' = 'name',
  'delta.enableChangeDataFeed' = 'true',
  'delta.autoOptimize.optimizeWrite' = 'true',
  'delta.autoOptimize.autoCompact' = 'true'
)
AS 
SELECT 
  CURRENT_DATE() as snapshot_date,
  *
FROM cpg_reporting_sandbox.default.planning_unit_stage_current
WHERE 1=0;  -- Don't copy any data, just the structure

-- Verify table was created
DESCRIBE cpg_reporting_sandbox.default.planning_unit_stage_historical;

-- Show the schema
SELECT * FROM cpg_reporting_sandbox.default.planning_unit_stage_historical LIMIT 5;
