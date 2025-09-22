import { defineHex, Grid, ring, Hex } from 'honeycomb-grid'
import { useLayoutEffect, useEffect, useState } from 'react'
import { initializeDemoGame } from '@/stores/gameStoreHelpers'
import HexCell from './HexCell'
import styles from './HexGrid.module.css'

// Grid configuration constants
const GRID_CONFIG = {
  hexDimensions: 30,
  hexOrigin: 'topLeft' as const,
  gridRadius: 3,
  viewBoxPadding: 10,
  defaultViewBox: "0 0 100 100",
  // Gap configuration
  hexScale: 0.95, // Scale factor (0.85 = 15% gap between hexes)
  gapColor: '#1a1a1a00' // Background color visible in gaps
}

/**
 * HexGrid Component
 * 
 * Responsibilities:
 * - Generate hexagonal grid layout using honeycomb-grid
 * - Calculate SVG viewBox and positioning
 * - Provide SVG container for HexCell components
 * - Initialize demo game state
 * 
 * Does NOT handle:
 * - Individual hex rendering (delegated to HexCell)
 * - Game logic (delegated to game store)
 * - Hex interactions (delegated to HexCell)
 */
const HexGrid = () => {
    const [gridData, setGridData] = useState<{ 
      hexes: Hex[], 
      viewBox: string 
    }>({ hexes: [], viewBox: GRID_CONFIG.defaultViewBox })

    // Initialize demo game on component mount
    useEffect(() => {
        initializeDemoGame()
    }, [])

    useLayoutEffect(() => {
        // === 1. Create Hexagonal Grid ===
        const Hexagon = defineHex({ 
            dimensions: GRID_CONFIG.hexDimensions, 
            origin: GRID_CONFIG.hexOrigin 
        })
        // Create rings
        const rings = new Grid(Hexagon, [
            ring({ center: new Hexagon(), radius: GRID_CONFIG.gridRadius }),
            ring({ center: new Hexagon(), radius: GRID_CONFIG.gridRadius-1 }),
            ring({ center: new Hexagon(), radius: GRID_CONFIG.gridRadius-2 }),
        ])
        
        // Create center hexagon separately
        const centerGrid = new Grid(Hexagon, [{ q: 0, r: 0 }])
        
        // Combine both grids
        const grid = new Grid(Hexagon, [...rings, ...centerGrid])
        
        // === 2. Calculate Bounding Box ===
        let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity
        
        grid.forEach(hex => {
            hex.corners.forEach(({ x, y }) => {
                minX = Math.min(minX, x)
                minY = Math.min(minY, y)
                maxX = Math.max(maxX, x)
                maxY = Math.max(maxY, y)
            })
        })
        
        // === 3. Calculate SVG ViewBox ===
        const padding = GRID_CONFIG.viewBoxPadding
        const viewBoxWidth = (maxX - minX) + 2 * padding
        const viewBoxHeight = (maxY - minY) + 2 * padding
        const viewBoxX = minX - padding
        const viewBoxY = minY - padding
        const viewBox = `${viewBoxX} ${viewBoxY} ${viewBoxWidth} ${viewBoxHeight}`
        
        // === 4. Update Component State ===
        setGridData({ 
          hexes: Array.from(grid), 
          viewBox 
        })
    }, [])

    return (
        <div className={styles.container}>
            <svg 
                className={styles.svg}
                viewBox={gridData.viewBox}
                preserveAspectRatio="xMidYMid meet" 
                width="100%" 
                height="100%"
                style={{ 
                    backgroundColor: GRID_CONFIG.gapColor,
                    '--gap-color': GRID_CONFIG.gapColor 
                } as React.CSSProperties}
            >
                {/* Render HexCell components as JSX */}
                {gridData.hexes.map((hex) => (
                    <HexCell 
                        key={`${hex.q},${hex.r}`}
                        hex={hex}
                        scale={GRID_CONFIG.hexScale}
                    />
                ))}
            </svg>
        </div>
    )
}

export default HexGrid