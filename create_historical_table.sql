-- Historical Data Table Schema
-- This table stores weekly snapshots of planning unit data for historical analysis
-- Retention: 30 days (older snapshots are automatically deleted by the weekly job)

-- @mitigates MasterDataApp:Backend:Historical against #data_loss with snapshot retention
-- @connects MasterDataApp:Backend to Databricks:HistoricalTable with SQL

CREATE TABLE IF NOT EXISTS cpg_reporting_sandbox.default.planning_unit_stage_historical (
  -- Snapshot metadata
  snapshot_date DATE NOT NULL COMMENT 'Date when this snapshot was taken',
  
  -- Original table columns (from planning_unit_stage_current)
  RecordID STRING COMMENT 'Unique record identifier',
  PRDID STRING COMMENT 'Product ID',
  LOCID STRING COMMENT 'Location ID',
  PNL_CATEGORY_DESC STRING COMMENT 'P&L Category Description',
  PRODUCT_LEVEL_2_DESCRIPTION STRING COMMENT 'Product Level 2 Description',
  PRODUCT_LEVEL_3_DESCRIPTION STRING COMMENT 'Product Level 3 Description',
  PRODUCT_LEVEL_4_DESCRIPTION STRING COMMENT 'Product Level 4 Description',
  SUPPLY_CHAIN_SIZE STRING COMMENT 'Supply Chain Size',
  MATERIAL_GROUP STRING COMMENT 'Material Group',
  MATERIAL_TYPE STRING COMMENT 'Material Type',
  MATERIAL STRING COMMENT 'Material',
  CLAIMSHELL STRING COMMENT 'Claimshell',
  PLANT_MATERIAL_STATUS_DESC STRING COMMENT 'Plant Material Status Description',
  CURRENT_PLUNITID STRING COMMENT 'Current Planning Unit ID',
  RECOMMENDED STRING COMMENT 'Recommended Planning Unit ID',
  RECOMMENDED_REASON STRING COMMENT 'Reason for recommendation',
  OVERWRITE STRING COMMENT 'Overwrite flag',
  Last_Refresh_Date DATE COMMENT 'Date when source data was last refreshed',
  
  -- Approval tracking
  Approval_Status STRING COMMENT 'Approval status: Approved, Denied, or NULL',
  
  -- Composite primary key
  CONSTRAINT pk_historical PRIMARY KEY (snapshot_date, PRDID, LOCID)
)
COMMENT 'Historical snapshots of planning unit stage data - retains 4 weeks of history'
TBLPROPERTIES (
  'delta.enableChangeDataFeed' = 'true',
  'delta.autoOptimize.optimizeWrite' = 'true',
  'delta.autoOptimize.autoCompact' = 'true'
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_historical_snapshot_date 
  ON cpg_reporting_sandbox.default.planning_unit_stage_historical (snapshot_date);

CREATE INDEX IF NOT EXISTS idx_historical_approval_status 
  ON cpg_reporting_sandbox.default.planning_unit_stage_historical (Approval_Status);

-- Display table schema
DESCRIBE EXTENDED cpg_reporting_sandbox.default.planning_unit_stage_historical;
