import { useEffect, useRef } from 'react'
import { Svg } from '@svgdotjs/svg.js'
import { Hex } from 'honeycomb-grid'
import { useGameStore } from '@/stores/gameStore'
import { switchToNextPlayer } from '@/stores/gameStoreHelpers'

interface PolygonProps {
  hex: Hex
  draw: Svg
  onPolygonCreated?: (hexKey: string, polygon: any) => void
}

const Polygon = ({ hex, draw, onPolygonCreated }: PolygonProps) => {
  const polygonRef = useRef<any>(null)
  const hexKey = `${hex.q},${hex.r}`
  
  // Get store methods
  const initializeHex = useGameStore(state => state.initializeHex)
  
  // Create polygon on mount
  useEffect(() => {
    // Initialize this hex in the store
    initializeHex(hex.q, hex.r)
    
    // Create the polygon
    const polygon = draw
      .polygon(hex.corners.flatMap(({ x, y }) => [x, y]))
      .addClass('hex-cell')
      .attr("data-coords", hexKey)
      .on('click', () => {
        // Get current state at click time
        const currentState = useGameStore.getState()
        if (currentState.currentPlayerId) {
          currentState.claimHex(hex.q, hex.r, currentState.currentPlayerId)
          // Switch to next player after claiming
          setTimeout(() => switchToNextPlayer(), 600)
        }
      })

    polygonRef.current = polygon
    
    // Get initial state and apply it
    const initialState = useGameStore.getState().hexes[hexKey]
    if (initialState) {
      polygon.fill(initialState.color)
      if (initialState.owner) {
        polygon.addClass('owned')
      }
    }
    
    // Notify parent component
    if (onPolygonCreated) {
      onPolygonCreated(hexKey, polygon)
    }
    
    // Cleanup
    return () => {
      if (polygonRef.current) {
        polygonRef.current.remove()
      }
    }
  }, [hex, draw, hexKey, initializeHex, onPolygonCreated])

  // Subscribe to state changes for this specific hex
  useEffect(() => {
    const unsubscribe = useGameStore.subscribe(
      (state) => state.hexes[hexKey],
      (hexState) => {
        const polygon = polygonRef.current
        if (polygon && hexState) {
          // Update polygon styling
          polygon.fill(hexState.color)
          
          // Handle animation state
          if (hexState.isAnimating) {
            polygon.addClass('animating')
          } else {
            polygon.removeClass('animating')
          }
          
          // Add owner class for styling
          if (hexState.owner) {
            polygon.addClass('owned')
          } else {
            polygon.removeClass('owned')
          }
        }
      },
      {
        // Only trigger when this specific hex actually changes
        equalityFn: (a, b) => {
          if (!a && !b) return true
          if (!a || !b) return false
          return a.color === b.color && 
                 a.owner === b.owner && 
                 a.isAnimating === b.isAnimating
        }
      }
    )

    return unsubscribe
  }, [hexKey])

  // This component doesn't render anything to the DOM
  // It manages the SVG polygon through side effects
  return null
}

export default Polygon
