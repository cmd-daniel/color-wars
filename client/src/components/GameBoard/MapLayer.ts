// --- FILE: src/systems/layers/MapLayer.ts ---
import * as PIXI from 'pixi.js'
import { HexGraphics } from './HexGraphics'
import type { PositionedHex, TerritoryId } from '@/types/map'
import type { TerritoryRenderInfo } from '@/utils/territoryGeometry'

export class MapLayer extends PIXI.Container {
  constructor() {
    super()
    this.label = 'map-layer'
  }

  public renderMap(
    hexes: PositionedHex[], 
    territories: TerritoryRenderInfo[], 
    colors: Map<TerritoryId, string>
  ) {
    this.removeChildren()
    
    // Optimization: Draw all hexes in one Graphics object
    const mapG = new PIXI.Graphics()
    this.addChild(mapG)

    // Draw Hexes
    hexes.forEach(hex => {
      const colorStr = hex.territoryId ? colors.get(hex.territoryId) : '#333333'
      const color = parseInt((colorStr || '#333333').replace('#', ''), 16)
      
      HexGraphics.drawPoly(mapG, hex.corners, {
        fill: color,
        alpha: 1,
        radius: 0 // Sharp corners for map usually, or 1 for slight soft
      })
    })

    // Draw Territory Outlines (Thick borders)
    const outlinesG = new PIXI.Graphics()
    this.addChild(outlinesG)
    
    territories.forEach(t => {
      t.outline.forEach(loop => {
        HexGraphics.drawPoly(outlinesG, loop, {
          stroke: 0x222222,
          strokeWidth: 2,
          alpha: 0.5
        })
      })
      
      // Labels
      const text = new PIXI.Text({
        text: t.name,
        style: {
          fontSize: t.labelFontSize,
          fill: 0xffffff,
          stroke: { color: 0x000000, width: 3, join: 'round' },
          fontFamily: 'Arial',
          fontWeight: 'bold'
        }
      })
      text.anchor.set(0.5)
      text.position.set(t.labelPosition.x, t.labelPosition.y)
      this.addChild(text)
    })
  }
}