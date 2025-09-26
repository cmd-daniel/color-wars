import { defineHex, Direction, fromCoordinates, Grid, Hex, move, Orientation, type Traverser } from 'honeycomb-grid'
import { useLayoutEffect, useEffect, useState, useRef } from 'react'
import { initializeDemoGame } from '@/stores/gameStoreHelpers'
import HexCell from './HexCell'
import styles from './HollowGrid.module.css'

// Grid configuration constants
const GRID_CONFIG = {
  hexDimensions: 24,
  hexOrigin: 'topLeft' as const,
  viewBoxPadding: 10,
  defaultViewBox: "0 0 100 100",
  // Gap configuration
  hexScale: 0.97, // Scale factor (0.85 = 15% gap between hexes)
  gapColor: '#1a1a1a00' // Background color visible in gaps
}

/**
 * HollowGrid Component
 * 
 * Responsibilities:
 * - Generate hollow hexagonal grid layout (rectangular path)
 * - Integrate PixiJS viewport for center area interactions
 * - Calculate SVG viewBox and positioning
 * - Provide SVG container for HexCell components
 * - Initialize demo game state
 * 
 * Does NOT handle:
 * - Individual hex rendering (delegated to HexCell)
 * - Game logic (delegated to game store)
 * - Hex interactions (delegated to HexCell)
 * - PixiJS content (delegated to PixiJS components)
 */
const HollowGrid = () => {
    const [gridData, setGridData] = useState<{ 
      hexes: Hex[], 
      viewBox: string 
    }>({ hexes: [], viewBox: GRID_CONFIG.defaultViewBox })
    
    const pixiContainerRef = useRef<HTMLDivElement>(null)
    const svgRef = useRef<SVGSVGElement>(null)

    // Initialize demo game on component mount
    useEffect(() => {
        initializeDemoGame()
    }, [])

    useLayoutEffect(() => {
        // === 1. Create Hollow Hexagonal Grid ===
        const Hexagon = defineHex({ 
            dimensions: GRID_CONFIG.hexDimensions, 
            origin: GRID_CONFIG.hexOrigin,
            orientation:Orientation.FLAT
        })
        
        // Create hollow rectangular path (32 hexes)

        const hollowPath: Array<Traverser<Hex>> = []
        
        hollowPath.push(fromCoordinates({q:0, r:0, s:0}))
        for (let i=0; i<5; i++){
            hollowPath.push(move(Direction.NE))
            hollowPath.push(move(Direction.SE))
        }
        for (let i=0; i<7; i++){
            hollowPath.push(move(Direction.S))
        }
        for (let i=0; i<5; i++){
            hollowPath.push(move(Direction.SW))
            hollowPath.push(move(Direction.NW))
        }
        for (let i=0; i<7; i++){
            hollowPath.push(move(Direction.N))
        }
        
        
        const grid = new Grid(Hexagon, hollowPath)
        
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
        <div className={`${styles.container} ${styles.debug}`}>
            {/* PixiJS container - full area, interactive */}
            <div 
                ref={pixiContainerRef}
                className={styles.pixiContainer}
            >
            {/* PixiJS viewport component */}
            {/* <PixiViewport containerRef={pixiContainerRef} /> */}
            </div>
            
            {/* SVG grid - no pointer events, just visual */}
            <svg 
                ref={svgRef}
                className={styles.gridSvg}
                viewBox={gridData.viewBox}
                preserveAspectRatio="xMidYMid meet" 
                width="100%" 
                height="100%"
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

export default HollowGrid
