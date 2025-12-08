// --- FILE: src/systems/GameRenderer.ts ---
import * as PIXI from 'pixi.js'
import { Viewport } from 'pixi-viewport'
import { MapLayer } from './MapLayer'
import { DiceTrackLayer } from './DiceTrackLayer'
import type { TrackGeometry, TrackSpace } from '@/types/game'
import type { PositionedHex, TerritoryId } from '@/types/map'
import type { TerritoryRenderInfo } from '@/utils/territoryGeometry'
import type { PlainStateOf, PlayerState } from '@color-wars/shared/src/types/RoomState'

export class GameRenderer {
  public app: PIXI.Application
  public viewport!: Viewport 
  
  public mapLayer: MapLayer
  public trackLayer: DiceTrackLayer

  // 1. Add a flag to track state
  private _isDestroyed = false

  constructor() {
    this.app = new PIXI.Application()
    this.mapLayer = new MapLayer()
    this.trackLayer = new DiceTrackLayer()
  }

  async init(element: HTMLElement, width: number, height: number, worldSize: { w: number, h: number }) {
    // 2. Guard: Don't start if already destroyed
    if (this._isDestroyed) return

    await this.app.init({
      width,
      height,
      backgroundColor: 0x111111,
      antialias: true,
      resolution: window.devicePixelRatio || 1,
      autoDensity: true
    })

    // 3. CRITICAL FIX: Check if we were destroyed while waiting for await above
    if (this._isDestroyed) {
        // If we are here, it means destroy() was called while app.init() was running.
        // We must clean up what we just created and stop immediately.
        try { this.app.destroy(true, { children: true }) } catch(e) { /* ignore */ }
        return
    }

    element.appendChild(this.app.canvas)

    this.viewport = new Viewport({
      screenWidth: width,
      screenHeight: height,
      worldWidth: worldSize.w,
      worldHeight: worldSize.h,
      events: this.app.renderer.events
    })

    this.app.stage.addChild(this.viewport)
    
    this.viewport
      .drag()
      .pinch()
      .wheel()
      .decelerate()
      .clampZoom({ minScale: 0.2, maxScale: 4 })

    this.viewport.addChild(this.mapLayer)
    this.viewport.addChild(this.trackLayer)

    this.app.ticker.add((ticker) => {
      // 4. Guard ticker just in case
      if (!this._isDestroyed) {
          this.trackLayer.onTick(ticker.deltaMS)
      }
    })
  }

  public loadMapData(
    hexes: PositionedHex[], 
    territories: TerritoryRenderInfo[], 
    colors: Map<TerritoryId, string>
  ) {
    if (this._isDestroyed) return
    this.mapLayer.renderMap(hexes, territories, colors)
  }

  public loadTrackData(geometry: TrackGeometry, spaces: TrackSpace[]) {
    if (this._isDestroyed) return
    this.trackLayer.initializeGeometry(geometry, spaces)
  }

  public updateGameState(players: PlainStateOf<PlayerState>[], colors: Record<string, string>) {
    if (this._isDestroyed) return
    this.trackLayer.updateState(players, colors)
  }

  public resize(w: number, h: number) {
    if (this._isDestroyed || !this.app.renderer) return
    this.app.renderer.resize(w, h)
    if (this.viewport) {
      this.viewport.resize(w, h)
    }
  }

  public destroy() {
    this._isDestroyed = true // Set flag immediately
    
    try {
        // Pixi v8 safety: app.destroy might throw if app.init hasn't finished yet.
        // We wrap it in try-catch to prevent React from crashing during unmount.
        if (this.app.renderer) {
            this.app.destroy(true, { children: true })
        }
    } catch (e) {
        console.warn('GameRenderer: Cleanup caught error (safe to ignore)', e)
    }
  }
}