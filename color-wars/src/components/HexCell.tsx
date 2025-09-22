import { useEffect, useMemo, useState, useRef } from 'react'
import { Hex } from 'honeycomb-grid'
import { useGameStore } from '@/stores/gameStore'
import styles from './HexCell.module.css'

interface HexCellProps {
  hex: Hex
  scale?: number // Scale factor to create gaps between hexes
}

/**
 * HexCell Component
 * 
 * Responsibilities:
 * - Render individual hexagon as SVG polygon
 * - Handle hex click interactions
 * - Subscribe to hex state changes from store
 * - Apply visual styling based on hex state (owned, animating, etc.)
 * - Scale hex size to create gaps between adjacent hexes
 * 
 * Does NOT handle:
 * - Grid layout (delegated to HexGrid)
 * - Game logic validation (delegated to game store)
 * - Turn management (delegated to game store)
 */
const HexCell = ({ hex, scale = 1 }: HexCellProps) => {
  const hexKey = `${hex.q},${hex.r}`
  const polygonRef = useRef<SVGPolygonElement>(null)
  
  // Ripple effect state
  const [rippleState, setRippleState] = useState<{
    isActive: boolean
    targetColor: string
  } | null>(null)
  
  // Get store methods and state
  const initializeHex = useGameStore(state => state.initializeHex)
  const attemptClaimHex = useGameStore(state => state.attemptClaimHex)
  
  // Subscribe to this specific hex state
  const hexState = useGameStore(state => state.hexes[hexKey])
  
  // Initialize hex in store on mount
  useEffect(() => {
    initializeHex(hex.q, hex.r)
  }, [hex.q, hex.r, initializeHex])

  // Track the display color (what the user actually sees)
  const [displayColor, setDisplayColor] = useState<string>('#303030')
  
  // React to color changes and trigger ripple animation
  useEffect(() => {
    const newColor = hexState?.color || '#303030'
    
    // Trigger ripple when color changes to a new value
    if (newColor !== displayColor) {
      // Start ripple animation when color changes
      setRippleState({
        isActive: true,
        targetColor: newColor
      })
      
      // Update display color only after animation completes
      setTimeout(() => {
        setDisplayColor(newColor)
        setRippleState(null)
      }, 500)
    }
  }, [hexState?.color, displayColor])
  
  // Memoize points string for performance with scaling applied
  const points = useMemo(() => {
    // Calculate center of the hex for scaling
    const centerX = hex.corners.reduce((sum, corner) => sum + corner.x, 0) / hex.corners.length
    const centerY = hex.corners.reduce((sum, corner) => sum + corner.y, 0) / hex.corners.length
    
    // Scale each corner relative to the center
    return hex.corners.map(({ x, y }) => {
      const scaledX = centerX + (x - centerX) * scale
      const scaledY = centerY + (y - centerY) * scale
      return `${scaledX},${scaledY}`
    }).join(' ')
  }, [hex.corners, scale])
  
  // Handle click - just game logic, no animation
  const handleClick = () => {
    attemptClaimHex(hex.q, hex.r)
  }
  
  
  return (
    <g>
      {/* Base hexagon */}
      <polygon
        ref={polygonRef}
        points={points}
        // The original code attempts to concatenate a string with an object, which is incorrect.
        // To conditionally add a class based on rippleState, use a template literal or string concatenation.
        // Here, we add a class "asdf" if rippleState is truthy, otherwise "sdf".
        className={`${styles.hexCell} ${rippleState ? "animating" : ""}`}
        fill={displayColor}
        data-coords={hexKey}
        onClick={handleClick}
        style={{ cursor: 'pointer' }}
      />
      
      {/* Ripple overlay */}
      {rippleState && (
        <polygon
          points={points}
          fill={rippleState.targetColor}
          className={`${styles.rippleOverlay} ${styles.rippleExpand}`}
          pointerEvents="none"
        />
      )}
    </g>
  )
}

export default HexCell
