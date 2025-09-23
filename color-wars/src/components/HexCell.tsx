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
  
  // Purchase failure state
  const [purchaseFailed, setPurchaseFailed] = useState(false)
  
  // Get store methods and state
  const buyHexCell = useGameStore(state => state.buyHexCell)
  
  // Subscribe to this specific hex state using our new store structure
  const hexState = useGameStore(state => state.getHexCell(hex.q, hex.r, hex.s))
  
  // Get current player and hex owner information
  const currentPlayer = useGameStore(state => state.getCurrentPlayer())
  const getPlayerById = useGameStore(state => state.getPlayerById)
  
  // Track the display color (what the user actually sees)
  const [displayColor, setDisplayColor] = useState<string>('#303030')
  
  // Get the hex owner's color
  const hexOwner = hexState?.ownerId ? getPlayerById(hexState.ownerId) : null
  const newColor = hexOwner?.color || '#303030'
  
  // React to color changes and trigger ripple animation
  useEffect(() => {
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
  }, [newColor, displayColor])
  
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
  
  // Handle click - attempt to buy the hex cell
  const handleClick = () => {
    if (!currentPlayer || !currentPlayer.canBuy) {
      console.log('Cannot buy hex: not your turn or no buy permission')
      return
    }
    
    if (hexState?.ownerId) {
      console.log('Cannot buy hex: already owned')
      return
    }
    
    const success = buyHexCell(hex.q, hex.r, hex.s)
    if (success) {
      console.log(`${currentPlayer.name} bought hex (${hex.q},${hex.r},${hex.s}) for $${hexState?.cost}`)
    } else {
      console.log('Failed to buy hex')
      // Trigger visual feedback for failed purchase
      setPurchaseFailed(true)
      setTimeout(() => setPurchaseFailed(false), 200) // Reset after 1 second
    }
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
        className={`${styles.hexCell} ${rippleState ? "animating" : ""} ${purchaseFailed ? styles.purchaseFailed : ""}`}
        fill={purchaseFailed ? '#ff4444' : displayColor}
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
      
      {/* No money symbol overlay */}
      {purchaseFailed && (
        <g className={styles.noMoneySymbol}>
          <text
            x={hex.corners.reduce((sum, corner) => sum + corner.x, 0) / hex.corners.length}
            y={hex.corners.reduce((sum, corner) => sum + corner.y, 0) / hex.corners.length}
            textAnchor="middle"
            dominantBaseline="middle"
            fontSize="20"
            fill="white"
            fontWeight="bold"
            stroke="black"
            strokeWidth="0.5"
          >
            $
          </text>
          <line
            x1={hex.corners.reduce((sum, corner) => sum + corner.x, 0) / hex.corners.length - 8}
            y1={hex.corners.reduce((sum, corner) => sum + corner.y, 0) / hex.corners.length - 8}
            x2={hex.corners.reduce((sum, corner) => sum + corner.x, 0) / hex.corners.length + 8}
            y2={hex.corners.reduce((sum, corner) => sum + corner.y, 0) / hex.corners.length + 8}
            stroke="red"
            strokeWidth="3"
            strokeLinecap="round"
          />
        </g>
      )}
    </g>
  )
}

export default HexCell
