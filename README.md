# IBP Master Data Automation - Databricks Apps

## Overview

Master Data management application for planning unit approvals, deployed on **Databricks Apps**. This application provides a user-friendly interface for reviewing and approving planning unit recommendations with robust error handling and graceful degradation.

## Features

### Frontend (React + Vite)
- ✅ Interactive data table with filtering
- ✅ Approve/Deny toggle for each record
- ✅ Multi-column filtering (Product, Location, Planning Unit, etc.)
- ✅ Batch submission of approvals
- ✅ Responsive design
- ✅ Real-time data updates

### Backend (Flask)
- ✅ RESTful API endpoints
- ✅ Databricks SQL connector integration
- ✅ **Graceful degradation** - works with or without database
- ✅ Sample data fallback
- ✅ Comprehensive error handling
- ✅ Security annotations (Threatspec)
- ✅ Thread-safe database operations

## Architecture

### Graceful Degradation Design

The application is designed to **always work**, even if database connectivity fails:

1. **Phase 1: Sample Data Mode**
   - App starts with hardcoded sample data
   - Guarantees frontend functionality
   - Useful for testing and development

2. **Phase 2: Database with Fallback**
   - Attempts to connect to Databricks
   - Falls back to sample data if connection fails
   - App remains operational

3. **Phase 3: Full Database Mode**
   - Reads from `cpg_rpt_dev.default.planning_unit_stage_subset`
   - Writes approval decisions back to table
   - Parameterized queries for security

### Technology Stack

**Frontend:**
- React 18
- Vite (build tool)
- CSS Modules
- Fetch API

**Backend:**
- Flask 3.0
- flask-cors
- databricks-sql-connector
- Python 3.10+

**Deployment:**
- Databricks Apps
- Databricks CLI

## Project Structure

```
Master Data Automation/
├── app.py                    # Flask backend with database fallback
├── app.yaml                  # Databricks Apps configuration
├── requirements.txt          # Python dependencies
├── package.json              # Node.js dependencies
├── vite.config.js            # Vite configuration
├── .gitignore                # Git ignore rules
├── dist/                     # Built React frontend (generated)
│   ├── index.html
│   └── assets/
├── src/                      # React source code
│   ├── App.jsx               # Main application component
│   ├── main.jsx              # Entry point
│   ├── components/           # React components
│   │   ├── PlanningUnitTable.jsx
│   │   ├── ApproveDenyToggle.jsx
│   │   ├── FilterDropdown.jsx
│   │   ├── EditableCell.jsx
│   │   ├── InfoButton.jsx
│   │   └── SubmitButton.jsx
│   ├── styles/               # Component styles
│   └── assets/               # Images, logos
├── DEPLOYMENT_GUIDE.md       # Detailed deployment instructions
├── THREAT_MODEL.md           # Security documentation
├── README.md                 # This file
└── PROJECT_SUMMARY.md        # Implementation summary
```

## API Endpoints

### Health Check
```
GET /api/health
```
Returns app status and current mode (database or sample_data).

### Test Database Connection
```
GET /api/test-connection
```
Tests Databricks SQL connection (returns success/failure).

### Get Data
```
GET /api/data
```
Returns planning unit records. Tries database first, falls back to sample data.

### Submit Approvals
```
POST /api/submit
```
Submits approved/denied records. Writes to database if available.

**Request Body:**
```json
{
  "approved": [
    {"PRDID": "PROD001", "LOCID": "LOC001", "RECOMMENDED": "UNIT-B", ...}
  ],
  "denied": [
    {"PRDID": "PROD002", "LOCID": "LOC002", ...}
  ]
}
```

## Quick Start

### Local Development

```powershell
# Install frontend dependencies
npm install

# Build frontend
npm run build

# Install backend dependencies
pip install -r requirements.txt

# Run locally (uses sample data)
$env:PORT="8080"
python app.py
```

Open `http://localhost:8080`

### Deploy to Databricks Apps

See [DEPLOYMENT_GUIDE.md](DEPLOYMENT_GUIDE.md) for detailed instructions.

