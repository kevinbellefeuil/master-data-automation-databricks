# Databricks Apps Deployment Guide
## From Local Development in Cursor to Production in Databricks

---

## Table of Contents
1. [High-Level Overview](#part-1-high-level-overview)
2. [Detailed Walkthrough](#part-2-detailed-walkthrough)
3. [Architecture Diagram](#part-3-architecture-diagram)
4. [Troubleshooting Guide](#part-4-troubleshooting-guide)
5. [Security Best Practices](#part-5-security-best-practices)
6. [UI Navigation Reference](#part-6-ui-navigation-reference)
7. [Quick Reference](#part-7-quick-reference)

---

# Part 1: High-Level Overview

## What are Databricks Apps?

Databricks Apps is a platform for deploying full-stack web applications directly within your Databricks workspace. It allows you to:
- Build interactive dashboards and data applications
- Connect directly to Databricks tables and SQL warehouses
- Deploy Python (Flask, FastAPI) backends with React/Vue frontends
- Manage secrets securely for database connections
- Scale applications within your Databricks environment

## Development Workflow

```mermaid
flowchart LR
    A[Local Development<br/>Cursor IDE] --> B[Build Frontend<br/>npm run build]
    B --> C[Databricks Sync<br/>Upload Files]
    C --> D[Databricks Apps<br/>Deploy]
    D --> E[Running App<br/>Access via URL]
    E --> F[SQL Warehouse<br/>Query Tables]
    
    G[Code Changes] --> B
    E --> H[View Logs<br/>Debug Issues]
    H --> G
```

## Key Concepts Summary

| Concept | Description |
|---------|-------------|
| **Local Development** | Build and test your app in Cursor with Python, React, etc. |
| **app.yaml** | Configuration file defining startup command, environment variables, resources |
| **Databricks CLI** | Command-line tool for syncing files and deploying apps |
| **Databricks Sync** | Uploads your local files to Databricks workspace |
| **Databricks Secrets** | Secure storage for credentials (tokens, passwords) |
| **SQL Warehouse** | Compute resource for running SQL queries against tables |
| **Unity Catalog** | Data governance layer organizing databases and tables |

## 5-Minute Quick Start Checklist

- [ ] Install Databricks CLI: `pip install databricks-cli`
- [ ] Authenticate: `databricks configure --token`
- [ ] Create `app.yaml` with startup command
- [ ] Create `requirements.txt` with Python dependencies
- [ ] Build frontend: `npm run build` (if using React/Vue)
- [ ] Sync files: `databricks sync . /Workspace/Users/your.email@company.com/app-name`
- [ ] Deploy: `databricks apps deploy app-name --source-code-path /Workspace/Users/your.email@company.com/app-name`
- [ ] Access app URL from Databricks UI

---

# Part 2: Detailed Walkthrough

## Section 1: Prerequisites & Setup

### Install Databricks CLI (Latest Version)

**Windows:**
```powershell
# Install via pip (recommended)
pip install databricks-cli

# Verify installation
databricks --version
```

**Mac/Linux:**
```bash
# Install via pip
pip install databricks-cli

# Or use Homebrew (Mac)
brew install databricks
```

> **Note:** If you have an older CLI version installed, uninstall it first:
> ```powershell
> pip uninstall databricks-cli
> pip install databricks-cli
> ```

### Configure Workspace Authentication

1. Get your Databricks workspace URL (e.g., `https://dbc-xxxxx.cloud.databricks.com`)
2. Generate a personal access token (see Section 4)
3. Run authentication command:

```powershell
databricks configure --token
```

You'll be prompted for:
- **Databricks Host**: Your workspace URL
- **Token**: Your personal access token

### Set Up Local Development Environment

**Required Tools:**
- **Python 3.8+**: Backend development (Flask, FastAPI)
- **Node.js 18+**: Frontend development (React, Vue) - optional
- **Git**: Version control
- **Cursor IDE**: Code editor with AI assistance

**Verify installations:**
```powershell
python --version
node --version
git --version
```

---

## Section 2: Local Development in Cursor

### Project Structure Best Practices

```
my-databricks-app/
├── app.py                    # Backend (Flask/FastAPI)
├── app.yaml                  # Databricks Apps config
├── requirements.txt          # Python dependencies
├── .gitignore               # Exclude node_modules, venv, etc.
├── README.md                # Project documentation
├── dist/                    # Built frontend (React/Vue)
│   ├── index.html
│   ├── assets/
│   │   ├── index-xxxxx.js
│   │   └── index-xxxxx.css
├── src/                     # Frontend source (before build)
│   ├── App.jsx
│   ├── components/
│   └── styles/
└── vite.config.js          # Frontend build config
```

> **Important:** Only sync the `dist/` folder to Databricks, not `src/` or `node_modules/`

### Creating app.yaml

The `app.yaml` file tells Databricks Apps how to run your application.

**Basic Template:**
```yaml
# app.yaml
command: ["python", "app.py"]

env:
  - name: FLASK_APP
    value: app.py
  - name: FLASK_ENV
    value: production
  - name: DATABRICKS_SERVER_HOSTNAME
    value: dbc-xxxxx.cloud.databricks.com
  - name: DATABRICKS_HTTP_PATH
    value: /sql/1.0/warehouses/xxxxx
  - name: DATABRICKS_TOKEN
    value: dapixxxxxxxxxxx
```

**Required Fields:**
- `command`: Array of strings defining the startup command
- `env`: List of environment variables (name/value pairs)

**Best Practice:** Use `app.yaml.local` for local testing with real credentials, and add it to `.gitignore`

### Creating requirements.txt

List all Python dependencies your app needs:

```txt
# requirements.txt
Flask==3.0.0
requests==2.31.0
openpyxl==3.1.2
gunicorn==21.2.0
```

### Building Frontend (React + Vite Example)

If you're using React/Vue for the frontend:

```powershell
# Install dependencies
npm install

# Build for production (creates dist/ folder)
npm run build
```

The `dist/` folder contains optimized static files that Databricks Apps will serve.

### Testing Locally Before Deployment

**Start Flask backend:**
```powershell
python app.py
```

**Access locally:**
- Backend API: `http://localhost:5000`
- If serving React from Flask: `http://localhost:5000` serves the full app

**Test database connection:**
- Ensure environment variables are set
- Verify SQL queries return data
- Check error handling

---

## Section 3: Understanding app.yaml

### Required Fields

```yaml
command: ["python", "app.py"]  # REQUIRED: Startup command as array

env:  # OPTIONAL: Environment variables
  - name: VAR_NAME
    value: var_value
```

### Environment Variable Configuration

**Method 1: Direct Values (Not Recommended for Secrets)**
```yaml
env:
  - name: DATABASE_URL
    value: postgresql://user:pass@host/db  # BAD: Exposes credentials
```

**Method 2: Using Databricks Secrets (Recommended)**
```yaml
env:
  - name: DATABRICKS_TOKEN
    value: {{secrets.my-scope.token-key}}  # References secret scope
```

> **Note:** Secret substitution has known issues in some Databricks environments. Alternative: Set secrets via CLI and reference as environment variables in your Python code.

### Resource Allocation

```yaml
command: ["python", "app.py"]

resources:
  memory: 2Gi      # Memory allocation
  cpu: 1           # CPU cores

env:
  - name: APP_PORT
    value: "8080"
```

### Common Patterns and Examples

**Flask App:**
```yaml
command: ["python", "app.py"]

env:
  - name: FLASK_APP
    value: app.py
  - name: FLASK_ENV
    value: production
```

**FastAPI with Gunicorn:**
```yaml
command: ["gunicorn", "-w", "4", "-b", "0.0.0.0:8080", "app:app"]

env:
  - name: WORKERS
    value: "4"
```

---

## Section 4: Databricks CLI Setup & Authentication

### Installation Commands for Windows

```powershell
# Install Databricks CLI
pip install databricks-cli

# Verify installation
databricks --version
# Should show: Version x.x.x
```

### Running databricks configure --token

```powershell
databricks configure --token
```

**You'll be prompted for:**
1. **Databricks Host**: `https://dbc-xxxxx.cloud.databricks.com`
2. **Token**: `dapixxxxxxxxxxxxxxxxxxx` (paste your access token)

This creates a config file at `~/.databrickscfg`:
```ini
[DEFAULT]
host = https://dbc-xxxxx.cloud.databricks.com
token = dapixxxxxxxxxxxxxxxxxxx
```

### Finding Your Workspace URL

**Method 1: From Browser**
- Log into Databricks
- Copy the URL from the address bar (e.g., `https://dbc-03f4b243-5447.cloud.databricks.com`)

**Method 2: From Databricks UI**
- Click your user icon (top right)
- Select "Settings"
- Look for "Workspace URL"

### Generating Personal Access Tokens

**Steps:**
1. Click your **user icon** (top right corner)
2. Select **"User Settings"**
3. Go to **"Developer"** tab
4. Click **"Manage"** next to "Access tokens"
5. Click **"Generate new token"**
6. Set:
   - **Comment**: "Databricks Apps CLI"
   - **Lifetime**: 90 days (or custom)
7. Click **"Generate"**
8. **Copy the token immediately** (you won't see it again!)

> **Screenshot Placeholder:** `[Insert screenshot: User Settings → Developer → Generate Token]`

### Verifying CLI Connection

```powershell
# Test connection
databricks workspace ls /Users

# Should list workspace folders
# If successful, you're authenticated!
```

---

## Section 5: Connecting Apps to Databricks Tables

### Understanding Secrets

**Why Secrets are Needed:**
- **Security**: Credentials never stored in code or Git
- **Rotation**: Update credentials without redeploying app
- **Access Control**: Limit who can view sensitive data
- **Compliance**: Meet regulatory requirements (SOC 2, GDPR)

**Where Credentials Should NEVER Go:**
- ❌ Hardcoded in `app.py` or other source files
- ❌ Committed to Git repositories
- ❌ Stored in `app.yaml` (without secret references)
- ❌ Plain text in environment variables

**Creating Secrets via Databricks CLI:**

```powershell
# Create a secret scope
databricks secrets create-scope --scope my-app-secrets

# Add secrets to the scope
databricks secrets put-secret --scope my-app-secrets --key databricks-token --string-value "dapixxxxxxxxxxx"
databricks secrets put-secret --scope my-app-secrets --key db-hostname --string-value "dbc-xxxxx.cloud.databricks.com"
databricks secrets put-secret --scope my-app-secrets --key http-path --string-value "/sql/1.0/warehouses/xxxxx"
```

### Finding Connection Information

#### 1. Hostname

**Location:** Databricks UI → **Compute** → **SQL Warehouses** → Select your warehouse → **Connection details** tab

**Format:** `dbc-xxxxx-xxxx.cloud.databricks.com` (without `https://`)

> **Screenshot Placeholder:** `[Insert screenshot: SQL Warehouses → Connection Details → Server hostname]`

#### 2. HTTP Path

**Location:** Same as Hostname (Connection details tab)

**Format:** `/sql/1.0/warehouses/xxxxxxxxxxxxxx`

This identifies which SQL warehouse your app will use for queries.

> **Screenshot Placeholder:** `[Insert screenshot: SQL Warehouses → Connection Details → HTTP path]`

#### 3. Access Token

**Location:** User Settings → **Developer** → **Access tokens** → Generate new token

**Format:** `dapixxxxxxxxxxxxxxxxxxxxxxxxxxx` (long alphanumeric string)

**Security Note:** Treat this like a password. Never commit to Git.

> **Screenshot Placeholder:** `[Insert screenshot: User Settings → Developer → Generate Access Token]`

### Connection Methods

#### Option 1: Databricks REST API (Recommended)

Uses the Databricks SQL Statement Execution API for reliable connectivity.

**Advantages:**
- No driver installation issues
- Works in any environment
- Better error messages
- Handles large result sets

**Example Code (Python):**
```python
import requests
import os
import logging

logger = logging.getLogger(__name__)

class DatabricksHandler:
    def __init__(self):
        self.server_hostname = os.getenv('DATABRICKS_SERVER_HOSTNAME')
        self.http_path = os.getenv('DATABRICKS_HTTP_PATH')
        self.token = os.getenv('DATABRICKS_TOKEN')
        
        # Extract warehouse_id from http_path
        self.warehouse_id = self.http_path.split('/')[-1] if self.http_path else None
        
        self.connection_available = all([
            self.server_hostname,
            self.warehouse_id,
            self.token
        ])
    
    def _execute_sql(self, query):
        """Execute SQL via Databricks REST API"""
        url = f'https://{self.server_hostname}/api/2.0/sql/statements'
        
        headers = {
            'Authorization': f'Bearer {self.token}',
            'Content-Type': 'application/json'
        }
        
        payload = {
            'statement': query,
            'warehouse_id': self.warehouse_id,
            'wait_timeout': '50s',  # Max allowed by Databricks
            'format': 'JSON_ARRAY'
        }
        
        response = requests.post(url, json=payload, headers=headers)
        response.raise_for_status()
        
        return response.json()
    
    def read_data(self):
        """Read data from Databricks table"""
        table_name = "cpg_reporting_sandbox.default.planning_unit_stage_current"
        query = f"SELECT * FROM {table_name} WHERE Approval_Status IS NULL LIMIT 5000"
        
        try:
            result = self._execute_sql(query)
            data = []
            
            if result.get('result') and result['result'].get('data_array'):
                columns = [col['name'] for col in result['manifest']['schema']['columns']]
                for row_array in result['result']['data_array']:
                    row_dict = {}
                    for i, col_name in enumerate(columns):
                        row_dict[col_name] = row_array[i]
                    data.append(row_dict)
            
            logger.info(f'Retrieved {len(data)} records from Databricks')
            return data
        except Exception as e:
            logger.error(f'Error reading from Databricks: {str(e)}')
            raise
```

**Flask Route Example:**
```python
from flask import Flask, jsonify

app = Flask(__name__)

@app.route('/api/data', methods=['GET'])
def get_data():
    try:
        db_handler = DatabricksHandler()
        
        if not db_handler.connection_available:
            return jsonify({
                'status': 'error',
                'message': 'Database connection not configured'
            }), 500
        
        data = db_handler.read_data()
        return jsonify({
            'status': 'ok',
            'data': data,
            'mode': 'database'
        })
    except Exception as e:
        return jsonify({
            'status': 'error',
            'message': str(e)
        }), 500
```

#### Option 2: databricks-sql-connector Library

Uses the official Databricks SQL connector.

**Advantages:**
- Official Databricks library
- Simpler API for basic queries
- Connection pooling built-in

**Disadvantages:**
- Requires compiled dependencies
- Can have build issues in Databricks Apps environment

**Example Code:**
```python
from databricks import sql
import os

def get_connection():
    return sql.connect(
        server_hostname=os.getenv('DATABRICKS_SERVER_HOSTNAME'),
        http_path=os.getenv('DATABRICKS_HTTP_PATH'),
        access_token=os.getenv('DATABRICKS_TOKEN')
    )

def read_data():
    connection = get_connection()
    cursor = connection.cursor()
    
    query = "SELECT * FROM cpg_reporting_sandbox.default.planning_unit_stage_current LIMIT 1000"
    cursor.execute(query)
    
    columns = [desc[0] for desc in cursor.description]
    data = []
    
    for row in cursor.fetchall():
        row_dict = dict(zip(columns, row))
        data.append(row_dict)
    
    cursor.close()
    connection.close()
    
    return data
```

**requirements.txt:**
```txt
databricks-sql-connector>=2.9.0
```

---

## Section 6: Syncing Files to Databricks

### Using databricks sync Command

**Basic Syntax:**
```powershell
databricks sync <local-path> <workspace-path>
```

**Example:**
```powershell
cd "C:\Users\your-name\Documents\my-databricks-app"

databricks sync . /Workspace/Users/your.email@company.com/my-app
```

**What happens:**
- Uploads all files from current directory to Databricks workspace
- Creates workspace folder if it doesn't exist
- Skips files listed in `.gitignore`
- Shows progress for each file uploaded

### Understanding .gitignore for Sync Exclusions

The `databricks sync` command respects `.gitignore` rules.

**Recommended .gitignore:**
```gitignore
# Python
__pycache__/
*.py[cod]
*$py.class
venv/
.env

# Node.js
node_modules/
npm-debug.log*

# Build artifacts (DO NOT ignore dist/ - it needs to be synced!)
# dist/  # ❌ Don't ignore this for Databricks Apps

# Local config with secrets
app.yaml.local

# IDE
.vscode/
.idea/

# OS
.DS_Store
Thumbs.db

# Large data files
data/*.xlsx
data/*.csv
*.parquet
```

> **Important:** Make sure `dist/` is NOT in `.gitignore` if you're deploying a React app!

### Watching for Changes with --watch Flag

**Continuous sync (updates on file changes):**
```powershell
databricks sync --watch . /Workspace/Users/your.email@company.com/my-app
```

**Use cases:**
- Active development with frequent changes
- Automatic re-sync when you save files in Cursor
- Keeps workspace folder up-to-date

**To stop:** Press `Ctrl+C`

### Verifying Files Uploaded Correctly

**List workspace files via CLI:**
```powershell
databricks workspace ls /Workspace/Users/your.email@company.com/my-app
```

**Expected output:**
```
.gitignore
README.md
app.py
app.yaml
requirements.txt
dist/
```

**Or check in Databricks UI:**
1. Go to **Workspace** in left sidebar
2. Navigate to `/Users/your.email@company.com/my-app`
3. Verify all files are present

### Common Sync Issues

**Issue 1: File Size Exceeds 10MB Limit**
```
Error: File data/PLANNING_UNIT_STAGE.xlsx is larger than the maximum allowed file size of 10485760 bytes
```

**Solution:**
- Remove large data files from sync
- Add them to `.gitignore`
- Load data from Databricks tables instead

**Issue 2: Path Not Found**
```
Error: Path (/Workspace/Users/...) doesn't exist
```

**Solution:**
- Create the folder first: `databricks workspace mkdirs /Workspace/Users/your.email@company.com/my-app`
- Or let `databricks sync` create it automatically on first run

**Issue 3: Files Showing as "skipped; already exists"**

**Solution:**
- Delete workspace folder and re-sync:
```powershell
databricks workspace delete /Workspace/Users/your.email@company.com/my-app --recursive
databricks sync . /Workspace/Users/your.email@company.com/my-app
```

---

## Section 7: Deploying Apps

### databricks apps deploy Command Breakdown

**Basic Syntax:**
```powershell
databricks apps deploy <app-name> --source-code-path <workspace-path>
```

**Example:**
```powershell
databricks apps deploy my-databricks-app --source-code-path /Workspace/Users/your.email@company.com/my-app
```

**Parameters:**
- `<app-name>`: Unique name for your app (lowercase, hyphens allowed)
- `--source-code-path`: Workspace folder containing `app.yaml` and app files

### Deployment Process Stages

When you run `databricks apps deploy`, it goes through these stages:

1. **Preparing source code**: Validates files in workspace path
2. **Building app**: 
   - Installs Python dependencies from `requirements.txt`
   - Runs `npm build` if `package.json` detected (avoid this!)
3. **Uploading artifacts**: Creates deployment package
4. **Starting app**: Runs command specified in `app.yaml`

**Progress output:**
```
⡿ Preparing source code for new app deployment
✓ Building app completed successfully
✓ Starting app
✓ App deployed successfully!
```

### Accessing Your Deployed App URL

After successful deployment:

1. Go to Databricks UI
2. Click **Apps** in left sidebar (under "Machine Learning")
3. Find your app in the list
4. Click the app name
5. Copy the **App URL**: `https://dbc-xxxxx.cloud.databricks.com/serving-endpoints/your-app/app/`

**Or get URL via CLI:**
```powershell
databricks apps get my-databricks-app
```

Look for the `url` field in the output.

### Viewing App Logs for Debugging

**Via CLI (recommended for troubleshooting):**
```powershell
databricks apps logs my-databricks-app --tail-lines 100
```

**Via Databricks UI:**
1. Go to **Apps** → Your app
2. Click **"Logs"** tab
3. View real-time logs

**Log types:**
- `SYSTEM`: Databricks infrastructure messages (startup, crashes)
- `APP`: Your application's stdout/stderr (print statements, logger output)

**Common log messages:**
```
[INFO] Starting app with command: [python, app.py]
[INFO] * Running on http://0.0.0.0:8080
[ERROR] Could not start app. app crashed unexpectedly
```

### Updating Existing Apps (Redeploy Process)

**Step 1: Make code changes locally in Cursor**

**Step 2: Sync updated files**
```powershell
databricks sync . /Workspace/Users/your.email@company.com/my-app
```

**Step 3: Redeploy (same command as initial deploy)**
```powershell
databricks apps deploy my-databricks-app --source-code-path /Workspace/Users/your.email@company.com/my-app
```

**What happens:**
- Stops the currently running app
- Rebuilds with new code
- Restarts the app
- Same URL remains (no need to update bookmarks)

**If deployment fails:**
- App may be in FAILED state
- Stop and restart: 
```powershell
databricks apps stop my-databricks-app
databricks apps start my-databricks-app
```

---

# Part 3: Architecture Diagram

## End-to-End Data Flow

```mermaid
flowchart TB
    subgraph LocalDev [Local Development - Cursor IDE]
        A1[Write Code<br/>app.py, React components]
        A2[Build Frontend<br/>npm run build]
        A3[Create app.yaml<br/>requirements.txt]
        A1 --> A2
        A2 --> A3
    end
    
    subgraph DatabricksCLI [Databricks CLI]
        B1[databricks sync<br/>Upload files]
        B2[databricks apps deploy<br/>Deploy app]
    end
    
    subgraph DatabricksWorkspace [Databricks Workspace]
        C1[Workspace Folder<br/>/Users/your.email/my-app]
        C2[File Storage<br/>app.py, dist/, app.yaml]
    end
    
    subgraph DatabricksApps [Databricks Apps Runtime]
        D1[App Container<br/>Python + Flask]
        D2[Install Dependencies<br/>pip install -r requirements.txt]
        D3[Start App<br/>python app.py]
        D4[Web Server<br/>Flask on port 8080]
        D2 --> D3
        D3 --> D4
    end
    
    subgraph DataLayer [Data & Compute]
        E1[SQL Warehouse<br/>Query execution]
        E2[Unity Catalog<br/>Tables & governance]
        E3[Delta Tables<br/>planning_unit_stage_current]
    end
    
    subgraph UserAccess [User Access]
        F1[User Browser]
        F2[App URL<br/>https://dbc-xxxxx.../app/]
    end
    
    A3 --> B1
    B1 --> C1
    C1 --> C2
    C2 --> B2
    B2 --> D1
    D1 --> D2
    
    D4 -->|"HTTP API Calls<br/>Bearer Token Auth"| E1
    E1 --> E2
    E2 --> E3
    E3 -->|"Query Results<br/>JSON"| D4
    
    F1 --> F2
    F2 --> D4
    D4 -->|"HTML/JSON"| F2
    
    style LocalDev fill:#e1f5ff
    style DatabricksApps fill:#fff4e6
    style DataLayer fill:#f3e5f5
    style UserAccess fill:#e8f5e9
```

## Component Descriptions

| Component | Purpose | Key Files/Resources |
|-----------|---------|---------------------|
| **Local Development** | Write and test code in Cursor | `app.py`, `src/`, `app.yaml` |
| **Databricks CLI** | Sync files and deploy apps | Commands: `sync`, `apps deploy` |
| **Workspace Storage** | Stores app files in Databricks | `/Workspace/Users/.../my-app/` |
| **Apps Runtime** | Runs your app in a container | Python environment, Flask server |
| **SQL Warehouse** | Executes SQL queries | Configured via HTTP path |
| **Unity Catalog** | Organizes databases and tables | `catalog.schema.table` naming |
| **Delta Tables** | Stores actual data | ACID transactions, versioning |
| **User Browser** | Accesses deployed app | HTTPS URL with authentication |

---

# Part 4: Troubleshooting Guide

This section documents common errors encountered during Databricks Apps development and deployment, along with solutions.

## Error 1: CLI Version Conflicts

**Error Message:**
```
Databricks CLI v0.283.0 found at C:\Users\...\databricks.exe
Your current $PATH prefers running CLI v0.18.0 at C:\Users\...\Scripts\databricks.exe
Because both are installed and available in $PATH, I assume you are trying to run the newer version.
```

**Root Cause:**
- Two versions of Databricks CLI installed (old and new)
- Old version installed via pip in Python Scripts folder
- New version installed as standalone executable

**Solution:**
```powershell
# Uninstall old CLI
pip uninstall databricks-cli

# Keep the newer standalone version
# Verify only one version remains
databricks --version
```

**Prevention:**
- Use only one installation method (prefer standalone CLI)
- Regularly update CLI: `pip install --upgrade databricks-cli`

---

## Error 2: File Size Exceeds 10MB Limit

**Error Message:**
```
Error: File data/PLANNING_UNIT_STAGE.xlsx is larger than the maximum allowed file size of 10485760 bytes.
Please reduce the file size and try again.
```

**Root Cause:**
- Databricks Apps has a 10MB file size limit
- Large Excel/CSV files in your project folder
- These files are being synced to workspace

**Solution:**
```powershell
# 1. Remove large data files from project
rm -r data/

# 2. Add to .gitignore to prevent future syncs
echo "data/" >> .gitignore

# 3. Load data from Databricks tables instead
# Update app.py to query tables, not read files
```

**Prevention:**
- Never store large data files in app repository
- Use Databricks tables as the data source
- Add `data/`, `*.xlsx`, `*.csv` to `.gitignore`

---

## Error 3: dist/ Folder Not Syncing

**Error Message:**
```
App shows blank page or 404 errors for JavaScript/CSS files
```

**Root Cause:**
- `dist/` folder is in `.gitignore`
- `databricks sync` respects `.gitignore` and skips it
- Frontend files never uploaded to workspace

**Solution:**
```gitignore
# Edit .gitignore - Remove or comment out:
# dist/  # ❌ Remove this line

# Verify dist/ is NOT ignored
```

```powershell
# Delete workspace folder
databricks workspace delete /Workspace/Users/your.email@company.com/my-app --recursive

# Re-sync with dist/ included
databricks sync . /Workspace/Users/your.email@company.com/my-app
```

**Prevention:**
- For Databricks Apps, `dist/` must be synced (it's your built frontend)
- Only ignore `dist/` for local development repositories
- Always verify `dist/` uploads: `databricks workspace ls /Workspace/.../my-app/dist`

---

## Error 4: app.yaml Parsing Errors

**Error Message:**
```
[01f0f8a256311fd89921946b2a435009] Error deploying app: error loading app spec from app.yaml
```

**Root Cause:**
- Incorrect YAML syntax in `app.yaml`
- Common issues: wrong key names, improper indentation, incorrect value types

**Bad Examples:**
```yaml
# ❌ Wrong key name
cmd: python app.py

# ❌ Command as string instead of array
command: "python app.py"

# ❌ Improper indentation
env:
- name: VAR
  value: val
```

**Solution:**
```yaml
# ✅ Correct format
command: ["python", "app.py"]

env:
  - name: FLASK_APP
    value: app.py
  - name: PORT
    value: "8080"
```

**Validation:**
```powershell
# Verify YAML syntax online: https://www.yamllint.com/
# Or use Python:
python -c "import yaml; yaml.safe_load(open('app.yaml'))"
```

**Prevention:**
- Use the correct key: `command` (not `cmd`)
- Command must be an array: `["python", "app.py"]`
- Indent with 2 spaces, not tabs
- Validate YAML before deploying

---

## Error 5: "No Command to Run" Error

**Error Message:**
```
Error: failed to reach SUCCEEDED, got FAILED: No command to run. Please check your app.yaml file
```

**Root Cause:**
- `app.yaml` missing `command` field
- Or `command` field is empty/null
- Databricks Apps doesn't know how to start your app

**Solution:**
```yaml
# Add command field to app.yaml
command: ["python", "app.py"]

env:
  - name: FLASK_APP
    value: app.py
```

```powershell
# Re-sync and redeploy
databricks sync . /Workspace/Users/your.email@company.com/my-app
databricks apps deploy my-app --source-code-path /Workspace/Users/your.email@company.com/my-app
```

**Prevention:**
- Always include `command` field in `app.yaml`
- Test `app.yaml` syntax before deploying
- Keep a template `app.yaml` for reference

---

## Error 6: Active Deployment in Progress

**Error Message:**
```
Error: Cannot deploy app my-app as there is an active deployment in progress.
```

**Root Cause:**
- Previous deployment failed and left app in transitional state
- App is stuck in DEPLOYING or FAILED state
- Databricks won't start a new deployment until current one resolves

**Solution:**
```powershell
# Stop the app
databricks apps stop my-app

# Delete the app completely
databricks apps delete my-app

# Re-sync files
databricks sync . /Workspace/Users/your.email@company.com/my-app

# Deploy fresh
databricks apps deploy my-app --source-code-path /Workspace/Users/your.email@company.com/my-app
```

**Check app status:**
```powershell
databricks apps get my-app
# Look for "state": "RUNNING" | "FAILED" | "DEPLOYING"
```

**Prevention:**
- Always check logs if deployment fails: `databricks apps logs my-app --tail-lines 100`
- Fix errors before redeploying
- If stuck, delete and redeploy rather than retrying

---

## Error 7: npm Build Errors During Deployment

**Error Message:**
```
Error building app: error during npm build: exit status 1
```

**Root Cause:**
- Databricks Apps detects `package.json` and automatically runs `npm build`
- But `node_modules/` wasn't synced (correctly excluded by `.gitignore`)
- Build fails because dependencies are missing

**Solution:**

**Option A: Pre-build locally (Recommended)**
```powershell
# Build React app locally
npm run build

# Remove package.json and src/ from deployment
# Only sync dist/, app.py, app.yaml, requirements.txt

# Create .databricksignore
echo "package.json" >> .databricksignore
echo "src/" >> .databricksignore
echo "node_modules/" >> .databricksignore

# Sync and deploy
databricks sync . /Workspace/Users/your.email@company.com/my-app
databricks apps deploy my-app --source-code-path /Workspace/Users/your.email@company.com/my-app
```

**Option B: Remove frontend files from deployment**
```
Only upload to Databricks:
- app.py
- app.yaml
- requirements.txt
- dist/
- .gitignore

DO NOT upload:
- package.json
- vite.config.js
- src/
- node_modules/
```

**Prevention:**
- Always build frontend locally: `npm run build`
- Don't sync `package.json` or `src/` to Databricks
- Let Flask serve the pre-built `dist/` folder

---

## Error 8: Database Connection Failures

**Error Message:**
```
Failed to load data: Failed to fetch
```

**Or:**
```
Connection failed: 400 Client Error: Bad Request
```

**Root Cause:**
- Missing or incorrect Databricks connection credentials
- Environment variables not set in `app.yaml`
- Warehouse ID extracted incorrectly
- Network/firewall issues

**Solution Steps:**

**1. Verify environment variables in app.yaml:**
```yaml
env:
  - name: DATABRICKS_SERVER_HOSTNAME
    value: dbc-03f4b243-5447.cloud.databricks.com  # ✅ No https://
  - name: DATABRICKS_HTTP_PATH
    value: /sql/1.0/warehouses/2459b6c757e09896  # ✅ Full path
  - name: DATABRICKS_TOKEN
    value: dapixxxxxxxxxxxxxxxxxxx  # ✅ Valid token
```

**2. Test connection with /api/status endpoint:**
```python
# Add to app.py
@app.route('/api/status', methods=['GET'])
def status():
    return jsonify({
        'databricks_configured': db_handler.connection_available,
        'debug': {
            'server_configured': bool(db_handler.server_hostname),
            'token_configured': bool(db_handler.token),
            'warehouse_id': db_handler.warehouse_id
        }
    })
```

**3. Check logs for detailed errors:**
```powershell
databricks apps logs my-app --tail-lines 100
```

**Prevention:**
- Use `/api/status` endpoint to verify configuration
- Test database queries locally before deploying
- Validate credentials in Databricks UI (SQL Editor → Run test query)
- Use structured logging to capture detailed errors

---

## Error 9: Secret Substitution Not Working

**Error Message:**
```
warehouse_id: {{secrets.master-data-app.DATABRICKS_HTTP_PATH}}
# Secret placeholder not replaced with actual value
```

**Root Cause:**
- Databricks Apps secret substitution has known issues
- Placeholders like `{{secrets.scope.key}}` not being replaced at runtime
- Environment variables receive literal placeholder strings

**Solution:**

**Workaround: Hardcode values in app.yaml (for non-production) or use app.yaml.local:**

```yaml
# app.yaml.local (add to .gitignore)
command: ["python", "app.py"]

env:
  - name: DATABRICKS_SERVER_HOSTNAME
    value: dbc-03f4b243-5447.cloud.databricks.com  # Direct value
  - name: DATABRICKS_HTTP_PATH
    value: /sql/1.0/warehouses/2459b6c757e09896
  - name: DATABRICKS_TOKEN
    value: dapixxxxxxxxxxxxxxxxxxx  # Real token
```

```gitignore
# .gitignore
app.yaml.local  # ✅ Never commit this
```

**Deployment:**
```powershell
# Copy local config before syncing
cp app.yaml.local app.yaml

# Sync and deploy
databricks sync . /Workspace/Users/your.email@company.com/my-app
databricks apps deploy my-app --source-code-path /Workspace/Users/your.email@company.com/my-app

# Restore template app.yaml
git checkout app.yaml
```

**Prevention:**
- Document this workaround in README
- Use environment-specific config files
- Consider using Databricks secrets CLI to inject values via different method

---

## Error 10: wait_timeout Parameter Errors

**Error Message:**
```
Databricks API Error (400): {"error_code":"INVALID_PARAMETER_VALUE","message":"The wait_timeout field must be 0 seconds (disables wait), or between 5 seconds and 50 seconds."}
```

**Root Cause:**
- Databricks SQL Statement Execution API has strict timeout limits
- Maximum wait_timeout is 50 seconds
- Setting 60s (1 minute) causes validation error

**Solution:**
```python
# In your DatabricksHandler class
def _execute_sql(self, query):
    url = f'https://{self.server_hostname}/api/2.0/sql/statements'
    
    headers = {
        'Authorization': f'Bearer {self.token}',
        'Content-Type': 'application/json'
    }
    
    payload = {
        'statement': query,
        'warehouse_id': self.warehouse_id,
        'wait_timeout': '50s',  # ✅ Maximum allowed
        'format': 'JSON_ARRAY'
    }
    
    response = requests.post(url, json=payload, headers=headers)
    response.raise_for_status()
    
    return response.json()
```

**Valid wait_timeout values:**
- `'0s'` - No wait, return immediately (async)
- `'5s'` to `'50s'` - Synchronous wait
- ❌ `'60s'` or higher - Invalid

**Prevention:**
- Use 50s for most queries
- For long-running queries (>50s), use async mode (`wait_timeout: '0s'`) and poll for results

---

## General Troubleshooting Tips

### Check App Logs First
```powershell
databricks apps logs my-app --tail-lines 100
```

### Verify File Sync
```powershell
databricks workspace ls /Workspace/Users/your.email@company.com/my-app
```

### Test Local First
```powershell
python app.py
# Visit http://localhost:5000
```

### Clean Slate Redeploy
```powershell
# Full reset
databricks apps delete my-app
databricks workspace delete /Workspace/Users/your.email@company.com/my-app --recursive
databricks sync . /Workspace/Users/your.email@company.com/my-app
databricks apps deploy my-app --source-code-path /Workspace/Users/your.email@company.com/my-app
```

### Enable Debug Logging
```python
# Add to app.py
import logging
logging.basicConfig(level=logging.DEBUG)
```

---

# Part 5: Security Best Practices

## 1. Never Hardcode Secrets in Code

**Why:** Secrets in code can be exposed through version control history, decompilation, or accidental sharing.

**Bad Examples:**
```python
# ❌ NEVER do this
DATABRICKS_TOKEN = "dapixxxxxxxxxxxxxxxxxxx"
DATABASE_PASSWORD = "admin123"
API_KEY = "sk_live_abc123xyz789"
```

**Good Practice:**
```python
# ✅ Use environment variables
import os

DATABRICKS_TOKEN = os.getenv('DATABRICKS_TOKEN')
DATABASE_PASSWORD = os.getenv('DB_PASSWORD')
API_KEY = os.getenv('API_KEY')

# Validate secrets are present
if not DATABRICKS_TOKEN:
    raise ValueError("DATABRICKS_TOKEN environment variable not set")
```

---

## 2. Use Databricks Secrets for Credentials

**Create secret scope:**
```powershell
databricks secrets create-scope --scope my-app-secrets
```

**Add secrets:**
```powershell
databricks secrets put-secret --scope my-app-secrets --key db-token --string-value "dapixxx"
```

**Reference in app.yaml:**
```yaml
env:
  - name: DATABRICKS_TOKEN
    value: {{secrets.my-app-secrets.db-token}}
```

**Or fetch in Python:**
```python
# If running in Databricks notebook/job
from databricks.sdk.runtime import dbutils
token = dbutils.secrets.get(scope="my-app-secrets", key="db-token")
```

---

## 3. Create app.yaml.local for Local Testing

**Never commit secrets to Git!**

**Setup:**
```powershell
# Copy template
cp app.yaml app.yaml.local

# Edit app.yaml.local with real credentials
# Add to .gitignore
echo "app.yaml.local" >> .gitignore
```

**app.yaml (template for Git):**
```yaml
command: ["python", "app.py"]

env:
  - name: DATABRICKS_SERVER_HOSTNAME
    value: your-workspace.cloud.databricks.com  # Placeholder
  - name: DATABRICKS_TOKEN
    value: YOUR_TOKEN_HERE  # Placeholder
```

**app.yaml.local (real credentials, not committed):**
```yaml
command: ["python", "app.py"]

env:
  - name: DATABRICKS_SERVER_HOSTNAME
    value: dbc-03f4b243-5447.cloud.databricks.com  # Real value
  - name: DATABRICKS_TOKEN
    value: dapixxxxxxxxxxxxxxxxxxx  # Real token
```

---

## 4. Implement Input Validation

**Prevent SQL Injection:**

```python
# ❌ Bad - String concatenation
query = f"SELECT * FROM users WHERE username = '{user_input}'"

# ✅ Good - Parameterized queries (if using SQL connector)
cursor.execute("SELECT * FROM users WHERE username = ?", (user_input,))

# ✅ Good - Validate input before using in queries
import re

def validate_table_name(table_name):
    """Validate table name matches expected pattern"""
    if not re.match(r'^[a-zA-Z0-9_\.]+$', table_name):
        raise ValueError("Invalid table name")
    return table_name

# Use validated input
table = validate_table_name(user_input)
query = f"SELECT * FROM {table}"
```

**Validate all external input:**
```python
from flask import request, jsonify

@app.route('/api/approve', methods=['POST'])
def approve_records():
    data = request.get_json()
    
    # Validate required fields
    if not data or 'approvals' not in data:
        return jsonify({'error': 'Missing required field: approvals'}), 400
    
    # Validate data types
    if not isinstance(data['approvals'], list):
        return jsonify({'error': 'approvals must be an array'}), 400
    
    # Validate each record
    for record in data['approvals']:
        if not isinstance(record.get('PRDID'), str):
            return jsonify({'error': 'PRDID must be a string'}), 400
        if not isinstance(record.get('LOCID'), str):
            return jsonify({'error': 'LOCID must be a string'}), 400
    
    # Process valid data
    return jsonify({'status': 'success'})
```

---

## 5. Use Parameterized Queries or ORMs

**With Databricks SQL Connector:**
```python
# Parameterized query
cursor.execute(
    "SELECT * FROM planning_units WHERE PRDID = ? AND LOCID = ?",
    (prdid, locid)
)
```

**With Databricks REST API:**
```python
# Be careful with query construction
# Validate inputs before inserting into query string
def sanitize_value(value):
    """Remove potentially dangerous characters"""
    if value is None:
        return 'NULL'
    # Escape single quotes
    return f"'{str(value).replace("'", "''")}'"

query = f"UPDATE table SET status = {sanitize_value(status)} WHERE id = {sanitize_value(id)}"
```

**Best practice: Use ORM (if applicable):**
```python
# Example with SQLAlchemy (not Databricks-specific)
from sqlalchemy import select

statement = select(User).where(User.username == user_input)
result = session.execute(statement)
```

---

## 6. Enable HTTPS for All Connections

**Databricks Apps automatically use HTTPS** for app URLs and database connections.

**Verify in code:**
```python
# ✅ Always use HTTPS
url = f'https://{self.server_hostname}/api/2.0/sql/statements'

# ❌ Never use HTTP
url = f'http://{self.server_hostname}/api/2.0/sql/statements'
```

**Enforce HTTPS in Flask (if testing locally):**
```python
from flask import Flask, request, redirect

app = Flask(__name__)

@app.before_request
def before_request():
    if not request.is_secure and request.headers.get('X-Forwarded-Proto', 'http') != 'https':
        url = request.url.replace('http://', 'https://', 1)
        return redirect(url, code=301)
```

---

## 7. Follow Least Privilege Access

**Database Permissions:**
```sql
-- Grant only necessary permissions
GRANT SELECT ON TABLE cpg_reporting_sandbox.default.planning_unit_stage_current TO user@company.com;

-- Don't grant broad permissions
-- GRANT ALL PRIVILEGES ON CATALOG cpg_reporting_sandbox TO user@company.com;  ❌
```

**Databricks Workspace Access:**
- Grant users "Can View" on app (not "Can Manage")
- Limit who can edit source code in Workspace folders
- Use separate service accounts for app deployments

**SQL Warehouse Access:**
- Create dedicated SQL warehouse for app usage
- Set auto-stop timeout to save costs
- Limit concurrency and max cluster size

---

## 8. Regular Dependency Scanning

**Scan Python dependencies:**
```powershell
# Install pip-audit
pip install pip-audit

# Scan for vulnerabilities
pip-audit -r requirements.txt

# Example output:
# Found 2 known vulnerabilities in 1 packages
# requests (2.25.0) - CVE-2023-xxxxx
```

**Scan Node.js dependencies:**
```powershell
npm audit

# Fix vulnerabilities
npm audit fix
```

**Update dependencies regularly:**
```powershell
# Update Python packages
pip install --upgrade Flask requests

# Regenerate requirements.txt
pip freeze > requirements.txt

# Update Node packages
npm update
```

---

## 9. Threat Modeling Annotations

Use Threatspec annotations to document security considerations in your code.

**Example annotations in app.py:**
```python
# @mitigates MasterDataApp:API:DataEndpoint against SQL injection with parameterized queries
# @connects MasterDataApp:Backend to Databricks:SQLWarehouse with HTTPS/REST API
# @exposes MasterDataApp:API:StatusEndpoint to information disclosure with debug info in responses
# @accepts information disclosure to MasterDataApp:API:StatusEndpoint with minimal sensitive data exposed

class DatabricksHandler:
    """
    @mitigates MasterDataApp:Backend:DatabaseHandler against credential exposure with environment variables
    """
    def __init__(self):
        self.token = os.getenv('DATABRICKS_TOKEN')
```

**Benefits:**
- Documents security decisions in code
- Generates threat model documentation
- Helps security reviews
- Tracks security controls

---

## 10. Additional Security Checklist

- [ ] All secrets stored in environment variables or Databricks Secrets
- [ ] No hardcoded credentials in source code
- [ ] `app.yaml.local` added to `.gitignore`
- [ ] Input validation implemented for all API endpoints
- [ ] SQL queries use parameterization or validation
- [ ] HTTPS enforced for all connections
- [ ] Database permissions follow least privilege
- [ ] Dependencies scanned for vulnerabilities
- [ ] Access tokens have expiration dates
- [ ] Logs don't contain sensitive data (passwords, tokens, PII)
- [ ] Error messages don't expose system internals
- [ ] CORS configured properly (if applicable)
- [ ] Rate limiting implemented (if applicable)
- [ ] Authentication required for sensitive endpoints

---

# Part 6: UI Navigation Reference

This section provides instructions for finding key information in the Databricks UI. Include screenshots in your PowerPoint for visual reference.

## 1. Finding SQL Warehouse Connection Details

**Steps:**
1. Log into Databricks workspace
2. Click **"Compute"** in the left sidebar (or **"SQL Warehouses"** if visible)
3. Click on **your SQL warehouse name** from the list
4. Click the **"Connection details"** tab
5. Copy the following values:

   - **Server hostname**: `dbc-xxxxx-xxxx.cloud.databricks.com`
   - **HTTP path**: `/sql/1.0/warehouses/xxxxxxxxxxxxxx`

**Screenshot Placeholder:**
```
[Insert screenshot showing:]
- SQL Warehouses page
- Selected warehouse
- Connection details tab with hostname and HTTP path highlighted
```

---

## 2. Generating Personal Access Tokens

**Steps:**
1. Click your **user icon** (top right corner of Databricks UI)
2. Select **"User Settings"** from dropdown
3. Click the **"Developer"** tab in the left sidebar
4. Find **"Access tokens"** section
5. Click **"Manage"** button
6. Click **"Generate new token"**
7. Fill in:
   - **Comment**: "Databricks Apps - My App"
   - **Lifetime (days)**: 90 (or your preference)
8. Click **"Generate"**
9. **Copy the token immediately** (you won't see it again!)
10. Click **"Done"**

**Screenshot Placeholder:**
```
[Insert screenshot showing:]
- User Settings → Developer tab
- Access tokens section
- Generate new token dialog
- Token value with "Copy" button
```

**Security Note:** Treat this token like a password. Store it securely and never commit to Git.

---

## 3. Creating Workspace Folders for Apps

**Steps:**
1. Click **"Workspace"** in the left sidebar
2. Navigate to **"Users"** → **your-email@company.com**
3. Click the **three dots (...)** next to your user folder
4. Select **"Create"** → **"Folder"**
5. Name your folder (e.g., "my-databricks-app")
6. Click **"Create"**

**Screenshot Placeholder:**
```
[Insert screenshot showing:]
- Workspace sidebar
- Users folder structure
- Create folder dropdown menu
```

**Note:** This is where your app files will be synced via `databricks sync`

---

## 4. Viewing Deployed Apps

**Steps:**
1. Click **"Apps"** in the left sidebar (under "Machine Learning" section)
2. You'll see a list of all deployed apps with status:
   - **Running** (green checkmark)
   - **Failed** (red X)
   - **Starting** (yellow loading icon)
3. Click on an **app name** to view details
4. Key information shown:
   - **Status**: Current state of the app
   - **App URL**: Click to open the deployed app
   - **Source code path**: Workspace folder location
   - **Last deployed**: Timestamp of last deployment

**Screenshot Placeholder:**
```
[Insert screenshot showing:]
- Apps page with list of apps
- App status indicators
- App URL link
```

---

## 5. Viewing App Logs

**Steps:**
1. Go to **"Apps"** in left sidebar
2. Click on your **app name**
3. Click the **"Logs"** tab (top navigation within app details)
4. View real-time logs:
   - **SYSTEM logs**: Databricks infrastructure messages (startup, errors, crashes)
   - **APP logs**: Your application output (print statements, logger messages)
5. Use **filter box** to search logs
6. Click **"Download"** to save logs locally

**Screenshot Placeholder:**
```
[Insert screenshot showing:]
- App details page
- Logs tab selected
- Log output with SYSTEM and APP tags
- Filter/download buttons
```

**Common log messages:**
- `[INFO] Starting app with command: [python, app.py]` - App is starting
- `[INFO] * Running on http://0.0.0.0:8080` - Flask server started successfully
- `[ERROR] Could not start app` - App crashed during startup
- `[ERROR] ModuleNotFoundError: No module named 'flask'` - Missing dependency

---

## 6. Managing SQL Warehouse Settings

**Steps:**
1. Go to **"Compute"** → **"SQL Warehouses"**
2. Click on your **warehouse name**
3. Click **"Edit"** button (top right)
4. Configure settings:
   - **Cluster size**: T-Shirt sizes (2X-Small to 4X-Large)
   - **Auto stop**: Minutes of inactivity before stopping (save costs)
   - **Scaling**: Min/max clusters for auto-scaling
   - **Tags**: For cost tracking and organization
5. Click **"Save"**

**Screenshot Placeholder:**
```
[Insert screenshot showing:]
- SQL Warehouse configuration page
- Cluster size dropdown
- Auto stop setting
- Scaling options
```

**Best practices:**
- Use **2X-Small** for development/testing
- Enable **auto-stop after 10 minutes** to save costs
- Set **max clusters = 1** for apps (no need for scaling)

---

## 7. Browsing Tables in Unity Catalog

**Steps:**
1. Click **"Data"** in the left sidebar (or **"Catalog"**)
2. Browse the hierarchy:
   - **Catalog** (top level) - e.g., `cpg_reporting_sandbox`
   - **Schema** (database) - e.g., `default`
   - **Tables** - e.g., `planning_unit_stage_current`
3. Click on a **table name** to view:
   - **Schema tab**: Column names, data types, comments
   - **Sample data tab**: Preview first 100 rows
   - **Details tab**: Location, format (Delta), owner
   - **Permissions tab**: Who can access this table
4. Click **"Open in SQL Editor"** to query the table

**Screenshot Placeholder:**
```
[Insert screenshot showing:]
- Data/Catalog sidebar
- Three-level hierarchy (catalog → schema → table)
- Table details page with tabs
```

**Example table path:**
```
cpg_reporting_sandbox.default.planning_unit_stage_current
     ↑                  ↑                    ↑
  Catalog            Schema              Table
```

---

## 8. Running SQL Queries in SQL Editor

**Steps:**
1. Click **"SQL Editor"** in the left sidebar (or **"Queries"**)
2. Click **"Create query"** button
3. Select your **SQL warehouse** from dropdown (top right)
4. Write your SQL query:
```sql
SELECT * FROM cpg_reporting_sandbox.default.planning_unit_stage_current
LIMIT 10;
```
5. Click **"Run"** button (or press Ctrl+Enter)
6. View results in table below editor
7. Click **"Download"** to export results as CSV

**Screenshot Placeholder:**
```
[Insert screenshot showing:]
- SQL Editor interface
- Warehouse selector dropdown
- Query editor with sample SQL
- Results table
```

**Useful for:**
- Testing table connections before using in app
- Verifying data exists
- Debugging app queries
- Exploring schema and sample data

---

# Part 7: Quick Reference

## Command Cheat Sheet

### Databricks CLI Setup
```powershell
# Install CLI
pip install databricks-cli

# Configure authentication
databricks configure --token

# Verify connection
databricks workspace ls /Users
```

### File Syncing
```powershell
# One-time sync
databricks sync . /Workspace/Users/your.email@company.com/app-name

# Continuous sync (watches for changes)
databricks sync --watch . /Workspace/Users/your.email@company.com/app-name

# Verify files uploaded
databricks workspace ls /Workspace/Users/your.email@company.com/app-name
```

### App Deployment
```powershell
# Deploy app (first time or update)
databricks apps deploy app-name --source-code-path /Workspace/Users/your.email@company.com/app-name

# Check app status
databricks apps get app-name

# View app logs
databricks apps logs app-name --tail-lines 100

# Stop app
databricks apps stop app-name

# Start app
databricks apps start app-name

# Delete app
databricks apps delete app-name
```

### Workspace Management
```powershell
# Create workspace folder
databricks workspace mkdirs /Workspace/Users/your.email@company.com/app-name

# Delete workspace folder (careful!)
databricks workspace delete /Workspace/Users/your.email@company.com/app-name --recursive

# Upload single file
databricks workspace import app.py /Workspace/Users/your.email@company.com/app-name/app.py --language PYTHON --overwrite
```

### Secrets Management
```powershell
# Create secret scope
databricks secrets create-scope --scope my-app-secrets

# Add secret
databricks secrets put-secret --scope my-app-secrets --key token --string-value "dapixxx"

# List secret scopes
databricks secrets list-scopes

# List secrets in scope
databricks secrets list-secrets --scope my-app-secrets
```

---

## app.yaml Template

```yaml
# app.yaml - Databricks Apps Configuration

command: ["python", "app.py"]  # Startup command (required)

resources:  # Optional: Resource allocation
  memory: 2Gi
  cpu: 1

env:  # Environment variables
  # Flask configuration
  - name: FLASK_APP
    value: app.py
  - name: FLASK_ENV
    value: production
  
  # Databricks connection (use app.yaml.local for real values)
  - name: DATABRICKS_SERVER_HOSTNAME
    value: your-workspace.cloud.databricks.com
  - name: DATABRICKS_HTTP_PATH
    value: /sql/1.0/warehouses/your-warehouse-id
  - name: DATABRICKS_TOKEN
    value: YOUR_TOKEN_HERE
  
  # Application settings
  - name: LOG_LEVEL
    value: INFO
```

---

## Project File Structure Example

```
my-databricks-app/
│
├── app.py                          # Flask backend
├── app.yaml                        # Databricks Apps config (template)
├── app.yaml.local                  # Local config with real secrets (not committed)
├── requirements.txt                # Python dependencies
├── README.md                       # Project documentation
├── .gitignore                      # Exclude secrets, build artifacts
│
├── dist/                           # Built frontend (React/Vue) - MUST BE SYNCED
│   ├── index.html
│   └── assets/
│       ├── index-[hash].js
│       └── index-[hash].css
│
├── src/                            # Frontend source (NOT synced to Databricks)
│   ├── App.jsx
│   ├── main.jsx
│   ├── components/
│   │   ├── PlanningUnitTable.jsx
│   │   ├── FilterDropdown.jsx
│   │   └── SubmitButton.jsx
│   └── styles/
│       ├── App.css
│       └── PlanningUnitTable.css
│
├── package.json                    # Node dependencies (NOT synced)
├── vite.config.js                  # Build config (NOT synced)
└── node_modules/                   # Dependencies (NOT synced)
```

**Files to sync to Databricks:**
- ✅ `app.py`
- ✅ `app.yaml`
- ✅ `requirements.txt`
- ✅ `dist/` (entire folder)
- ✅ `.gitignore`
- ✅ `README.md`

**Files to exclude from sync:**
- ❌ `src/`
- ❌ `node_modules/`
- ❌ `package.json`
- ❌ `vite.config.js`
- ❌ `app.yaml.local`
- ❌ `.env`

---

## Deployment Checklist

### Pre-Deployment
- [ ] Code tested locally (`python app.py` runs successfully)
- [ ] Frontend built (`npm run build` completed)
- [ ] `dist/` folder contains built frontend files
- [ ] `app.yaml` has correct `command` field
- [ ] `requirements.txt` lists all Python dependencies
- [ ] Secrets not hardcoded in source files
- [ ] `.gitignore` excludes `app.yaml.local`, `node_modules/`, `.env`

### Databricks Setup
- [ ] Databricks CLI installed (`databricks --version`)
- [ ] Authenticated with workspace (`databricks configure --token`)
- [ ] SQL Warehouse created and running
- [ ] Connection details collected (hostname, HTTP path, token)
- [ ] Workspace folder created (`/Workspace/Users/your.email/app-name`)

### Deployment
- [ ] Files synced (`databricks sync . /Workspace/.../app-name`)
- [ ] All files uploaded (verify with `databricks workspace ls`)
- [ ] App deployed (`databricks apps deploy app-name`)
- [ ] Deployment succeeded (no errors in output)
- [ ] App status is "Running" (`databricks apps get app-name`)

### Post-Deployment
- [ ] App URL accessible in browser
- [ ] Data loads correctly from Databricks table
- [ ] All features working as expected
- [ ] Logs show no errors (`databricks apps logs app-name`)
- [ ] Test API endpoints (`/api/status`, `/api/data`)
- [ ] Frontend displays correctly (no missing JS/CSS)

### Ongoing Maintenance
- [ ] Monitor app logs regularly
- [ ] Update dependencies quarterly (`pip-audit`, `npm audit`)
- [ ] Rotate access tokens every 90 days
- [ ] Review and update `requirements.txt` versions
- [ ] Test redeployment process before major changes

---

## Useful SQL Queries

### Check table exists
```sql
SHOW TABLES IN cpg_reporting_sandbox.default
LIKE 'planning_unit_stage_current';
```

### Preview table data
```sql
SELECT * FROM cpg_reporting_sandbox.default.planning_unit_stage_current
LIMIT 10;
```

### Count records
```sql
SELECT COUNT(*) as total_records
FROM cpg_reporting_sandbox.default.planning_unit_stage_current;
```

### View table schema
```sql
DESCRIBE cpg_reporting_sandbox.default.planning_unit_stage_current;
```

### Check for null approval status
```sql
SELECT COUNT(*) as pending_approvals
FROM cpg_reporting_sandbox.default.planning_unit_stage_current
WHERE Approval_Status IS NULL;
```

---

## Common URLs

| Resource | URL Pattern |
|----------|-------------|
| **Databricks Workspace** | `https://dbc-xxxxx-xxxx.cloud.databricks.com` |
| **Deployed App** | `https://dbc-xxxxx.../serving-endpoints/app-name/app/` |
| **SQL Editor** | `https://dbc-xxxxx.../sql/editor` |
| **Apps Dashboard** | `https://dbc-xxxxx.../ml/apps` |
| **User Settings** | `https://dbc-xxxxx.../settings/user` |

---

## Environment Variables Reference

| Variable | Purpose | Example Value |
|----------|---------|---------------|
| `DATABRICKS_SERVER_HOSTNAME` | Workspace hostname | `dbc-03f4b243-5447.cloud.databricks.com` |
| `DATABRICKS_HTTP_PATH` | SQL Warehouse identifier | `/sql/1.0/warehouses/2459b6c757e09896` |
| `DATABRICKS_TOKEN` | Access token for auth | `dapixxxxxxxxxxxxxxxxxxx` |
| `FLASK_APP` | Flask application entry | `app.py` |
| `FLASK_ENV` | Flask environment | `production` |
| `LOG_LEVEL` | Logging verbosity | `INFO` or `DEBUG` |

---

## Additional Resources

- **Databricks Apps Documentation**: [https://docs.databricks.com/en/dev-tools/databricks-apps/index.html](https://docs.databricks.com/en/dev-tools/databricks-apps/index.html)
- **Databricks CLI Reference**: [https://docs.databricks.com/en/dev-tools/cli/index.html](https://docs.databricks.com/en/dev-tools/cli/index.html)
- **Unity Catalog**: [https://docs.databricks.com/en/data-governance/unity-catalog/index.html](https://docs.databricks.com/en/data-governance/unity-catalog/index.html)
- **SQL Warehouses**: [https://docs.databricks.com/en/compute/sql-warehouse/index.html](https://docs.databricks.com/en/compute/sql-warehouse/index.html)
- **Databricks SQL API**: [https://docs.databricks.com/api/workspace/statementexecution](https://docs.databricks.com/api/workspace/statementexecution)

---

## Summary

This guide covered the complete journey from local development in Cursor to production deployment in Databricks Apps:

1. **Local Development**: Build your app with Python/Flask and React/Vue
2. **Configuration**: Create `app.yaml` and `requirements.txt`
3. **Authentication**: Set up Databricks CLI with access tokens
4. **Database Connection**: Connect to SQL Warehouses and Unity Catalog tables
5. **File Syncing**: Upload code to Databricks workspace
6. **Deployment**: Deploy and run your app in Databricks
7. **Troubleshooting**: Solve common errors and issues
8. **Security**: Follow best practices for secrets and access control
9. **UI Navigation**: Find key information in Databricks UI
10. **Quick Reference**: Commands, templates, and checklists

**Next Steps:**
- Use this guide as a reference for your PowerPoint presentation
- Add screenshots from your Databricks workspace
- Customize examples for your specific use cases
- Share with your team for standardized Databricks Apps development

---

**Document Version:** 1.0  
**Last Updated:** 2026-02-01  
**Author:** AI Assistant (Cursor)  
**Project:** IBP Master Data Automation - Databricks Apps
