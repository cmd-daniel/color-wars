import React, { useRef, useEffect, useMemo } from 'react'
import { GameRenderer } from '@components/GameBoard/GameRenderer'
import { useStore } from '@/stores/sessionStore'
import { useMapStore } from '@/stores/mapStore'
import { createHollowGrid, computeViewBox } from '@/utils/gridUtils'
import { buildInnerPathFromSpec } from '@/utils/hexEdgeUtils'
import { INNER_EDGE_SPEC } from '@/utils/diceTrackConfig'
import { computeTerritoryRenderInfo } from '@/utils/territoryGeometry'
import type { TrackSpace } from '@/types/game'

const GameView = () => {
  // 1. Refs to hold the DOM element and the Engine instance
  const containerRef = useRef<HTMLDivElement>(null)
  const rendererRef = useRef<GameRenderer | null>(null)

  // 2. Selectors (Grab data from your stores)
  const mapData = useMapStore(s => s.map)
  const positionedHexes = useMapStore(s => s.positionedHexes)
  const players = useStore(s => s.state.game.players)
  const playerColors =  {}
  const territoryOwnership =  {}
  const trackSpaces:TrackSpace[] = []

  // 3. Memoize Geometry Calculations
  // We calculate the static shapes (Track) and dynamic shapes (Territories) here
  // so we don't block the UI thread during rendering.

  const trackGeometry = useMemo(() => {
    const grid = createHollowGrid()
    const [minX, minY, w, h] = computeViewBox(grid).split(' ').map(Number)
    const inner = buildInnerPathFromSpec(grid, INNER_EDGE_SPEC, { radius: 3 })
    
    return {
      hexes: Array.from(grid),
      viewBox: { minX, minY, width: w, height: h },
      innerLoop: inner.loop
    }
  }, [])

  const territoryInfo = useMemo(() => {
    if (!mapData || !positionedHexes.length) return []
    return computeTerritoryRenderInfo(mapData.territories, positionedHexes, mapData.grid.hexSize)
  }, [mapData, positionedHexes])

  // 4. Initialize the Engine (Runs once on mount)
  useEffect(() => {
    if (!containerRef.current) return

    const renderer = new GameRenderer()
    rendererRef.current = renderer
    
    const { width, height } = containerRef.current.getBoundingClientRect()
    
    // Initialize!
    renderer.init(containerRef.current, width, height, { 
      w: trackGeometry.viewBox.width, 
      h: trackGeometry.viewBox.height 
    }).then(() => {
        // Once init is done, load the static track immediately
        renderer.loadTrackData(trackGeometry, trackSpaces)
        
        // If map data happened to be ready already, load it too
        if (territoryInfo.length > 0) {
            // (We handle the coloring logic in the next useEffect, but this is a safety check)
        }
    })

    // Handle Window Resize
    const ro = new ResizeObserver(entries => {
      for(const e of entries) {
          renderer.resize(e.contentRect.width, e.contentRect.height)
      }
    })
    ro.observe(containerRef.current)

    // Cleanup on unmount
    return () => {
      ro.disconnect()
      renderer.destroy()
      rendererRef.current = null
    }
  }, []) // Empty dependency array = run once

  // 5. Sync Map Data (Runs when map loads or ownership changes)
  useEffect(() => {
    if (!rendererRef.current || !territoryInfo.length) return

    // Create the color lookup map based on current ownership
    const colorMap = new Map<string, string>()
    
    if (mapData) {
        mapData.territories.forEach(t => {
            // If owned, use player color. If not, use territory default color.
            const color = '#232323'
            colorMap.set(t.id, color || '#333333')
        })
    }

    // Push to Pixi
    rendererRef.current.loadMapData(positionedHexes, territoryInfo, colorMap)
    
  }, [territoryInfo, territoryOwnership, playerColors, mapData, positionedHexes])

  // 6. Sync Player Tokens (Runs frequently - Animation)
  useEffect(() => {
    if (!rendererRef.current) return

    // Convert players object to array if needed
    const playerArray = Object.values(players)
    
    // Push to Pixi
    rendererRef.current.updateGameState(playerArray, playerColors)
    
  }, [players, playerColors])


  return (
    // This div is the container where Pixi appends the <canvas>
    <div 
      ref={containerRef} 
      className="w-full h-full relative overflow-hidden bg-neutral-900"
    />
  )
}

export default GameView