import { useEffect, useState, useRef, useLayoutEffect } from 'react'
import { Hex } from 'honeycomb-grid'
import { useGameStore } from '@/stores/gameStore'
import styles from './HexCell.module.css'
import treasureChestImage from '../assets/treasure-chest.png'

interface HexCellProps {
  hex: Hex
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
const HexCell = ({ hex }: HexCellProps) => {
  const hexKey = `${hex.q},${hex.r}`
  const polygonRef = useRef<SVGPolygonElement>(null)
  
  // Ripple effect state
  const [rippleState, setRippleState] = useState<{
    isActive: boolean
    targetColor: string
  } | null>(null)
  
  
  // Hover state
  const [isHovered, setIsHovered] = useState(false)
  
  // Subscribe to this specific hex state using our new store structure
  const hexState = useGameStore(state => state.getHexCell(hex.q, hex.r, hex.s))
  const getPlayerById = useGameStore(state => state.getPlayerById)
  
  // Track the display color (what the user actually sees)
  const [displayColor, setDisplayColor] = useState<string>('#303030')

  const [bbox, setBbox] = useState<{ x: number; y: number; width: number; height: number } | null>(null);

  useLayoutEffect(() => {
    if (polygonRef.current) {
      console.log('is this working?')
      const box = polygonRef.current.getBBox();
      setBbox({
        x: Math.round(box.x),
        y: Math.round(box.y),
        width: Math.round(box.width),
        height: Math.round(box.height),
      });
    }
  }, []);

  if (!bbox){
    console.log("wtf")
  }
  
  // Get the hex owner's color
  const hexOwner = hexState?.ownerId ? getPlayerById(hexState.ownerId) : null
  const newColor = hexOwner?.color || '#303030'
  
  // Calculate hover color (brighten the current color)
  const getHoverColor = (color: string) => {
    // Convert hex to RGB, brighten, and convert back
    const hex = color.replace('#', '')
    const r = Math.min(255, parseInt(hex.substr(0, 2), 16) + 40)
    const g = Math.min(255, parseInt(hex.substr(2, 2), 16) + 40)
    const b = Math.min(255, parseInt(hex.substr(4, 2), 16) + 40)
    return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`
  }
  
  // Get the current color (base or hover)
  const currentColor = isHovered ? getHoverColor(displayColor) : displayColor
  
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

  /**
 * Create an SVG path string for a polygon with rounded corners and scaling
 * @param {Array<{x:number, y:number}>} points - Polygon points
 * @param {number} radius - Corner radius
 * @param {number} scale - Scale factor (0-1)
 * @returns {string} - SVG path "d" attribute
 */
function roundedPolygonPath(points:{x:number, y:number}[], radius:number, scale = 0.97) {
  const len = points.length;
  if (len < 3) return "";

  // --- scale polygon around centroid ---
  const cx = points.reduce((sum, p) => sum + p.x, 0) / len;
  const cy = points.reduce((sum, p) => sum + p.y, 0) / len;

  const scaled = points.map(p => ({
    x: cx + (p.x - cx) * scale,
    y: cy + (p.y - cy) * scale,
  }));

  let d = "";

  for (let i = 0; i < len; i++) {
    const prev = scaled[(i - 1 + len) % len];
    const curr = scaled[i];
    const next = scaled[(i + 1) % len];

    // vectors
    const v1 = { x: curr.x - prev.x, y: curr.y - prev.y };
    const v2 = { x: next.x - curr.x, y: next.y - curr.y };

    // normalize
    const len1 = Math.hypot(v1.x, v1.y);
    const len2 = Math.hypot(v2.x, v2.y);
    const n1 = { x: v1.x / len1, y: v1.y / len1 };
    const n2 = { x: v2.x / len2, y: v2.y / len2 };

    // clamp radius to fit edge
    const r = Math.min(radius, len1 / 2, len2 / 2);

    // rounded corner points
    const p1 = { x: curr.x - n1.x * r, y: curr.y - n1.y * r };
    const p2 = { x: curr.x + n2.x * r, y: curr.y + n2.y * r };

    if (i === 0) {
      d += `M ${p1.x} ${p1.y} `;
    } else {
      d += `L ${p1.x} ${p1.y} `;
    }

    // quadratic Bézier curve
    d += `Q ${curr.x} ${curr.y} ${p2.x} ${p2.y} `;
  }

  d += "Z";
  return d;
}
  
  // Handle hover events
  const handleMouseEnter = () => {
    setIsHovered(true)
  }
  
  const handleMouseLeave = () => {
    setIsHovered(false)
  }
  
  // Handle click - attempt to buy the hex cell
  const handleClick = () => {

  }
  
  
  return (
    <g>
      {/* Base hexagon */}
      <path
        ref={polygonRef}
        d={roundedPolygonPath(hex.corners,3)}
        className={`${styles.hexCell} ${rippleState ? "animating" : ""} ${isHovered ? styles.hovered : ""}`}
        fill={currentColor}
        data-coords={hexKey}
        onClick={handleClick}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        style={{ cursor: 'pointer' }}>
        </path>
        {bbox && <foreignObject x={bbox.x} y={bbox.y} width={bbox.width} height={bbox.height}>
          <div className='w-full h-full flex flex-col items-center justify-center'>
            <img src={treasureChestImage} width={16} alt="Treasure Chest"></img>
            <p className='text-[5px]'>Treasure Chest</p>
          </div>
        </foreignObject>}
        
    </g>
  )
}

export default HexCell
