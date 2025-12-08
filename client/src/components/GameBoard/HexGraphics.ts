// --- FILE: src/systems/graphics/HexGraphics.ts ---
import * as PIXI from 'pixi.js'
import type { Point } from '@/utils/geometryUtils'

// Cached reusable geometry helper
export const HexGraphics = {
  /**
   * Draws a rounded polygon. 
   * If `isHole` is true, it performs a cut() operation for masking.
   */
  drawPoly(
    g: PIXI.Graphics,
    points: Point[],
    options: {
      radius?: number
      fill?: number
      alpha?: number
      stroke?: number
      strokeWidth?: number
      isHole?: boolean
    }
  ) {
    const { radius = 3, fill = 0xffffff, alpha = 1, stroke, strokeWidth = 1, isHole = false } = options
    const len = points.length
    if (len < 3) return

    g.beginPath()

    for (let i = 0; i < len; i++) {
      const prev = points[(i - 1 + len) % len]
      const curr = points[i]
      const next = points[(i + 1) % len]

      // Vector math for corners
      const v1x = curr.x - prev.x, v1y = curr.y - prev.y
      const v2x = next.x - curr.x, v2y = next.y - curr.y
      const l1 = Math.sqrt(v1x * v1x + v1y * v1y) || 0.1
      const l2 = Math.sqrt(v2x * v2x + v2y * v2y) || 0.1

      const r = Math.min(radius, l1 / 2, l2 / 2)
      
      const n1x = v1x / l1, n1y = v1y / l1
      const n2x = v2x / l2, n2y = v2y / l2

      const p1x = curr.x - n1x * r, p1y = curr.y - n1y * r
      const p2x = curr.x + n2x * r, p2y = curr.y + n2y * r

      if (i === 0) g.moveTo(p1x, p1y)
      else g.lineTo(p1x, p1y)
      
      g.quadraticCurveTo(curr.x, curr.y, p2x, p2y)
    }

    g.closePath()

    if (isHole) {
      g.cut() // PIXI v8 specific: cuts a hole in the current shape
    } else {
      if (options.fill !== undefined) g.fill({ color: fill, alpha })
      if (stroke !== undefined) g.stroke({ width: strokeWidth, color: stroke, alpha: 0.8, join: 'round' })
    }
  }
}