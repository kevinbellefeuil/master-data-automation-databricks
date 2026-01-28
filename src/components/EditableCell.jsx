import React, { useState, useEffect } from 'react'
import '../styles/EditableCell.css'

/**
 * @exposes EditableCell to #xss with user-provided value
 * @mitigates EditableCell against #xss with React's built-in XSS protection and controlled input
 */
const EditableCell = ({ value, onUpdate, placeholder = '' }) => {
  const [isEditing, setIsEditing] = useState(false)
  const [editValue, setEditValue] = useState(value || '')

  useEffect(() => {
    setEditValue(value || '')
  }, [value])

  const handleBlur = () => {
    setIsEditing(false)
    if (onUpdate && editValue !== value) {
      onUpdate(editValue)
    }
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      handleBlur()
    } else if (e.key === 'Escape') {
      setEditValue(value || '')
      setIsEditing(false)
    }
  }

  if (isEditing) {
    return (
      <input
        type="text"
        className="editable-input"
        value={editValue}
        onChange={(e) => setEditValue(e.target.value)}
        onBlur={handleBlur}
        onKeyDown={handleKeyDown}
        autoFocus
        placeholder={placeholder}
      />
    )
  }

  return (
    <div
      className="editable-cell"
      onClick={() => setIsEditing(true)}
      title="Click to edit"
    >
      {value || <span className="placeholder-text">{placeholder}</span>}
    </div>
  )
}

export default EditableCell

