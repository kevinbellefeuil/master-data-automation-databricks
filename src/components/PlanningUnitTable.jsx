import React, { useState, useMemo } from 'react'
import EditableCell from './EditableCell'
import ApproveDenyToggle from './ApproveDenyToggle'
import FilterDropdown from './FilterDropdown'
import * as XLSX from 'xlsx'
import '../styles/PlanningUnitTable.css'

/**
 * @exposes PlanningUnitTable to #xss with user-provided data
 * @mitigates PlanningUnitTable against #xss with React's built-in XSS protection
 * @mitigates PlanningUnitTable against #xss with input validation and sanitization
 */
const PlanningUnitTable = ({ 
  title, 
  data, 
  onDataChange
}) => {
  // Column name mappings
  const COLUMN_MAPPINGS = {
    // Product & Category columns
    'PNL_CATEGORY_DESC': 'PnL Category Desc',
    'PRODUCT_LEVEL_2_DESCRIPTION': 'Product Level 2 Desc',
    'PRODUCT_LEVEL_3_DESCRIPTION': 'Product Level 3 Desc',
    'PRODUCT_LEVEL_4_DESCRIPTION': 'Product Level 4 Desc',
    
    // Material & Supply Chain columns
    'SUPPLY_CHAIN_SIZE': 'Supply Chain Size',
    'MATERIAL_GROUP': 'Material Group',
    'MATERIAL_TYPE': 'Material Type',
    'MATERIAL': 'Material',
    'PLANT_MATERIAL_STATUS_DESC': 'Plant Material Status',
    
    // ID columns
    'PRDID': 'Product ID',
    'LOCID': 'Location ID',
    
    // Planning Unit columns (database names with spaces)
    'CURRENT PLUNITID': 'Current Planning Unit',
    'CURRENT_PLUNITID': 'Current Planning Unit',  // Handle both versions
    'RECOMMENDED': 'Proposed Planning Unit',
    'OVERWRITE': 'Overwrite',
    'RECOMMENDED_REASON': 'Recommended Reason',
    'RECOMMEND REASON': 'Recommended Reason',  // Handle both versions
    
    // Approval column - handle all variations
    'APPROVE?': 'Approve?',
    'Approve?': 'Approve?',
    'approval': 'Approve?',
    
    // Recommended Reason - handle all variations
    'RECOMMENDED REASON': 'Recommended Reason',
    'Recommended Reason': 'Recommended Reason'
  }

  // Columns that should not be filterable
  const NON_FILTERABLE_COLUMNS = ['Approve?', 'Recommended Reason', 'approval', 'Overwrite']

  // Define explicit column order based on user requirements
  // RecordID and Last Refresh Date are excluded from table display
  const COLUMN_ORDER = [
    'PNL_CATEGORY_DESC',
    'PRODUCT_LEVEL_2_DESCRIPTION',
    'PRODUCT_LEVEL_3_DESCRIPTION',
    'PRODUCT_LEVEL_4_DESCRIPTION',
    'SUPPLY_CHAIN_SIZE',
    'MATERIAL_GROUP',
    'MATERIAL_TYPE',
    'MATERIAL',
    'CLAIMSHELL',
    'PLANT_MATERIAL_STATUS_DESC',
    'PRDID',
    'LOCID',
    'CURRENT PLUNITID',      // Current Planning Unit (with space)
    'CURRENT_PLUNITID',      // Current Planning Unit (without space - fallback)
    'RECOMMENDED',           // Proposed Planning Unit
    'OVERWRITE',             // Overwrite
    'APPROVE?',              // Approve?
    'approval',              // Approve? (fallback)
    'RECOMMEND REASON',      // Recommended Reason (with space)
    'RECOMMENDED_REASON'     // Recommended Reason (without space - fallback)
  ]

  // Get all column names from the first row of data
  const allColumns = useMemo(() => {
    if (!data || data.length === 0 || !data[0] || typeof data[0] !== 'object') return []
    
    try {
      const dataColumns = Object.keys(data[0])
        .filter(col => 
          col !== 'approval' && 
          col !== 'RECOMMEND REASON' && 
          col !== 'Approval Status' &&
          col !== 'Approval_Status' && // Hide approval status field
          col !== 'RecordID' &&
          col !== 'Last Refresh Date' &&
          col !== '_debug_error' // Hide debug field
        )
      
      // Ensure OVERWRITE column exists
      const columnsWithOverwrite = dataColumns.includes('OVERWRITE') ? dataColumns : [...dataColumns, 'OVERWRITE']
      
      // Order columns strictly according to COLUMN_ORDER
      const orderedColumns = []
      COLUMN_ORDER.forEach(col => {
        if (columnsWithOverwrite.includes(col)) {
          orderedColumns.push(col)
        }
      })
      
      // Add any columns not in COLUMN_ORDER at the end
      columnsWithOverwrite.forEach(col => {
        if (!orderedColumns.includes(col)) {
          orderedColumns.push(col)
        }
      })
      
      return orderedColumns
    } catch (error) {
      console.error('Error processing columns:', error)
      return []
    }
  }, [data])

  // Initialize filter state dynamically for all filterable columns
  const [filters, setFilters] = useState({})
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1)
  const rowsPerPage = 100 // Show 100 rows at a time
  
  // Initialize filters when columns change
  React.useEffect(() => {
    if (allColumns.length > 0) {
      const initialFilters = {}
      allColumns.forEach(col => {
        if (!NON_FILTERABLE_COLUMNS.includes(col) && col !== 'RECOMMEND REASON') {
          initialFilters[col] = []
        }
      })
      setFilters(prev => {
        // Merge with existing filters to preserve user selections
        const merged = { ...initialFilters }
        Object.keys(prev).forEach(key => {
          if (initialFilters.hasOwnProperty(key)) {
            merged[key] = prev[key]
          }
        })
        return merged
      })
    }
  }, [allColumns])

  // Helper function to check if column is filterable
  const isFilterable = (columnKey) => {
    return !NON_FILTERABLE_COLUMNS.includes(columnKey) && columnKey !== 'RECOMMEND REASON'
  }

  // Memoize unique values for each column
  const columnUniqueValues = useMemo(() => {
    if (!data || data.length === 0 || allColumns.length === 0) return {}
    
    try {
      const uniqueValues = {}
      allColumns.forEach(columnKey => {
        if (isFilterable(columnKey)) {
          // Use Set for O(1) lookups and faster deduplication
          const valuesSet = new Set()
          for (let i = 0; i < data.length; i++) {
            if (data[i] && typeof data[i] === 'object') {
              const value = (data[i][columnKey] || '').toString().trim()
              if (value) {
                valuesSet.add(value)
              }
            }
          }
          uniqueValues[columnKey] = Array.from(valuesSet).sort()
        }
      })
      return uniqueValues
    } catch (error) {
      console.error('Error processing unique values:', error)
      return {}
    }
  }, [data, allColumns])

  // Filter the data based on current filters and track original indices
  const filteredDataWithIndices = useMemo(() => {
    if (!data || data.length === 0) return []
    
    try {
      return data
        .map((row, originalIndex) => ({ row, originalIndex }))
        .filter(({ row }) => {
          if (!row || typeof row !== 'object') return false
          
          // Check each filterable column
          for (const [columnKey, selectedValues] of Object.entries(filters)) {
            if (selectedValues && selectedValues.length > 0) {
              const cellValue = (row[columnKey] || '').toString().trim()
              if (!selectedValues.includes(cellValue)) {
                return false
              }
            }
          }
          return true
        })
    } catch (error) {
      console.error('Error filtering data:', error)
      return []
    }
  }, [data, filters])

  // Paginate the filtered data
  const paginatedData = useMemo(() => {
    const startIndex = (currentPage - 1) * rowsPerPage
    const endIndex = startIndex + rowsPerPage
    return filteredDataWithIndices.slice(startIndex, endIndex)
  }, [filteredDataWithIndices, currentPage, rowsPerPage])

  const totalPages = Math.ceil(filteredDataWithIndices.length / rowsPerPage)

  const handleCellChange = (originalIndex, columnKey, newValue) => {
    const updatedData = [...data]
    updatedData[originalIndex] = { ...updatedData[originalIndex], [columnKey]: newValue }
    onDataChange(updatedData)
  }

  const handleApprovalChange = (originalIndex, approvalValue) => {
    const updatedData = [...data]
    updatedData[originalIndex] = { ...updatedData[originalIndex], approval: approvalValue }
    onDataChange(updatedData)
  }

  const handleFilterChange = (column, selectedValues) => {
    setFilters(prev => ({
      ...prev,
      [column]: selectedValues
    }))
  }

  const handleApproveAll = () => {
    const updatedData = [...data]
    filteredDataWithIndices.forEach(({ originalIndex }) => {
      updatedData[originalIndex] = { ...updatedData[originalIndex], approval: 'approve' }
    })
    onDataChange(updatedData)
  }

  const handleClearAllApprovals = () => {
    const updatedData = [...data]
    filteredDataWithIndices.forEach(({ originalIndex }) => {
      updatedData[originalIndex] = { ...updatedData[originalIndex], approval: null }
    })
    onDataChange(updatedData)
  }

  const handleClearFilters = () => {
    // Reset all filters to empty arrays
    const clearedFilters = {}
    Object.keys(filters).forEach(key => {
      clearedFilters[key] = []
    })
    setFilters(clearedFilters)
    setCurrentPage(1) // Reset to first page
  }

  const handleExportToExcel = () => {
    // Prepare data for export with only PRDID, LOCID, and final Planning Unit value
    // Use Overwrite if present, otherwise use RECOMMENDED
    const exportData = filteredDataWithIndices.map(({ row }) => {
      const finalValue = (row['OVERWRITE'] && row['OVERWRITE'].toString().trim()) 
        ? row['OVERWRITE'] 
        : row['RECOMMENDED']
      
      return {
        'PRDID': row['PRDID'] || '',
        'LOCID': row['LOCID'] || '',
        'Proposed Planning Unit': finalValue || ''
      }
    })

    // Create workbook and worksheet
    const ws = XLSX.utils.json_to_sheet(exportData)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Planning Units')

    // Generate filename with timestamp
    const timestamp = new Date().toISOString().slice(0, 19).replace(/:/g, '-')
    const filename = `${title.replace(/\s+/g, '_')}_Subset_${timestamp}.xlsx`

    // Write file
    XLSX.writeFile(wb, filename)
  }

  const getDisplayName = (columnKey) => {
    // First try exact match
    if (COLUMN_MAPPINGS[columnKey]) {
      return COLUMN_MAPPINGS[columnKey]
    }
    
    // Try uppercase version (for columns like "APPROVE?" or "RECOMMENDED REASON")
    const upperKey = columnKey.toUpperCase()
    if (COLUMN_MAPPINGS[upperKey]) {
      return COLUMN_MAPPINGS[upperKey]
    }
    
    // Return original if no mapping found
    return columnKey
  }

  const isEditable = (columnKey) => {
    // Only Overwrite column is editable now
    return columnKey === 'OVERWRITE'
  }

  const formatCellValue = (columnKey, value) => {
    // Format LOCID and PRDID to remove decimal points (they're text fields stored as numbers)
    if ((columnKey === 'LOCID' || columnKey === 'PRDID') && value != null && value !== '') {
      // Convert to number and back to string to remove decimals
      const numValue = parseFloat(value)
      if (!isNaN(numValue)) {
        return Math.round(numValue).toString()
      }
    }
    return value || ''
  }

  if (!data || data.length === 0) {
    return (
      <div className="planning-unit-table-section">
        <h2 className="section-title">{title}</h2>
        <div className="no-data-message">No data available</div>
      </div>
    )
  }

  return (
    <div className="planning-unit-table-section">
      <div className="table-header-controls">
        <h2 className="section-title">{title}</h2>
        <div className="table-actions">
          <button 
            className="approve-all-button"
            onClick={handleApproveAll}
            disabled={filteredDataWithIndices.length === 0}
          >
            Approve All ({filteredDataWithIndices.length})
          </button>
          <button 
            className="clear-all-button"
            onClick={handleClearAllApprovals}
            disabled={filteredDataWithIndices.length === 0}
          >
            Clear All Approvals
          </button>
          <button 
            className="clear-filters-button"
            onClick={handleClearFilters}
            disabled={Object.values(filters).every(f => !f || f.length === 0)}
          >
            Clear Filters
          </button>
          <div className="table-info">
            Showing {paginatedData.length > 0 ? (currentPage - 1) * rowsPerPage + 1 : 0} - {Math.min(currentPage * rowsPerPage, filteredDataWithIndices.length)} of {filteredDataWithIndices.length} rows
          </div>
          <button 
            className="export-excel-button"
            onClick={handleExportToExcel}
            disabled={filteredDataWithIndices.length === 0}
          >
            Download Subset
          </button>
        </div>
      </div>
      <div className="table-container">
        <table className="planning-unit-table">
          <thead>
            <tr>
              {allColumns.map((columnKey) => {
                const displayName = getDisplayName(columnKey)
                return (
                  <th key={columnKey}>
                    {isFilterable(columnKey) ? (
                      <FilterDropdown
                        columnName={displayName}
                        values={columnUniqueValues[columnKey] || []}
                        selectedValues={filters[columnKey] || []}
                        onSelectionChange={(selected) => handleFilterChange(columnKey, selected)}
                      />
                    ) : (
                      <div className="filter-header-cell">
                        <span className="column-name">{displayName}</span>
                      </div>
                    )}
                  </th>
                )
              })}
              <th>
                <div className="filter-header-cell">
                  <span className="column-name">APPROVE?</span>
                </div>
              </th>
              <th>
                <div className="filter-header-cell">
                  <span className="column-name">RECOMMENDED REASON</span>
                </div>
              </th>
            </tr>
          </thead>
          <tbody>
            {filteredDataWithIndices.length === 0 ? (
              <tr>
                <td colSpan={allColumns.length + 2} className="no-results">
                  No results match the current filters
                </td>
              </tr>
            ) : (
              paginatedData.map(({ row, originalIndex }) => (
                <tr key={originalIndex}>
                  {allColumns.map((columnKey) => {
                    const cellValue = formatCellValue(columnKey, row[columnKey])
                    return (
                      <td key={columnKey}>
                        {isEditable(columnKey) ? (
                          <EditableCell
                            value={cellValue}
                            onUpdate={(newValue) => handleCellChange(originalIndex, columnKey, newValue)}
                            placeholder={columnKey === 'OVERWRITE' ? 'Optional override' : 'Enter value'}
                          />
                        ) : (
                          <span>{cellValue}</span>
                        )}
                      </td>
                    )
                  })}
                  <td>
                    <ApproveDenyToggle
                      value={row.approval}
                      onChange={(value) => handleApprovalChange(originalIndex, value)}
                    />
                  </td>
                  <td>
                    <span>{row['RECOMMEND REASON'] || ''}</span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      {totalPages > 1 && (
        <div className="pagination-controls">
          <button 
            className="pagination-button"
            onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
            disabled={currentPage === 1}
          >
            Previous
          </button>
          <span className="pagination-info">
            Page {currentPage} of {totalPages}
          </span>
          <button 
            className="pagination-button"
            onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
            disabled={currentPage === totalPages}
          >
            Next
          </button>
        </div>
      )}
    </div>
  )
}

export default PlanningUnitTable
