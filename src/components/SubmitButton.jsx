import React, { useState } from 'react'
import '../styles/SubmitButton.css'

/**
 * @exposes SubmitButton to #xss with user-provided data
 * @mitigates SubmitButton against #xss with React's built-in XSS protection
 */
const SubmitButton = ({ 
  data, 
  onSubmit, 
  isSubmitting = false 
}) => {
  const [showPopup, setShowPopup] = useState(false)
  const [actionCount, setActionCount] = useState(0)

  const getActionCount = () => {
    if (!data) return 0
    return data.filter(row => row.approval === 'approve' || row.approval === 'deny').length
  }

  const currentActionCount = getActionCount()
  const isDisabled = currentActionCount === 0 || isSubmitting

  const handleSubmit = () => {
    if (!isDisabled && data) {
      const approved = data.filter(row => row.approval === 'approve')
      const denied = data.filter(row => row.approval === 'deny')

      const totalActions = approved.length + denied.length
      setActionCount(totalActions)
      setShowPopup(true)

      // Trigger animation
      const button = document.querySelector('.submit-button:not(.disabled)')
      if (button) {
        button.classList.add('submit-animating')
        setTimeout(() => {
          button.classList.remove('submit-animating')
        }, 600)
      }

      // Call onSubmit after animation
      setTimeout(() => {
        onSubmit({
          approved,
          denied
        })
      }, 300)
    }
  }

  const handleClosePopup = () => {
    setShowPopup(false)
  }

  return (
    <>
      <div className="submit-section">
        <div className="submit-info">
          <span className="action-count">
            {currentActionCount} action{currentActionCount !== 1 ? 's' : ''} selected
          </span>
          {currentActionCount > 0 && (
            <span className="submit-hint">
              Review your selections and click Submit to apply changes
            </span>
          )}
        </div>
        <button
          type="button"
          className={`submit-button ${isDisabled ? 'disabled' : ''}`}
          onClick={handleSubmit}
          disabled={isDisabled}
        >
          {isSubmitting ? 'Submitting...' : 'Submit'}
        </button>
      </div>
      
      {showPopup && (
        <div className="popup-overlay" onClick={handleClosePopup}>
          <div className="popup-content" onClick={(e) => e.stopPropagation()}>
            <button className="popup-close" onClick={handleClosePopup}>×</button>
            <div className="popup-icon">✓</div>
            <h2 className="popup-title">Submission Successful!</h2>
            <p className="popup-message">
              You have taken action on <strong>{actionCount}</strong> Planning Unit{actionCount !== 1 ? 's' : ''}.
            </p>
          </div>
        </div>
      )}
    </>
  )
}

export default SubmitButton

