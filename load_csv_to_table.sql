-- Databricks notebook source
"""
Load CSV file into planning_unit_stage_current table
Instructions:
1. Upload PLANNING_UNIT_STAGE.csv to Databricks (drag & drop into this notebook)
2. Update the file path below to match where you uploaded it
3. Run this notebook
"""

-- COMMAND ----------

-- STEP 1: Create a temporary view from the CSV file
-- Replace '/Volumes/...' with the actual path where you uploaded the CSV
CREATE OR REPLACE TEMPORARY VIEW temp_planning_unit_data
USING csv
OPTIONS (
  path '/Volumes/cpg_reporting_sandbox/default/PLANNING_UNIT_STAGE.csv',
  header 'true',
  inferSchema 'true',
  mode 'FAILFAST'
);

-- COMMAND ----------

-- STEP 2: Verify the data loaded correctly
SELECT COUNT(*) as row_count FROM temp_planning_unit_data;

-- COMMAND ----------

-- STEP 3: Preview the first few rows
SELECT * FROM temp_planning_unit_data LIMIT 10;

-- COMMAND ----------

-- STEP 4: Backup current data (optional but recommended)
CREATE TABLE IF NOT EXISTS cpg_reporting_sandbox.default.planning_unit_stage_current_backup
AS SELECT * FROM cpg_reporting_sandbox.default.planning_unit_stage_current;

-- COMMAND ----------

-- STEP 5: Clear existing data from current table
TRUNCATE TABLE cpg_reporting_sandbox.default.planning_unit_stage_current;

-- COMMAND ----------

-- STEP 6: Insert new data from CSV
INSERT INTO cpg_reporting_sandbox.default.planning_unit_stage_current
SELECT * FROM temp_planning_unit_data;

-- COMMAND ----------

-- STEP 7: Verify the load was successful
SELECT 
  COUNT(*) as total_records,
  COUNT(DISTINCT PRDID) as unique_products,
  COUNT(DISTINCT LOCID) as unique_locations,
  MAX(`Last Refresh Date`) as latest_refresh_date
FROM cpg_reporting_sandbox.default.planning_unit_stage_current;

-- COMMAND ----------

-- STEP 8: Preview the loaded data
SELECT * FROM cpg_reporting_sandbox.default.planning_unit_stage_current LIMIT 20;
