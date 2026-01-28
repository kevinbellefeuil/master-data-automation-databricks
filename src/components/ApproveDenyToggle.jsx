import React from 'react'
import '../styles/ApproveDenyToggle.css'

/**
 * @exposes ApproveDenyToggle to #xss with user-provided data
 * @mitigates ApproveDenyToggle against #xss with React's built-in XSS protection
 */
const ApproveDenyToggle = ({ value, onChange }) => {
  const handleApprove = () => {
    onChange('approve')
  }

  const handleDeny = () => {
    onChange('deny')
  }

  return (
    <div className="approve-deny-container">
      <button
        type="button"
        className={`toggle-button approve-button ${value === 'approve' ? 'active' : ''}`}
        onClick={handleApprove}
        aria-label="Approve"
      >
        <span className="icon">✓</span>
        <span className="label">Approve</span>
      </button>
      <button
        type="button"
        className={`toggle-button deny-button ${value === 'deny' ? 'active' : ''}`}
        onClick={handleDeny}
        aria-label="Deny"
      >
        <span className="icon">✗</span>
        <span className="label">Deny</span>
      </button>
    </div>
  )
}

export default ApproveDenyToggle

