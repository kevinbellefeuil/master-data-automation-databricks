# Historical Data Snapshot Setup Guide

This guide explains how to set up and use the historical data snapshot feature for the IBP Master Data Automation application.

## Overview

The historical data feature automatically captures weekly snapshots of planning unit data and stores them for 30 days. This allows users to download and analyze historical trends, track approval patterns, and maintain an audit trail.

### Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Weekly Snapshot Flow                       │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  planning_unit_stage_current                                 │
│           │                                                   │
│           │ (Every Sunday 2AM)                               │
│           ▼                                                   │
│  Databricks Job: weekly_snapshot_job.py                      │
│           │                                                   │
│           ├──► INSERT snapshot with today's date             │
│           └──► DELETE snapshots older than 30 days           │
│           │                                                   │
│           ▼                                                   │
│  planning_unit_stage_historical                              │
│                                                               │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│                    Download Flow                              │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  User clicks "Download Historical Data" button               │
│           │                                                   │
│           ▼                                                   │
│  GET /api/historical/download                                │
│           │                                                   │
│           ├──► Query planning_unit_stage_historical          │
│           ├──► Generate Excel file with openpyxl             │
│           └──► Return file to browser                        │
│                                                               │
└─────────────────────────────────────────────────────────────┘
```

## Components

### 1. Historical Table Schema

**Table:** `cpg_reporting_sandbox.default.planning_unit_stage_historical`

**Key Columns:**
- `snapshot_date` (DATE): When the snapshot was taken
- All columns from `planning_unit_stage_current`
- `Approval_Status` (STRING): Tracks approval history

**Primary Key:** `(snapshot_date, PRDID, LOCID)`

### 2. Weekly Snapshot Job

**File:** `weekly_snapshot_job.py`

**Schedule:** Every Sunday at 2:00 AM

**Actions:**
1. Inserts current data with `CURRENT_DATE()` as `snapshot_date`
2. Deletes snapshots where `snapshot_date < CURRENT_DATE() - 30 days`

### 3. Download API Endpoint

**Endpoint:** `GET /api/historical/download`

**Returns:** Excel file with all historical snapshots (up to 30 days)

### 4. Frontend Button

**Location:** Top-right of app header

**Label:** "📥 Download Historical Data"

---

## Setup Instructions

### Step 1: Create Historical Table

Run the SQL script in Databricks SQL Editor or a notebook:

```bash
# In Databricks workspace
# Navigate to: SQL Editor
# Copy and paste contents of: create_historical_table.sql
# Execute the script
```

**Or using Databricks CLI:**
```bash
databricks workspace import create_historical_table.sql /Workspace/Users/kevin.bellefeuil@gapac.com/create_historical_table.sql
```

**Verify table creation:**
```sql
DESCRIBE EXTENDED cpg_reporting_sandbox.default.planning_unit_stage_historical;
```

### Step 2: Upload Snapshot Notebook

1. Go to Databricks Workspace
2. Navigate to your user folder: `/Users/kevin.bellefeuil@gapac.com/`
3. Click "Import"
4. Upload `weekly_snapshot_job.py`
5. Verify the notebook opens correctly

**Or using Databricks CLI:**
```bash
databricks workspace import weekly_snapshot_job.py /Workspace/Users/kevin.bellefeuil@gapac.com/weekly_snapshot_job.py --language PYTHON
```

### Step 3: Create Databricks Job

1. **Navigate to Databricks Jobs**:
   - Click "Workflows" in left sidebar
   - Click "Create Job"

2. **Configure Job:**
   - **Name:** `Planning Unit Weekly Snapshot`
   - **Task Type:** Notebook
   - **Notebook Path:** `/Workspace/Users/kevin.bellefeuil@gapac.com/weekly_snapshot_job.py`
   - **Cluster:** Select existing SQL warehouse (ID: `2459b6c757e09896`)

3. **Set Schedule:**
   - Click "Add Schedule"
   - **Schedule Type:** Cron
   - **Cron Expression:** `0 2 ? * SUN *`
     - This runs every Sunday at 2:00 AM
   - **Timezone:** Select your timezone (e.g., `America/New_York`)

4. **Enable Notifications (Optional):**
   - Email on failure: `kevin.bellefeuil@gapac.com`

5. **Save Job**

### Step 4: Test the Snapshot Job

**Manual Test Run:**
1. Go to the job you just created
2. Click "Run Now"
3. Monitor the run in the "Runs" tab
4. Check logs for success confirmation

**Verify snapshot was created:**
```sql
SELECT 
  snapshot_date, 
  COUNT(*) as record_count 
