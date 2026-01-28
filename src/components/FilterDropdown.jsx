import React, { useState, useRef, useEffect, useMemo } from 'react'
import '../styles/FilterDropdown.css'

/**
 * @exposes FilterDropdown to #xss with user-provided data
 * @mitigates FilterDropdown against #xss with React's built-in XSS protection
 * @mitigates FilterDropdown against #xss with input validation and sanitization
 */
const FilterDropdown = ({ 
  columnName, 
  values, 
  selectedValues = [], 
  onSelectionChange 
}) => {
  const [isOpen, setIsOpen] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [isHovered, setIsHovered] = useState(false)
  const [pendingSelections, setPendingSelections] = useState([])
  const dropdownRef = useRef(null)

  // Get unique, sorted values
  const uniqueValues = useMemo(() => {
    const unique = [...new Set(values.map(v => (v || '').toString().trim()).filter(v => v !== ''))]
    return unique.sort()
  }, [values])

  // Filter values based on search term
  const filteredValues = useMemo(() => {
    if (!searchTerm) return uniqueValues
    const term = searchTerm.toLowerCase()
    return uniqueValues.filter(v => v.toLowerCase().includes(term))
  }, [uniqueValues, searchTerm])

  // Initialize pending selections when opening dropdown
  useEffect(() => {
    if (isOpen) {
      setPendingSelections([...selectedValues])
    }
  }, [isOpen, selectedValues])

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        // Cancel pending changes when clicking outside
        setPendingSelections([...selectedValues])
        setIsOpen(false)
        setSearchTerm('')
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isOpen, selectedValues])

  const handleToggle = (e) => {
    e.stopPropagation()
    setIsOpen(!isOpen)
    if (!isOpen) {
      setSearchTerm('')
      setPendingSelections([...selectedValues])
    }
  }

  const handleValueToggle = (value) => {
    // Update pending selections (not applied yet)
    const newPending = pendingSelections.includes(value)
      ? pendingSelections.filter(v => v !== value)
      : [...pendingSelections, value]
    setPendingSelections(newPending)
  }

  const handleApply = (e) => {
    e.stopPropagation()
    // Apply pending selections
    onSelectionChange(pendingSelections)
    setIsOpen(false)
    setSearchTerm('')
  }

  const handleCancel = (e) => {
    e.stopPropagation()
    // Cancel and revert to current selections
    setPendingSelections([...selectedValues])
    setIsOpen(false)
    setSearchTerm('')
  }

  const handleClearAll = (e) => {
    e.stopPropagation()
    // Clear and immediately apply
    setPendingSelections([])
    onSelectionChange([])
  }

  const handleSelectAll = (e) => {
    e.stopPropagation()
    // Select all filtered values (respecting search)
    setPendingSelections([...filteredValues])
  }

  const selectedCount = selectedValues.length

  return (
    <div 
      className="filter-dropdown-container"
      ref={dropdownRef}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div className="filter-header-cell">
        <span className="column-name">{columnName}</span>
        {(isHovered || isOpen || selectedCount > 0) && (
          <button
            type="button"
            className={`filter-button ${selectedCount > 0 ? 'has-selection' : ''}`}
            onClick={handleToggle}
            aria-label={`Filter ${columnName}`}
          >
            <span className="filter-icon">⋯</span>
            {selectedCount > 0 && (
              <span className="filter-count">{selectedCount}</span>
            )}
          </button>
        )}
      </div>
      
      {isOpen && (
        <div className="filter-dropdown">
          <div className="filter-dropdown-header">
            <input
              type="text"
              className="filter-search-input"
              placeholder="Search..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onClick={(e) => e.stopPropagation()}
              autoFocus
            />
            <div className="filter-header-buttons">
              {filteredValues.length > 0 && (
                <button
                  type="button"
                  className="select-all-button"
                  onClick={handleSelectAll}
                  aria-label="Select all filtered"
                >
                  Select All
                </button>
              )}
              {pendingSelections.length > 0 && (
                <button
                  type="button"
                  className="clear-all-button"
                  onClick={handleClearAll}
                  aria-label="Clear all selections"
                >
                  Clear
                </button>
              )}
            </div>
          </div>
          <div className="filter-dropdown-list">
            {filteredValues.length === 0 ? (
              <div className="filter-no-results">No matching values</div>
            ) : (
              filteredValues.map((value) => {
                const isSelected = pendingSelections.includes(value)
                return (
                  <div
                    key={value}
                    className={`filter-option ${isSelected ? 'selected' : ''}`}
                    onClick={() => handleValueToggle(value)}
                  >
                    <span className="filter-checkbox">
                      {isSelected && '✓'}
                    </span>
                    <span className="filter-option-text">{value}</span>
                  </div>
                )
              })
            )}
          </div>
          <div className="filter-dropdown-footer">
            <button
              type="button"
              className="filter-apply-button"
              onClick={handleApply}
              aria-label="Apply filter"
            >
              <span className="apply-icon">✓</span>
              Apply
            </button>
            <button
              type="button"
              className="filter-cancel-button"
              onClick={handleCancel}
              aria-label="Cancel filter"
            >
              <span className="cancel-icon">✗</span>
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

export default FilterDropdown
