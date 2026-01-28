import React, { useState, useRef, useEffect } from 'react'
import '../styles/InfoButton.css'

/**
 * @exposes InfoButton to #xss with user-provided info text
 * @mitigates InfoButton against #xss with React's built-in XSS protection
 */
const InfoButton = ({ infoText }) => {
  const [isHovered, setIsHovered] = useState(false)
  const tooltipRef = useRef(null)
  const containerRef = useRef(null)

  useEffect(() => {
    if (isHovered && tooltipRef.current && containerRef.current) {
      // Use requestAnimationFrame to ensure tooltip is rendered before calculating
      requestAnimationFrame(() => {
        const tooltip = tooltipRef.current
        const container = containerRef.current
        if (!tooltip || !container) return
        
        const rect = container.getBoundingClientRect()
        const tooltipRect = tooltip.getBoundingClientRect()
        
        // Calculate position relative to viewport (since tooltip is now fixed)
        const buttonCenterX = rect.left + (rect.width / 2)
        let tooltipLeft = buttonCenterX - (tooltipRect.width / 2)
        
        // Ensure tooltip doesn't go off the left edge
        if (tooltipLeft < 20) {
          tooltipLeft = 20
        }
        
        // Ensure tooltip doesn't go off the right edge
        if (tooltipLeft + tooltipRect.width > window.innerWidth - 20) {
          tooltipLeft = window.innerWidth - tooltipRect.width - 20
        }
        
        // Position above the button
        const tooltipTop = rect.top - tooltipRect.height - 8
        
        tooltip.style.left = `${tooltipLeft}px`
        tooltip.style.top = `${tooltipTop}px`
        tooltip.style.transform = 'none'
      })
    }
  }, [isHovered])

  return (
    <div className="info-button-container" ref={containerRef}>
      <button
        className="info-button"
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        aria-label="Show information"
        type="button"
      >
        <span className="info-icon">i</span>
      </button>
      {isHovered && (
        <div className="info-tooltip" ref={tooltipRef}>
          {infoText}
        </div>
      )}
    </div>
  )
}

export default InfoButton

