# Deployment Guide - IBP Master Data Automation (Databricks Apps)

## Overview

This application is designed with **graceful degradation** - it will work even if database connectivity fails by falling back to sample data. This ensures maximum reliability during deployment.

## Architecture

- **Phase 1**: Starts with sample data (guaranteed to work)
- **Phase 2**: Attempts database connection with fallback
- **Phase 3**: Full database operations with comprehensive error handling

## Pre-Deployment Checklist

### 1. Verify React Frontend is Built

```powershell
cd "C:\Users\kevinb27\OneDrive - kochind.com\Documents\Emerging Technology - L&D\Master Data Automation"

# Check if dist/ folder exists
Test-Path dist/

# If not, build it:
npm install
npm run build
```

### 2. Verify Required Files

Ensure these files are present:
- ✅ `app.py` - Flask backend with database fallback
- ✅ `app.yaml` - Databricks Apps configuration
- ✅ `requirements.txt` - Python dependencies
- ✅ `dist/` - Built React frontend
- ✅ `.gitignore` - Excludes unnecessary files

## Deployment Steps

### Step 1: Navigate to Project Directory

```powershell
cd "C:\Users\kevinb27\OneDrive - kochind.com\Documents\Emerging Technology - L&D\Master Data Automation"
```

### Step 2: Full Clean Deployment (Recommended)

```powershell
# Delete existing workspace (if any issues)
databricks workspace delete /Workspace/Users/kevin.bellefeuil@gapac.com/master-data-automation --recursive

# Sync all files
databricks sync . /Workspace/Users/kevin.bellefeuil@gapac.com/master-data-automation

# Deploy the app
databricks apps deploy master-data-automation --source-code-path /Workspace/Users/kevin.bellefeuil@gapac.com/master-data-automation
```

### Step 3: Verify Deployment

After deployment completes, the CLI will show the app URL. Open it in your browser.

#### Test Endpoints:

1. **Health Check**: `https://your-app-url/api/health`
   - Should return: `{"status": "ok", "mode": "database" or "sample_data"}`

2. **Connection Test**: `https://your-app-url/api/test-connection`
   - Tests Databricks SQL connection
   - Returns success/failure status

3. **Frontend**: `https://your-app-url/`
   - Should load the IBP Master Data interface

## Deployment Modes

### Mode 1: Sample Data (No Database)

If Databricks credentials are not configured, the app will:
- ✅ Start successfully
- ✅ Show sample data in the UI
- ✅ Accept approve/deny actions (mock)
- ⚠️ Not persist data to database

**Use Case**: Testing deployment, verifying frontend works

### Mode 2: Database Connected

If Databricks credentials are configured in `app.yaml`, the app will:
- ✅ Connect to `cpg_rpt_dev.default.planning_unit_stage_subset`
- ✅ Load real data
- ✅ Persist approve/deny actions to database
- ✅ Fall back to sample data if database fails

**Use Case**: Production deployment

## Configuration

### Databricks Credentials (Optional)

Credentials are configured in `app.yaml`:

```yaml
env:
  - name: DATABRICKS_SERVER_HOSTNAME
    value: "{{secrets.DATABRICKS_SERVER_HOSTNAME}}"
  - name: DATABRICKS_HTTP_PATH
    value: "{{secrets.DATABRICKS_HTTP_PATH}}"
  - name: DATABRICKS_TOKEN
    value: "{{secrets.DATABRICKS_TOKEN}}"
```

**To set up secrets:**

1. Go to Databricks workspace
2. Navigate to Settings > Secrets
3. Create secrets with these names:
   - `DATABRICKS_SERVER_HOSTNAME`
   - `DATABRICKS_HTTP_PATH`
   - `DATABRICKS_TOKEN`

## Troubleshooting

### Issue: App shows old version after deployment

**Solution:**
```powershell
# Full clean and redeploy
databricks workspace delete /Workspace/Users/kevin.bellefeuil@gapac.com/master-data-automation --recursive
databricks sync . /Workspace/Users/kevin.bellefeuil@gapac.com/master-data-automation
databricks apps deploy master-data-automation --source-code-path /Workspace/Users/kevin.bellefeuil@gapac.com/master-data-automation
```

### Issue: "DIST directory not found" error

**Solution:**
```powershell
# Build the React frontend
npm install
npm run build

# Verify dist/ was created
Test-Path dist/

# Redeploy
databricks sync . /Workspace/Users/kevin.bellefeuil@gapac.com/master-data-automation
databricks apps deploy master-data-automation --source-code-path /Workspace/Users/kevin.bellefeuil@gapac.com/master-data-automation
```

### Issue: "File too large" error

**Solution:**
- Check `.gitignore` excludes large files
- Remove any Excel files or large data files
- Only sync necessary files

### Issue: Database connection fails

**Solution:**
- App will automatically fall back to sample data
- Check `/api/health` endpoint to see current mode
- Use `/api/test-connection` to diagnose connection issues
- Verify secrets are configured correctly in Databricks

### Issue: "Error loading app spec from app.yaml"

**Solution:**
```powershell
# Verify app.yaml format is correct
Get-Content app.yaml

# Should show:
# command: ["python", "app.py"]
# env: ...

# If incorrect, re-sync
databricks workspace import app.yaml /Workspace/Users/kevin.bellefeuil@gapac.com/master-data-automation/app.yaml --overwrite
```

## Monitoring

### View App Logs

```powershell
# View recent logs
databricks apps logs master-data-automation --tail-lines 100

# Follow logs in real-time
databricks apps logs master-data-automation --follow
```

### Key Log Messages

- `"Database mode: ENABLED"` - Database connection configured
- `"Database mode: DISABLED (using sample data)"` - Running in fallback mode
- `"Retrieved X records from Databricks"` - Successfully reading from database
- `"Returning X sample records (fallback)"` - Using sample data

## Testing Checklist

After deployment, verify:

- [ ] `/api/health` returns 200 OK
- [ ] Frontend loads at root URL
- [ ] Data table displays (sample or real data)
- [ ] Filters work (Product, Location, etc.)
- [ ] Approve/Deny toggles work
- [ ] Submit button shows success message
- [ ] `/api/test-connection` (if database configured)

## Rollback

If deployment fails:

```powershell
# Redeploy previous working version
databricks apps deploy master-data-automation --source-code-path /Workspace/Users/kevin.bellefeuil@gapac.com/master-data-automation-backup
```

## Support

For issues:
1. Check app logs: `databricks apps logs master-data-automation --tail-lines 100`
2. Test health endpoint: `curl https://your-app-url/api/health`
3. Verify files synced: `databricks workspace list /Workspace/Users/kevin.bellefeuil@gapac.com/master-data-automation`
