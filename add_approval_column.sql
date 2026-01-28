-- Add Approval_Status column to the planning unit table
ALTER TABLE cpg_reporting_sandbox.default.planning_unit_stage_current 
ADD COLUMN Approval_Status STRING;

-- Verify the column was added
DESCRIBE cpg_reporting_sandbox.default.planning_unit_stage_current;
