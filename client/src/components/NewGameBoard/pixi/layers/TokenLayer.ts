import * as PIXI from "pixi.js";
import { PlayerSprite } from "../units/playerSprite";
import { pixiTargetLocator } from "@/animation/target-locator";
import { useDiceTrackStore, type TokenData, getTokensOnTile } from "@/stores/diceTrackStore";
import gsap from "@/lib/gsap";
import { debounce } from "@/lib/utils";

export class TokenLayer extends PIXI.Container {
  private units: Map<string, PlayerSprite> = new Map();

  // Standard size of the token graphic (radius 20 * 2 = 40 roughly)
  // We use this to calculate how much to scale based on hex size
  private readonly BASE_TOKEN_RATIO = 3;
  private currentHexSize: number = 1;
  private _debouncedReconcileTokens: (tokens: Record<string, TokenData>) => void;
  private unsub: () => void;
  private unsubActive: () => void;
  public rearrangeTile = debounce((tileId: string, instant: boolean) => {
     this._rearrangeTile(tileId, instant);
  }, 200)
  constructor() {
    super();
    // Use lodash debounce for reconcileTokens
    this._debouncedReconcileTokens = debounce(this.reconcileTokens, 200);
    const {tokens} = useDiceTrackStore.getState()
    this.reconcileTokens(tokens, true)
    this.unsub = useDiceTrackStore.subscribe(
      (s) => s.tokens,
      (tokens) => {
        this._debouncedReconcileTokens(tokens);
      },
    );
    this.unsubActive = useDiceTrackStore.subscribe(
      (s) => s.activeTokenId,
      (newId, prevId) => {
        // If prevId and newId units are both present and have the same tile,
        // rearrange only once. Otherwise, rearrange both as needed.
        let prevTileId: string | undefined;
        let newTileId: string | undefined;

        if (prevId && this.units.has(prevId)) {
          const prevActiveUnit = this.units.get(prevId)!;
          prevActiveUnit.stopPulse();
          prevTileId = prevActiveUnit.currentTileId!;
        }
        if (newId && this.units.has(newId)) {
          const activeUnit = this.units.get(newId)!;
          newTileId = activeUnit.currentTileId!;
        }
        if (prevTileId && newTileId && prevTileId === newTileId) {
          this.rearrangeTile(prevTileId, true);
        } else {
          if (prevTileId) this.rearrangeTile(prevTileId, true);
          if (newTileId) this.rearrangeTile(newTileId, true);
        }
      },
    );
  }

  // In TokenLayer.ts

  private reconcileTokens = (tokenDataMap: Record<string, TokenData>, init?: boolean) => {
    const affectedTiles = new Set<string>();

    // 1. ADDITIONS & MOVES (Iterate Source of Truth)
    Object.values(tokenDataMap).forEach((data) => {
      const unit = this.units.get(data.id);

      if (!unit) {
        // CASE: NEW TOKEN
        this.createTokenSprite(data);
        affectedTiles.add(data.tileId);
      } else {
        // CASE: EXISTING TOKEN - CHECK FOR MOVE
        if (unit.currentTileId !== data.tileId) {
          // A. Mark the OLD tile as affected (needs to close the gap)
          if (unit.currentTileId) {
            affectedTiles.add(unit.currentTileId);
          }

          // B. Mark the NEW tile as affected (needs to make room)
          affectedTiles.add(data.tileId);

          // C. Update the local logic state immediately
          // This ensures that when rearrangeTile runs for the OLD tile,
          // it knows this unit is no longer there.
          unit.currentTileId = data.tileId;
        }
      }
    });

    // 2. REMOVALS (Iterate Visual State)
    this.units.forEach((unit, id) => {
      if (!tokenDataMap[id]) {
        // CASE: DELETED TOKEN
        if (unit.currentTileId) affectedTiles.add(unit.currentTileId);
        this.removeTokenSprite(id);
      }
    });

    console.log("affectedTiles", affectedTiles);

    // 3. REARRANGE VISUALS
    affectedTiles.forEach((tileId) => {
      if(!init) this.rearrangeTile(tileId, true);
    });
  };

  private createTokenSprite(data: TokenData) {
    const unit = new PlayerSprite(data.id, data.color);
    unit.currentTileId = data.tileId;
    const tileSprite = pixiTargetLocator.get<PIXI.Sprite>(data.tileId);
    if (tileSprite) {
      unit.position.copyFrom(tileSprite.position);
      //unit.scale.set(0);
    }

    this.addChild(unit);
    this.units.set(data.id, unit);
    pixiTargetLocator.register(data.id, unit);
  }