FROM cpg_reporting_sandbox.default.planning_unit_stage_historical
GROUP BY snapshot_date
ORDER BY snapshot_date DESC;
```

### Step 5: Deploy Updated Application

1. **Update dependencies:**
   ```bash
   # From project directory
   pip install -r requirements.txt
   ```

2. **Build frontend:**
   ```bash
   npm run build
   ```

3. **Sync to Databricks:**
   ```bash
   # Use app.yaml.local with real credentials
   Copy-Item app.yaml.local app.yaml
   databricks sync . /Workspace/Users/kevin.bellefeuil@gapac.com/master-data-hello-world
   ```

4. **Deploy:**
   ```bash
   databricks apps deploy master-data-hello-world --source-code-path /Workspace/Users/kevin.bellefeuil@gapac.com/master-data-hello-world
   ```

5. **Restore template app.yaml:**
   ```bash
   git checkout app.yaml
   ```

---

## Usage

### Downloading Historical Data

1. Open the IBP Master Data Automation app
2. Click the **"📥 Download Historical Data"** button in the top-right corner
3. The browser will download an Excel file with filename:
   - `planning_unit_historical_YYYYMMDD_HHMMSS.xlsx`

### Excel File Contents

**Sheets:**
- **Historical Data** (main sheet):
  - All columns from the historical table
  - Sorted by `snapshot_date` (descending), then `PRDID`, `LOCID`
  - Color-coded header row (blue background, white text)
  - Auto-sized columns
  - Frozen header row

**Data Includes:**
- Up to 4-5 weeks of snapshots (30 days retention)
- All planning unit fields
- Approval status at the time of snapshot
- Snapshot date for each record

---

## Maintenance

### Checking Snapshot History

**View all snapshots:**
```sql
SELECT 
  snapshot_date,
  COUNT(*) as total_records,
  COUNT(DISTINCT PRDID) as unique_products,
  COUNT(DISTINCT LOCID) as unique_locations,
  SUM(CASE WHEN Approval_Status = 'Approved' THEN 1 ELSE 0 END) as approved,
  SUM(CASE WHEN Approval_Status = 'Denied' THEN 1 ELSE 0 END) as denied,
  SUM(CASE WHEN Approval_Status IS NULL THEN 1 ELSE 0 END) as pending
FROM cpg_reporting_sandbox.default.planning_unit_stage_historical
GROUP BY snapshot_date
ORDER BY snapshot_date DESC;
```

### Manual Snapshot Creation

If you need to create a snapshot outside the weekly schedule:

```sql
INSERT INTO cpg_reporting_sandbox.default.planning_unit_stage_historical
SELECT 
  CURRENT_DATE() as snapshot_date,
  *
FROM cpg_reporting_sandbox.default.planning_unit_stage_current;
```

### Manual Cleanup

To manually delete old snapshots:

```sql
DELETE FROM cpg_reporting_sandbox.default.planning_unit_stage_historical
WHERE snapshot_date < DATE_SUB(CURRENT_DATE(), 30);
```

### Changing Retention Period

To change the 30-day retention:

1. Edit `weekly_snapshot_job.py`
2. Change `RETENTION_DAYS = 30` to your desired value
3. Re-upload the notebook to Databricks

---

## Troubleshooting

### Problem: "No historical data found" when downloading

**Possible Causes:**
1. Historical table is empty (no snapshots taken yet)
2. All snapshots are older than 30 days (deleted by cleanup)

**Solutions:**
- Run the snapshot job manually (see Step 4 above)
- Check if table exists: `SHOW TABLES IN cpg_reporting_sandbox.default LIKE 'planning_unit_stage_historical';`
- Verify data: `SELECT COUNT(*) FROM cpg_reporting_sandbox.default.planning_unit_stage_historical;`

### Problem: Snapshot job fails

**Check job logs:**
1. Go to Databricks Workflows
2. Click on the job
3. View the "Runs" tab
4. Click on the failed run
5. Check the error message

**Common issues:**
- Table doesn't exist → Run `create_historical_table.sql`
- Permission error → Ensure user has INSERT and DELETE permissions
- Source table not found → Check `planning_unit_stage_current` exists

### Problem: Download button does nothing

**Check browser console:**
1. Open browser DevTools (F12)
2. Click "Console" tab
3. Click the download button
4. Look for error messages

**Common issues:**
- API endpoint error → Check Flask logs
- Database not connected → Verify Databricks credentials in `app.yaml`
- Empty response → Ensure historical table has data

### Problem: Excel file is corrupted or won't open

**Possible Causes:**
- Server error during file generation
- Network interruption during download

**Solutions:**
- Try downloading again
- Check Flask backend logs for errors
- Verify `openpyxl` is installed: `pip list | grep openpyxl`

### Problem: Historical data is missing recent approvals

**Explanation:**
- Snapshots are only taken weekly (Sundays at 2 AM)
- Approvals made after the last snapshot won't appear in historical data until the next snapshot

**To include recent approvals:**
- Run a manual snapshot (see "Manual Snapshot Creation" above)
- Or wait until the next scheduled snapshot

---

## Data Retention Policy

### Default Settings

- **Snapshot Frequency:** Weekly (every Sunday)
- **Retention Period:** 30 days
- **Approximate Snapshots:** 4-5 weeks of data
- **Automatic Cleanup:** Yes (old snapshots deleted each week)

### Storage Considerations

**Estimated Storage:**
- Assume 10,000 records per snapshot
- 5 snapshots retained (30 days / 7 days)
- Total: ~50,000 historical records
- Storage: Minimal (Delta Lake compression)

**To reduce storage:**
- Decrease retention period in `weekly_snapshot_job.py`
- Manually delete specific snapshots if needed

---

## Security Considerations

### Data Access

- Historical data uses the same Databricks credentials as current data
- No additional permissions required
- Download feature respects existing authentication

### Audit Trail

Historical snapshots provide:
- **Change Tracking:** See what recommendations were made each week
- **Approval History:** Track which items were approved/denied over time
- **Data Validation:** Compare current vs. historical data for accuracy

---

## Support

For issues or questions:
- **Contact:** kevin.bellefeuil@gapac.com
- **Documentation:** See README.md and THREAT_MODEL.md
- **Databricks Support:** Contact your Databricks administrator

---

## Related Files

- `create_historical_table.sql` - Table creation script
- `weekly_snapshot_job.py` - Databricks notebook for snapshots
- `app.py` - Backend with download endpoint
- `src/App.jsx` - Frontend with download button
- `requirements.txt` - Python dependencies (includes openpyxl)
