import { PixiEngine } from "../engine";
import { useGameStore } from "@/stores/mapStateStore";
import { FederatedPointerEvent } from "pixi.js";

export class InteractionManager {
  private engine: PixiEngine;
  private hexLookup = new Map<string, string>(); // "q,r" -> stateId
  private hexSize = 0;
  private isDragging = false;

  constructor(engine: PixiEngine) {
    this.engine = engine;
    
    const viewport = engine.getViewport();
    if (viewport) {
      // Use 'pointermove' on the viewport
      viewport.on("pointermove", this.onPointerMove);
      viewport.on("pointertap", this.onPointerTap);
      
      // Prevent click triggers while panning
      viewport.on("drag-start", () => { this.isDragging = true; });
      viewport.on("drag-end", () => { setTimeout(() => this.isDragging = false, 50); });
    }
  }

  public initMap(hexes: any[], size: number) {
    this.hexSize = size;
    this.hexLookup.clear();
    hexes.forEach(h => {
      if (h.stateId) this.hexLookup.set(`${h.q},${h.r}`, h.stateId);
    });
  }

  private onPointerMove = (e: FederatedPointerEvent) => {
    if (this.isDragging) return;

    // 1. Get world position from Interaction Event
    // Note: Pixi events have global (screen) coords. 
    // We convert screen -> world using the Terrain container to account for pivot/scale.
    const terrain = this.engine.getTerrain();
    if (!terrain) return;

    const localPoint = terrain.toLocal(e.global);
    
    // 2. Convert to Axial
    const hex = this.engine.worldToAxial(localPoint.x, localPoint.y, this.hexSize);
    
    // 3. Lookup State
    const stateId = this.hexLookup.get(`${hex.q},${hex.r}`) || null;

    // 4. Update Store (only if changed to avoid thrashing)
    const currentHover = useGameStore.getState().hoveredStateId;
    if (stateId !== currentHover) {
      useGameStore.getState().setHoveredState(stateId);
    }
  };

  private onPointerTap = (e: FederatedPointerEvent) => {
    if (this.isDragging) return;

    // Re-calculate to be safe (or use cached hover)
    const terrain = this.engine.getTerrain();
    if (!terrain) return;
    const localPoint = terrain.toLocal(e.global);
    const hex = this.engine.worldToAxial(localPoint.x, localPoint.y, this.hexSize);
    const stateId = this.hexLookup.get(`${hex.q},${hex.r}`) || null;

    useGameStore.getState().setSelectedState(stateId);
  };

  public destroy() {
    const viewport = this.engine.getViewport();
    if (viewport) {
      viewport.off("pointermove", this.onPointerMove);
      viewport.off("pointertap", this.onPointerTap);
    }
  }
}