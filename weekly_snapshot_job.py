# Databricks notebook source
"""
Weekly Planning Unit Snapshot Job

This notebook:
1. Takes a snapshot of the current planning_unit_stage_current table
2. Inserts it into the historical table with today's date
3. Deletes snapshots older than 30 days
4. Logs execution metrics

Schedule: Every Sunday at 2:00 AM
Retention: 30 days (approximately 4 weekly snapshots)

@mitigates MasterDataApp:Backend:SnapshotJob against #data_loss with automated backups
@mitigates MasterDataApp:Backend:SnapshotJob against #storage_bloat with automatic cleanup
@connects SnapshotJob to Databricks:CurrentTable with SELECT
@connects SnapshotJob to Databricks:HistoricalTable with INSERT/DELETE
"""

# COMMAND ----------

from datetime import datetime, timedelta
from pyspark.sql import SparkSession

# COMMAND ----------

# Configuration
CURRENT_TABLE = "cpg_reporting_sandbox.default.planning_unit_stage_current"
HISTORICAL_TABLE = "cpg_reporting_sandbox.default.planning_unit_stage_historical"
RETENTION_DAYS = 30

# Initialize Spark session
spark = SparkSession.builder.getOrCreate()

# COMMAND ----------

# Get current timestamp for logging
job_start_time = datetime.now()
snapshot_date = job_start_time.date()

print(f"=== Weekly Snapshot Job Started ===")
print(f"Job Start Time: {job_start_time}")
print(f"Snapshot Date: {snapshot_date}")
print(f"Current Table: {CURRENT_TABLE}")
print(f"Historical Table: {HISTORICAL_TABLE}")
print(f"Retention Policy: {RETENTION_DAYS} days")

# COMMAND ----------

# STEP 1: Count current records
print("\n--- Step 1: Counting current records ---")
current_count_query = f"SELECT COUNT(*) as count FROM {CURRENT_TABLE}"
current_count = spark.sql(current_count_query).collect()[0]['count']
print(f"Current table contains {current_count} records")

# COMMAND ----------

# STEP 2: Insert snapshot into historical table
print("\n--- Step 2: Inserting snapshot into historical table ---")

# @mitigates MasterDataApp:Backend:SnapshotJob against #sql_injection with parameterized date
# Note: Using SELECT * to dynamically match all columns from source table
insert_query = f"""
INSERT INTO {HISTORICAL_TABLE}
SELECT 
  CURRENT_DATE() as snapshot_date,
  *
FROM {CURRENT_TABLE}
"""

try:
    spark.sql(insert_query)
    print(f"✓ Successfully inserted {current_count} records with snapshot_date = {snapshot_date}")
except Exception as e:
    print(f"✗ Error inserting snapshot: {str(e)}")
    raise

# COMMAND ----------

# STEP 3: Verify insertion
print("\n--- Step 3: Verifying insertion ---")
verify_query = f"""
SELECT COUNT(*) as count 
FROM {HISTORICAL_TABLE} 
WHERE snapshot_date = CURRENT_DATE()
"""
inserted_count = spark.sql(verify_query).collect()[0]['count']
print(f"Verified: {inserted_count} records inserted for {snapshot_date}")

if inserted_count != current_count:
    print(f"⚠ Warning: Inserted count ({inserted_count}) doesn't match current count ({current_count})")

# COMMAND ----------

# STEP 4: Delete old snapshots (older than retention period)
print(f"\n--- Step 4: Deleting snapshots older than {RETENTION_DAYS} days ---")

# Calculate cutoff date
cutoff_date = snapshot_date - timedelta(days=RETENTION_DAYS)
print(f"Cutoff date: {cutoff_date}")

# Count records to be deleted
count_old_query = f"""
SELECT COUNT(*) as count 
FROM {HISTORICAL_TABLE} 
WHERE snapshot_date < DATE_SUB(CURRENT_DATE(), {RETENTION_DAYS})
"""
old_count = spark.sql(count_old_query).collect()[0]['count']
print(f"Found {old_count} records older than {cutoff_date}")

# Delete old records
if old_count > 0:
    delete_query = f"""
    DELETE FROM {HISTORICAL_TABLE}
    WHERE snapshot_date < DATE_SUB(CURRENT_DATE(), {RETENTION_DAYS})
    """
    try:
        spark.sql(delete_query)
        print(f"✓ Successfully deleted {old_count} old records")
    except Exception as e:
        print(f"✗ Error deleting old records: {str(e)}")
        raise
else:
    print("No old records to delete")

# COMMAND ----------

# STEP 5: Generate summary statistics
print("\n--- Step 5: Summary Statistics ---")

summary_query = f"""
SELECT 
  snapshot_date,
  COUNT(*) as record_count,
  COUNT(DISTINCT PRDID) as unique_products,
  COUNT(DISTINCT LOCID) as unique_locations,
  SUM(CASE WHEN Approval_Status = 'Approved' THEN 1 ELSE 0 END) as approved_count,
  SUM(CASE WHEN Approval_Status = 'Denied' THEN 1 ELSE 0 END) as denied_count,
  SUM(CASE WHEN Approval_Status IS NULL THEN 1 ELSE 0 END) as pending_count
FROM {HISTORICAL_TABLE}
GROUP BY snapshot_date
ORDER BY snapshot_date DESC
LIMIT 10
"""

summary_df = spark.sql(summary_query)
print("\nHistorical Table Summary (last 10 snapshots):")
summary_df.show(truncate=False)

# COMMAND ----------

# STEP 6: Final report
job_end_time = datetime.now()
job_duration = (job_end_time - job_start_time).total_seconds()

print("\n" + "="*60)
print("=== Weekly Snapshot Job Completed Successfully ===")
print("="*60)
print(f"Job Start Time:     {job_start_time}")
print(f"Job End Time:       {job_end_time}")
print(f"Duration:           {job_duration:.2f} seconds")
print(f"Snapshot Date:      {snapshot_date}")
print(f"Records Inserted:   {inserted_count}")
print(f"Old Records Deleted: {old_count}")
print(f"Total Historical Records: {spark.sql(f'SELECT COUNT(*) as count FROM {HISTORICAL_TABLE}').collect()[0]['count']}")
print("="*60)

# COMMAND ----------

# Return success status for Databricks Jobs monitoring
dbutils.notebook.exit({
    "status": "SUCCESS",
    "snapshot_date": str(snapshot_date),
    "records_inserted": inserted_count,
    "records_deleted": old_count,
    "duration_seconds": job_duration
})