**Quick deploy:**
```powershell
cd "C:\Users\kevinb27\OneDrive - kochind.com\Documents\Emerging Technology - L&D\Master Data Automation"

databricks workspace delete /Workspace/Users/kevin.bellefeuil@gapac.com/master-data-automation --recursive
databricks sync . /Workspace/Users/kevin.bellefeuil@gapac.com/master-data-automation
databricks apps deploy master-data-automation --source-code-path /Workspace/Users/kevin.bellefeuil@gapac.com/master-data-automation
```

## Data Model

### Planning Unit Stage Table

**Table:** `cpg_rpt_dev.default.planning_unit_stage_subset`

**Key Columns:**
- `PRDID` - Product ID (Primary Key)
- `LOCID` - Location ID (Primary Key)
- `CURRENT_PLUNITID` - Current planning unit
- `RECOMMENDED` - Recommended planning unit
- `RECOMMEND_REASON` - Reason for recommendation
- `Approval_Status` - Approval status (NULL, "Approved", "Denied")

## Security

### Implemented Mitigations

- ✅ **SQL Injection Prevention** - Parameterized queries
- ✅ **Path Traversal Protection** - Absolute paths, Flask validation
- ✅ **XSS Prevention** - Input sanitization, React built-in protections
- ✅ **CSRF Protection** - CORS configuration
- ✅ **Race Condition Prevention** - Thread locks for database operations
- ✅ **Information Disclosure** - Sanitized logging

See [THREAT_MODEL.md](THREAT_MODEL.md) for complete security documentation.

## Configuration

### Environment Variables

**PORT** (optional)
- Default: `8080`
- Port for Flask server

**DATABRICKS_SERVER_HOSTNAME** (optional)
- Databricks workspace hostname
- Set via `app.yaml` secrets

**DATABRICKS_HTTP_PATH** (optional)
- SQL warehouse HTTP path
- Set via `app.yaml` secrets

**DATABRICKS_TOKEN** (optional)
- Personal access token
- Set via `app.yaml` secrets

**If not configured:** App runs in sample data mode.

## Monitoring

### View Logs

```powershell
# Recent logs
databricks apps logs master-data-automation --tail-lines 100

# Follow logs
databricks apps logs master-data-automation --follow
```

### Key Metrics

- App startup logs show:
  - Python version
  - Working directory
  - Database mode (enabled/disabled)
  - Available endpoints

- Request logs show:
  - API calls
  - Database queries
  - Fallback activations
  - Errors

## Testing

### Frontend Testing
1. Open app in browser
2. Verify data table loads
3. Test all filters
4. Test approve/deny toggles
5. Test submit button
6. Verify success messages

### Backend Testing
```bash
# Health check
curl https://your-app-url/api/health

# Test connection (if database configured)
curl https://your-app-url/api/test-connection

# Get data
curl https://your-app-url/api/data

# Submit (POST)
curl -X POST https://your-app-url/api/submit \
  -H "Content-Type: application/json" \
  -d '{"approved": [], "denied": []}'
```

## Troubleshooting

See [DEPLOYMENT_GUIDE.md](DEPLOYMENT_GUIDE.md) for common issues and solutions.

**Common Issues:**
- App shows old version → Full clean deployment
- DIST not found → Run `npm run build`
- Database connection fails → App falls back to sample data (check `/api/health`)
- File too large → Check `.gitignore`

## Version History

### v2.0 - Robust Version (Current)
- ✅ Graceful degradation with sample data fallback
- ✅ `/api/test-connection` endpoint
- ✅ Improved error handling
- ✅ Comprehensive logging
- ✅ Path resolution fixes

### v1.0 - Database Version
- ✅ Databricks SQL integration
- ✅ React frontend with Vite
- ✅ Flask backend
- ✅ Security annotations

## License

Internal use only - Koch Industries

## Support

For issues or questions, contact the development team or refer to:
- [DEPLOYMENT_GUIDE.md](DEPLOYMENT_GUIDE.md)
- [THREAT_MODEL.md](THREAT_MODEL.md)
- App logs: `databricks apps logs master-data-automation --tail-lines 100`
