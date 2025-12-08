// --- FILE: src/systems/layers/TokenAnimator.ts ---
import * as PIXI from 'pixi.js'
import type { PlainStateOf, PlayerState } from '@color-wars/shared/src/types/RoomState';

interface TokenState {
  container: PIXI.Container
  currentPos: { x: number; y: number }
  targetPos: { x: number; y: number } | null
  startPos: { x: number; y: number }
  pathQueue: Array<{ x: number; y: number }>
  animTime: number
  animDuration: number
  isMoving: boolean
}

export class TokenAnimator {
  private _stage: PIXI.Container
  private _tokens = new Map<string, TokenState>()
  private _tileCenters: Array<{ x: number; y: number }> = []
  
  // Animation Config
  private readonly RADIUS = 8
  private readonly HOP_HEIGHT = 12
  private readonly DURATION = 280

  constructor(stage: PIXI.Container) {
    this._stage = stage
  }

  public setGeometry(centers: Array<{ x: number; y: number }>) {
    this._tileCenters = centers
  }

  public updatePlayers(players: PlainStateOf<PlayerState>[], playerColors: Record<string, string>) {
    const activeIds = new Set(players.map(p => p.id))

    // 1. Cleanup removed players
    for (const [id, token] of this._tokens) {
      if (!activeIds.has(id)) {
        token.container.destroy()
        this._tokens.delete(id)
      }
    }

    // 2. Add/Update players
    players.forEach(p => {
      let token = this._tokens.get(p.id)
      const targetCenter = this._tileCenters[p.position] || { x: 0, y: 0 }

      if (!token) {
        // Create Visuals
        const container = new PIXI.Container()
        const g = new PIXI.Graphics()
        const color = parseInt((playerColors[p.id] || '#f97316').replace('#', ''), 16)
        
        g.circle(0, 0, this.RADIUS)
        g.fill(color)
        g.stroke({ width: 2, color: 0xffffff }) // White border
        
        const label = new PIXI.Text({
          text: p.name.substring(0, 2).toUpperCase(),
          style: { fontSize: 10, fill: 0xffffff, fontWeight: 'bold', fontFamily: 'Arial' }
        })
        label.anchor.set(0.5)

        container.addChild(g, label)
        container.position.set(targetCenter.x, targetCenter.y)
        this._stage.addChild(container)

        token = {
          container,
          currentPos: { ...targetCenter },
          targetPos: null,
          startPos: { ...targetCenter },
          pathQueue: [],
          animTime: 0,
          animDuration: this.DURATION,
          isMoving: false
        }
        this._tokens.set(p.id, token)
      }

      // Logic: If player position changed in Store, queue movement
      // This is a simplified direct hop. For pathfinding, you'd pass the full path array.
      if (!token.isMoving && token.pathQueue.length === 0) {
        const dist = Math.hypot(token.currentPos.x - targetCenter.x, token.currentPos.y - targetCenter.y)
        if (dist > 1) {
          token.pathQueue.push(targetCenter)
        }
      }
    })
  }

  public update(deltaMS: number) {
    for (const token of this._tokens.values()) {
      if (!token.isMoving && token.pathQueue.length > 0) {
        token.startPos = { ...token.currentPos }
        token.targetPos = token.pathQueue.shift()!
        token.isMoving = true
        token.animTime = 0
      }

      if (token.isMoving && token.targetPos) {
        token.animTime += deltaMS
        const t = Math.min(token.animTime / token.animDuration, 1)
        
        // Custom Easing (EaseInOutCubic)
        const ease = t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2
        
        // Linear Interp
        const tx = token.startPos.x + (token.targetPos.x - token.startPos.x) * ease
        const groundTy = token.startPos.y + (token.targetPos.y - token.startPos.y) * ease
        
        // Jump Arc (Sin wave)
        const lift = Math.sin(Math.PI * ease) * this.HOP_HEIGHT

        token.currentPos.x = tx
        token.currentPos.y = groundTy - lift

        token.container.position.set(token.currentPos.x, token.currentPos.y)

        if (t >= 1) {
          token.isMoving = false
          token.container.position.set(token.targetPos.x, token.targetPos.y)
          token.currentPos = { ...token.targetPos }
          token.targetPos = null
        }
      }
    }
  }
}