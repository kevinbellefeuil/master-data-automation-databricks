# ⚠️ TODO: Configure Databricks Secrets

## Current Status

✅ **App is running in SAMPLE DATA MODE**

The app is currently working with 8 hardcoded sample records. To enable **full database connectivity** with real data from `cpg_rpt_dev.default.planning_unit_stage_subset`, you need to configure Databricks Secrets.

## Why This is Needed

Right now the app:
- ✅ Works perfectly with sample data
- ✅ All UI features functional
- ✅ No database connection needed
- ⚠️ Does NOT persist approve/deny actions
- ⚠️ Does NOT show real data from Databricks table

## Steps to Enable Database Mode

### Step 1: Get Your Databricks Connection Details

You'll need three values:

1. **DATABRICKS_SERVER_HOSTNAME**
   - Example: `your-workspace.cloud.databricks.com`
   - Find it in your Databricks workspace URL

2. **DATABRICKS_HTTP_PATH**
   - Example: `/sql/1.0/warehouses/abc123def456`
   - Find it in: Workspace → SQL Warehouses → Select warehouse → Connection details

3. **DATABRICKS_TOKEN**
   - Personal Access Token (PAT)
   - Create it in: User Settings → Developer → Access tokens → Generate new token

### Step 2: Create Secrets in Databricks

There are two ways to do this:

#### Option A: Using Databricks UI

1. Go to your Databricks workspace
2. Navigate to **Settings** → **Secrets**
3. Create a new secret scope (if needed)
4. Add these three secrets:
   - `DATABRICKS_SERVER_HOSTNAME`
   - `DATABRICKS_HTTP_PATH`
   - `DATABRICKS_TOKEN`

#### Option B: Using Databricks CLI

```powershell
# Create a secret scope (first time only)
databricks secrets create-scope --scope master-data-app

# Add the secrets
databricks secrets put --scope master-data-app --key DATABRICKS_SERVER_HOSTNAME
databricks secrets put --scope master-data-app --key DATABRICKS_HTTP_PATH
databricks secrets put --scope master-data-app --key DATABRICKS_TOKEN
```

### Step 3: Update app.yaml

Once secrets are created, update your `app.yaml`:

```yaml
command: ["python", "app.py"]
env:
  - name: DATABRICKS_SERVER_HOSTNAME
    value: "{{secrets.master-data-app.DATABRICKS_SERVER_HOSTNAME}}"
  - name: DATABRICKS_HTTP_PATH
    value: "{{secrets.master-data-app.DATABRICKS_HTTP_PATH}}"
  - name: DATABRICKS_TOKEN
    value: "{{secrets.master-data-app.DATABRICKS_TOKEN}}"
```

**Note:** Replace `master-data-app` with your actual secret scope name.

### Step 4: Redeploy

```powershell
cd "C:\Users\kevinb27\OneDrive - kochind.com\Documents\Emerging Technology - L&D\Master Data Hello World"

# Sync updated app.yaml
databricks sync . /Workspace/Users/kevin.bellefeuil@gapac.com/master-data-hello-world

# Redeploy
databricks apps deploy master-data-hello-world --source-code-path /Workspace/Users/kevin.bellefeuil@gapac.com/master-data-hello-world
```

### Step 5: Verify Database Mode

After redeploying, test the connection:

```bash
# Health check should show "database" mode
curl https://your-app-url/api/health

# Expected response:
# {"status": "ok", "mode": "database", "databricks_configured": true}

# Test database connection
curl https://your-app-url/api/test-connection

# Expected response:
# {"connection": "success", "message": "Connection successful"}
```

## Benefits of Database Mode

Once configured, your app will:
- ✅ Load real data from `cpg_rpt_dev.default.planning_unit_stage_subset`
- ✅ Persist approve/deny decisions back to the table
- ✅ Show all actual planning unit records
- ✅ Still fall back to sample data if connection fails (graceful degradation)

## Current Mode Detection

You can always check which mode the app is running in:

```bash
curl https://master-data-hello-world-7474651656877109.aws.databricksapps.com/api/health
```

**Sample Data Mode Response:**
```json
{
  "status": "ok",
  "mode": "sample_data",
  "databricks_configured": false,
  "message": "Running in sample_data mode"
}
```

**Database Mode Response:**
```json
{
  "status": "ok",
  "mode": "database",
  "databricks_configured": true,
  "message": "Running in database mode"
}
```

## No Rush!

The app works great in sample data mode for:
- ✅ Testing the UI
- ✅ Demonstrating functionality
- ✅ Training users
- ✅ Development and iteration

Configure database connectivity when you're ready to:
- Connect to production data
- Persist approval decisions
- Use with real planning unit records

---

**Remember:** The app is designed to work reliably in BOTH modes. Configure secrets when you're ready! 🎉