  private removeTokenSprite(id: string) {
    const unit = this.units.get(id);
    if (!unit) return;
    pixiTargetLocator.unregister(id);

    gsap.to(unit, {
      pixi: {
        scale: 0,
      },
      duration: 0.5,
      onComplete: () => {
        this.removeChild(unit);
        unit.destroy({ children: true });
        this.units.delete(id);
      },
    });
  }

  private _rearrangeTile(tileId: string, animate: boolean) {
    const state = useDiceTrackStore.getState();
    const allTokenIds = getTokensOnTile(state, tileId);
    
    console.log('called for tile: ', tileId, ', tokens: ', allTokenIds)
    const presentTokens = allTokenIds.filter((tokenId) => {
      const unit = this.units.get(tokenId);
      return unit && !unit.isAnimating;
    });

    const tileSprite = pixiTargetLocator.get<PIXI.Sprite>(tileId);
    if (!tileSprite || presentTokens.length === 0) return;

    const layoutConfig = getPolygonalConfiguration(presentTokens.length, this.currentHexSize);

    presentTokens.forEach((tokenId, index) => {
      const unit = this.units.get(tokenId);
      if (!unit) return;

      const config = layoutConfig[index];

      this.applyTransform(unit, tileSprite, config, animate, tokenId === state.activeTokenId);
    });
  }

  /**
   * Helper to reduce code duplication
   */
  private applyTransform(unit: PlayerSprite, tile: PIXI.Sprite, config: any, animate: boolean, pulse?: boolean) {
    const targetX = tile.x + config.x;
    const targetY = tile.y + config.y;
    // Calculate scale relative to base size.
    // If config.scale is 1.0 (Active), it renders full size.
    const finalScale = this.currentHexSize * this.BASE_TOKEN_RATIO * config.scale;
    const tl = gsap.timeline();

    if (animate) {
      tl.to(unit, {
        pixi: {
          x: targetX,
          y: targetY,
          scale: finalScale,
        },
        duration: 0.5,
        ease: "back.out(1.2)",
        onComplete: () => {
          //TODO: change this, breaks when resizing
          if (pulse) {
            unit.startPulse();
          }
        },
      });
    } else {
      unit.position.set(targetX, targetY);
      unit.scale.set(finalScale);
    }
  }

  public resize(hexSize: number) {
    this.currentHexSize = hexSize;
    // Iterate over known tiles
    const state = useDiceTrackStore.getState();
    const tiles = new Set(Object.values(state.tokens).map((t) => t.tileId));
    tiles.forEach((t) => this.rearrangeTile(t, false));
  }

  public deleteToken(id: string) {
    const unit = this.units.get(id);
    if (!unit) return;

    pixiTargetLocator.unregister(id);

    this.removeChild(unit);
    unit.destroy({ children: true });
    this.units.delete(id);
  }

  public getToken(id: string) {
    return this.units.get(id);
  }

  public clear() {
    this.units.forEach((unit) => {
      pixiTargetLocator.unregister(unit.id);
      unit.destroy({ children: true });
    });
    this.unsub();
    this.unsubActive();
    this.units.clear();
    this.removeChildren();
  }
}

// src/utils/token-layout.ts

export interface LayoutConfig {
  x: number;
  y: number;
  scale: number;
}

/**
 * Calculates positions and scales for ALL tokens on a tile.
 * @param total - Total number of tokens on the tile
 * @param hexSize - The radius of the hex tile (outer radius)
 * @returns Array of LayoutConfig objects corresponding to indices [0, 1, ... total-1]
 */
export function getPolygonalConfiguration(total: number, hexSize: number): LayoutConfig[] {
  // 1. Empty Case
  if (total === 0) return [];

  // 2. Single Token Case: Center it
  if (total === 1) {
    return [{ x: 0, y: 0, scale: 1.0 }];
  }

  const configs: LayoutConfig[] = [];

  // 3. Configuration Parameters
  // Distance from center (50% of hex radius)
  const ringRadius = hexSize * 25;

  // Scale logic: Shrink as count increases
  let scale = 0.8;
  if (total >= 4) scale = 0.5;
  if (total >= 7) scale = 0.4;

  // 4. Generate points
  for (let i = 0; i < total; i++) {
    // Theta: Divide circle by N.
    // -PI/2 shifts start to 12 o'clock (Top)
    const theta = ((Math.PI * 2) / total) * i - Math.PI / 2;

    configs.push({
      x: Math.cos(theta) * ringRadius,
      y: Math.sin(theta) * ringRadius,
      scale: scale,
    });
  }

  return configs;
}
