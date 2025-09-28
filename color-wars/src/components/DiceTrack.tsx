import { Grid, Hex } from 'honeycomb-grid'
import { useLayoutEffect, useMemo, useState } from 'react'
import HexCell from '@components/HexCell.tsx'
import MapViewport from '@components/MapViewport'
import styles from './DiceTrack.module.css'
import { GRID_CONFIG, SHOW_DEBUG_POINTS, INNER_EDGE_SPEC } from '@/utils/diceTrackConfig'
import { createHollowGrid, computeViewBox } from '@/utils/gridUtils'
import { buildInnerPathFromSpec } from '@/utils/hexEdgeUtils'


// ==========================
// Component
// ==========================
const DiceTrack = () => {
  const [gridData, setGridData] = useState<{ hexes: Hex[]; viewBox: string; grid: Grid<Hex> | null }>({
    hexes: [],
    viewBox: GRID_CONFIG.defaultViewBox,
    grid: null,
  })


  useLayoutEffect(() => {
    const grid = createHollowGrid()
    const viewBox = computeViewBox(grid)
    setGridData({ hexes: Array.from(grid), viewBox, grid })
  }, [])

  const built = gridData.grid
    ? buildInnerPathFromSpec(gridData.grid, INNER_EDGE_SPEC, {
        radius: 3,
        edgeScaleForLoop: 1, // **important**: unscaled edges so joints meet perfectly
      })
    : { d: '', loop: null }

  const maskId = useMemo(() => `gridMask-${Math.round(Math.random() * 1_000_000)}`, [])

  return (
    <div className={styles.container}>
      <div className={styles.mapViewport}>
        <MapViewport className={styles.overlayViewport} background={0x000000} transparent />
      </div>
      <svg
        className={styles.gridSvg}
        viewBox={gridData.viewBox}
        preserveAspectRatio="xMidYMid meet"
        width="100%"
        height="100%"
      >
        {/* Mask with stroke-based padding */}
        {gridData.grid && (
          <defs>
            <mask id={maskId} maskUnits="userSpaceOnUse">
              <rect x={-9999} y={-9999} width={20000} height={20000} fill="white" />
              {/* base hole */}
              <path d={built.d} fill="black" />
              {/* extra padding via stroke (easiest to maintain) */}
              {/* <path
                d={built.d}
                fill="black"
                stroke="white"
                strokeWidth={GAP * 2}
                strokeLinejoin="round"
                strokeLinecap="round"
              /> */}
            </mask>
          </defs>
        )}

        {/* Dark overlay that doesn't block interactions */}
        {gridData.grid && (
          <rect
            x={-9999}
            y={-9999}
            width={20000}
            height={20000}
            fill="var(--background)"
            mask={`url(#${maskId})`}
            pointerEvents="none"
          />
        )}

        {/* Hex ring */}
        {gridData.hexes.map((hex) => (
          <HexCell key={`${hex.q},${hex.r}`} hex={hex} />
        ))}

        {/* Optional debug: see loop vertices */}
        {SHOW_DEBUG_POINTS && built.loop?.map((p, i) => (
          <circle key={i} cx={p.x} cy={p.y} r={0.9} fill="#0ff" />
        ))}
      </svg>
    </div>
  )
}

export default DiceTrack
