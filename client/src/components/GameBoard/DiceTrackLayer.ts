// --- FILE: src/systems/layers/DiceTrackLayer.ts ---
import * as PIXI from 'pixi.js'
import { HexGraphics } from './HexGraphics'
import { TokenAnimator } from './TokenAnimator'
import type { TrackGeometry, TrackSpace } from '@/types/game'
import { GRID_CONFIG } from '@/utils/diceTrackConfig'
import type { PlainStateOf, PlayerState } from '@color-wars/shared/src/types/RoomState'

export class DiceTrackLayer extends PIXI.Container {
  private _animator: TokenAnimator
  private _tileCenters: Array<{ x: number; y: number }> = []

  constructor() {
    super()
    this.label = 'dice-track-layer'
    this.sortableChildren = true
    
    // Create sub-container for tokens to ensure they are always on top of tiles
    const tokenContainer = new PIXI.Container()
    tokenContainer.zIndex = 100
    this.addChild(tokenContainer)
    
    this._animator = new TokenAnimator(tokenContainer)
  }

  public initializeGeometry(track: TrackGeometry, spaces: TrackSpace[]) {
    // 1. Draw the "Dimmer" Mask (The Cutout)
    // We draw a giant rectangle, then CUT the inner loop out.
    if (track.innerLoop) {
      const mask = new PIXI.Graphics()
      mask.zIndex = 0
      
      // Giant dark rect
      mask.rect(track.viewBox.minX - 5000, track.viewBox.minY - 5000, 10000, 10000)
      mask.fill({ color: 0x222222, alpha: 0.95 }) // Dark overlay

      // The Hole
      HexGraphics.drawPoly(mask, track.innerLoop, { isHole: true, radius: 3 })
      
      this.addChild(mask)
    }

    // 2. Draw the Track Hexes
    // We use one Graphics object for all tiles to minimize draw calls, 
    // OR one Container with cached graphics if interactivity is needed.
    // Since these are static, let's use a single Graphics object for the base.
    const tilesG = new PIXI.Graphics()
    tilesG.zIndex = 1
    
    track.hexes.forEach((hex, i) => {
      const space = spaces[i] || { type: 'event' }
      const cx = (hex.corners[0].x + hex.corners[3].x) / 2
      const cy = (hex.corners[0].y + hex.corners[3].y) / 2
      this._tileCenters[i] = { x: cx, y: cy }

      // Styles
      const isStart = space.type === 'start'
      const fillColor = isStart ? 0x0ea5e9 : 0x1f2937
      const strokeColor = isStart ? 0xe0f2fe : 0x64748b

      HexGraphics.drawPoly(tilesG, hex.corners, {
        fill: fillColor,
        alpha: 0.9,
        stroke: strokeColor,
        strokeWidth: isStart ? 2 : 1,
        radius: 3
      })

      // Icons/Text (Instantiated as PIXI.Text for sharpness)
      if (space.label || space.event || isStart) {
        const label = isStart ? "START" : (space.event?.icon || "")
        if (label) {
          const text = new PIXI.Text({
            text: label,
            style: {
              fontSize: GRID_CONFIG.hexDimensions * (isStart ? 0.3 : 0.5),
              fill: 0xffffff,
              fontFamily: 'Segoe UI Emoji' // Good for icons
            }
          })
          text.anchor.set(0.5)
          text.position.set(cx, cy)
          text.zIndex = 2
          this.addChild(text)
        }
      }
    })
    
    this.addChild(tilesG)
    
    // Update animator with new centers
    this._animator.setGeometry(this._tileCenters)
  }

  public updateState(players: PlainStateOf<PlayerState>[], colors: Record<string, string>) {
    this._animator.updatePlayers(players, colors)
  }

  public onTick(deltaMS: number) {
    this._animator.update(deltaMS)
  }
}