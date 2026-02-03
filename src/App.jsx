import React, { useState, useEffect } from 'react'
import PlanningUnitTable from './components/PlanningUnitTable'
import SubmitButton from './components/SubmitButton'
import gpLogo from './assets/Georgia Pacific White Transparent Logo.png'
// Excel loading removed - now using pre-converted JSON file
import './styles/App.css'

/**
 * @exposes App to #xss with user-provided data
 * @mitigates App against #xss with React's built-in XSS protection
 */
function App() {
  const [planningUnitData, setPlanningUnitData] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [loadError, setLoadError] = useState(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [lastRefreshDate, setLastRefreshDate] = useState(null)
  const [isDownloadingHistorical, setIsDownloadingHistorical] = useState(false)

  // Format date from ISO to MM/DD/YYYY
  const formatDate = (isoDateString) => {
    if (!isoDateString) return ''
    try {
      const date = new Date(isoDateString)
      const month = date.getMonth() + 1
      const day = date.getDate()
      const year = date.getFullYear()
      return `${month}/${day}/${year}`
    } catch (error) {
      return isoDateString
    }
  }

  // Load data from API and filter out approved and denied records
  const loadData = async () => {
    setIsLoading(true)
    setLoadError(null)
    
    try {
      const response = await fetch('/api/data')
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: Failed to load data from server.`)
      }
      
      const jsonData = await response.json()
      
      console.log('Loaded data:', jsonData.length, 'rows')
      console.log('First row sample:', jsonData[0])
      
      // Extract Last Refresh Date from first row (assuming all rows have the same date)
      if (jsonData.length > 0 && jsonData[0]['Last Refresh Date']) {
        setLastRefreshDate(jsonData[0]['Last Refresh Date'])
      }
      
      // Filter out approved and denied records - only show pending (null/empty status)
      const filteredData = jsonData.filter(row => 
        row['Approval Status'] !== 'Approved' && row['Approval Status'] !== 'Denied'
      )
      
      console.log('Filtered data (excluding approved and denied):', filteredData.length, 'rows')
      
      setPlanningUnitData(filteredData)
      console.log('Data set in state')
      
    } catch (error) {
      setLoadError(`Failed to load data: ${error.message}`)
    } finally {
      setIsLoading(false)
    }
  }

  // Load data on component mount
  useEffect(() => {
    loadData()
  }, [])

  const handleSubmit = async (submissionData) => {
    setIsSubmitting(true)
    
    try {
      console.log('Submitting data to backend:', submissionData)
      
      const response = await fetch('/api/submit', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(submissionData)
      })
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.message || 'Failed to submit data')
      }
      
      const result = await response.json()
      console.log('Submission successful:', result)
      
      const totalApproved = submissionData.approved.length
      const totalDenied = submissionData.denied.length
      
      alert(`Successfully submitted ${totalApproved} approved and ${totalDenied} denied changes.\n\nThese records have been removed from the table.`)
      
      // Reload data to hide approved and denied records
      await loadData()
      
    } catch (error) {
      console.error('Submission error:', error)
      alert(`Failed to submit changes: ${error.message}\n\nPlease try again.`)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleHistoricalDownload = async () => {
    setIsDownloadingHistorical(true)
    
    try {
      console.log('Requesting historical data download...')
      
      const response = await fetch('/api/historical/download')
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.message || `HTTP ${response.status}: Failed to download historical data`)
      }
      
      // Get the blob from response
      const blob = await response.blob()
      
      // Create download link
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `planning_unit_historical_${new Date().toISOString().split('T')[0]}.xlsx`
      document.body.appendChild(a)
      a.click()
      
      // Cleanup
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
      
      console.log('Historical data download completed')
      
    } catch (error) {
      console.error('Historical download error:', error)
      alert(`Failed to download historical data: ${error.message}\n\nPlease ensure historical data exists in the database.`)
    } finally {
      setIsDownloadingHistorical(false)
    }
  }

  return (
    <div className="app">
      <header className="app-header">
        <div className="header-main">
          <h1 className="app-title">IBP Master Data Automation</h1>
          <p className="subtitle">Review and approve planning unit updates</p>
        </div>
        <div className="header-controls">
          <button 
            className="historical-download-button"
            onClick={handleHistoricalDownload}
            disabled={isDownloadingHistorical}
            title="Download historical snapshots as Excel file"
          >
            {isDownloadingHistorical ? 'Downloading...' : '📥 Download Historical Data'}
          </button>
          {lastRefreshDate && (
            <div className="header-refresh-date">
              Last Refresh: {formatDate(lastRefreshDate)}
            </div>
          )}
        </div>
        <div className="header-branding">
          <img src={gpLogo} alt="Georgia-Pacific Logo" className="gp-logo" />
          <div className="company-name">
            <div>CPG Business</div>
            <div>Effectiveness</div>
          </div>
        </div>
      </header>
      
      <main className="app-main">
        {isLoading ? (
          <div className="loading-container">
            <div className="loading-spinner"></div>
            <p>Loading Planning Unit data...</p>
          </div>
        ) : loadError ? (
          <div className="error-container">
            <p className="error-message">{loadError}</p>
            <button 
              className="retry-button"
              onClick={() => window.location.reload()}
            >
              Retry
            </button>
          </div>
        ) : planningUnitData.length === 0 ? (
          <div className="error-container">
            <p className="error-message">No data loaded. Data array is empty.</p>
            <button 
              className="retry-button"
              onClick={() => window.location.reload()}
            >
              Retry
            </button>
          </div>
        ) : (
          <>
            <PlanningUnitTable
              title="Planning Unit"
              data={planningUnitData}
              onDataChange={setPlanningUnitData}
            />
            
            <SubmitButton
              data={planningUnitData}
              onSubmit={handleSubmit}
              isSubmitting={isSubmitting}
            />
          </>
        )}
      </main>
    </div>
  )
}

export default App

