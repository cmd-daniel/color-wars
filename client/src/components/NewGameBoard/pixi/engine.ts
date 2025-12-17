import * as PIXI from "pixi.js";
import { Viewport } from "pixi-viewport";
import { TerrainMesh } from "./layers/TerrianMesh";
import type { GameMap } from "@/types/map-types";
import { hexStringToHexNumber, hslStringToHex } from "@/utils/color-utils";
import { InteractionManager } from "./systems/InteractionManager";
import { OutlineLayer } from "./layers/OutlineLayer";
import { DiceTrackLayer } from "./layers/DiceTrackLayer";
import { useMapStore } from "@/stores/mapStateStore"; // For subscription
import { pixiTargetLocator } from "@/animation/target-locator";

export const BACKGROUND_COLOR = 0x09090b
export const SECONDARY_COLOR = 0x555555

/* ============================
   ======== MAP TYPES =========
   ============================ */

/* ============================
   ===== COLOR RESOLVER =======
   ============================ */

/* ============================
   ========= ENGINE ===========
   ============================ */

export class PixiEngine {
  private LOD_THRESHOLD = 2;
  private lodMode: "NEAR" | "FAR" = "NEAR";
  private app: PIXI.Application | null = null;
  private viewport: Viewport | null = null;

  // Layers
  private worldLayer: PIXI.Container | null = null;
  private mapContent: PIXI.Container | null = null;
  private terrain: TerrainMesh | null = null;
  private outlineLayer: OutlineLayer | null = null;
  private diceTrack: DiceTrackLayer | null = null;
  private uiLayer: PIXI.Container | null = null;
  private debugLayer: PIXI.Container | null = null;


  // Assets
  private hexTexture: PIXI.Texture | null = null;

  // Lifecycle
  private destroyed = false;
  private initToken = 0;
  private initPromise: Promise<void> | null = null;

  //
  private interaction: InteractionManager | null = null;
  private territoryColorUnsub: (() => void) | null = null;
  private hoverStateUnsub: (() => void) | null = null;
  private selectedStateUnsub: (() => void) | null = null;


  // Getters
  getApp() {
    return this.app;
  }
  getViewport() {
    return this.viewport;
  }
  public getTerrain() {
    return this.terrain;
  }
  public getTokenLayer() {
    return this.diceTrack?.getTokenLayer();
  }

  /* ============================
     ============ INIT ==========
     ============================ */

  async init(root: HTMLDivElement) {
    const myToken = ++this.initToken;
    this.destroyed = false;

    // Cleanup existing canvas
    root.querySelectorAll("canvas").forEach((c) => c.remove());

    this.initPromise = (async () => {
      const localApp = new PIXI.Application();

      await localApp.init({
        resizeTo: root,
        backgroundColor: BACKGROUND_COLOR,
        antialias: true,
        powerPreference: "high-performance",
        resolution: Math.min(window.devicePixelRatio, 2),
        autoDensity: true,
      });

      if (this.destroyed || myToken !== this.initToken) {
        try {
          localApp.destroy(true);
        } catch (error) {
          throw new Error(`${error}`);
        }
        return;
      }

      this.app = localApp;
      root.appendChild(this.app.canvas);

      // --- Viewport Setup ---
      this.viewport = new Viewport({
        screenWidth: root.clientWidth,
        screenHeight: root.clientHeight,
        worldWidth: 1000, // Will be resized on map load
        worldHeight: 1000,
        events: this.app.renderer.events,
        passiveWheel: false,
      });

      this.viewport.drag().wheel().pinch().decelerate();

      this.app.stage.addChild(this.viewport);

      // --- Layer Setup ---
      this.worldLayer = new PIXI.Container();
      this.viewport.addChild(this.worldLayer);

      this.mapContent = new PIXI.Container();
      this.worldLayer.addChild(this.mapContent);

      this.debugLayer = new PIXI.Container();
      this.worldLayer.addChild(this.debugLayer);

      this.terrain = new TerrainMesh();
      this.mapContent.addChild(this.terrain);

      this.outlineLayer = new OutlineLayer();
      this.mapContent.addChild(this.outlineLayer);

      this.uiLayer = new PIXI.Container();
      this.app.stage.addChild(this.uiLayer);

      this.diceTrack = new DiceTrackLayer();
      this.uiLayer.addChild(this.diceTrack);
      this.diceTrack.init(this.app);

      // this.tokenLayer = new TokenLayer();
      // this.diceTrack.getTrackLayer().addChild(this.tokenLayer);

      // Generate Assets
      this.generateHexTexture(50);

      //listen for state changes
      this.hoverStateUnsub = useMapStore.subscribe(((s)=>s.hoveredTerritoryId),(s) => {
        if (this.outlineLayer) {
          this.outlineLayer.updateSelection(s, null);
        }
      });

      this.selectedStateUnsub = useMapStore.subscribe(((s)=>s.selectedTerritoryId),(s) => {
        if (this.outlineLayer) {
          this.outlineLayer.updateSelection(null, s);
        }
      });

      this.territoryColorUnsub = useMapStore.subscribe(
        (s) => s.colorMap,
        (nextMap, prevMap) => {
          if (!this.outlineLayer) return;
          nextMap.forEach((color, territoryId) => {
            if (prevMap.size == 0 || prevMap?.get(territoryId) !== color) {
              this.outlineLayer?.setTerritoryColor(territoryId, color);
              this.terrain?.setTerritoryColor(territoryId, hexStringToHexNumber(color));
            }
          });
        }
      );

      window.addEventListener("resize", this.handleResize);
      this.viewport.on("zoomed", this.handleZoom);

      this.handleResize();
    })();

    return this.initPromise;
  }

  /* ============================
     ========== ZOOM ============
     ============================ */

  private handleZoom = () => {
    if (!this.viewport || !this.terrain || !this.outlineLayer) return;

    const scale = this.viewport.scale.x;
    const newMode = scale < this.LOD_THRESHOLD ? "FAR" : "NEAR";

    if (newMode !== this.lodMode) {
      this.lodMode = newMode;
      this.updateLOD();
    }
  };

  private updateLOD() {
    if (!this.terrain || !this.outlineLayer) return;

    if (this.lodMode === "FAR") {
      this.terrain.visible = false;
      this.outlineLayer.setLODMode("FAR");
    } else {
      this.terrain.visible = true;
      this.outlineLayer.setLODMode("NEAR");
    }
  }

  /* ============================
     ========= RESIZE ===========
     ============================ */

  private handleResize = () => {
    if (!this.app || !this.viewport) return;
    const parent = this.app.canvas.parentElement;
    if (!parent) return;

    const w = parent.clientWidth;
    const h = parent.clientHeight;
    this.app.renderer.resize(w, h);
    this.diceTrack?.resize(w, h);

    // Resize viewport but keep world dimensions intact
    // this.viewport.resize(w, h, this.viewport.worldWidth, this.viewport.worldHeight);
    this.viewport.fit(true, this.viewport.worldWidth, this.viewport.worldHeight);

    // Optional: Re-clamp if needed, though usually handled by Viewport logic
  };

  /* ============================
     === GRAPHICS → TEXTURE ====
     ============================ */

  private generateHexTexture(size: number) {
    if (!this.app) return;

    const g = new PIXI.Graphics();

    const points: number[] = [];
    const corners = 6;
    const angleOffset = -30; // Pointy top

    for (let i = 0; i < corners; i++) {
      const angle = (Math.PI / 180) * (60 * i + angleOffset);
      const x = size * Math.cos(angle);
      const y = size * Math.sin(angle);
      points.push(x, y);
    }

    g.poly(points);
    g.fill({ color: 0xffffff }); // Fill First
    g.stroke({ width: 2, color: 0x333333, alignment: 1 }); // Stroke Second (Inner)

    const texture = this.app.renderer.textureGenerator.generateTexture({
      target: g,
      resolution: 5,
      antialias: false,
    });

    g.destroy(true);
    if (this.hexTexture) this.hexTexture.destroy(true);
    this.hexTexture = texture;
  }

  /* ============================
     ===== DEBUG DRAWING ========
     ============================ */

  // private drawWorldBounds(w: number, h: number) {
  //   if (!this.debugLayer) return;
  //   const g = new PIXI.Graphics();
  //   // Red Box (0,0 to w,h)
  //   g.rect(0, 0, w, h).stroke({ width: 4, color: 0xff3333, alpha: 0.5 });
  //   this.debugLayer.addChild(g);
  // }

  // private drawContentBounds(w: number, h: number) {
  //   if (!this.debugLayer) return;
  //   const g = new PIXI.Graphics();
  //   // Green Box (Centered at 0,0 relative to terrain, so -w/2 to w/2)
  //   // NOTE: This is drawn relative to the WORLD center now because we pivot the terrain
  //   g.rect(-w / 2, -h / 2, w, h).stroke({ width: 4, color: 0x00ff00, alpha: 0.8 });
  //   g.position = this.mapContent?.position!
  //   this.debugLayer.addChild(g); // Attach to terrain so it moves with it
  // }

  public loadMap(map: GameMap) {
    if ( !this.app || !this.viewport || !this.worldLayer || !this.hexTexture || !this.terrain || !this.mapContent ) return;

    // 1. Pre-calculate Colors
    // Create a lookup: StateID -> HexColorNumber

    // 2. Setup Dimensions
    const { hexSize } = map.grid;
    const widthPerHex = hexSize * Math.sqrt(3);
    const heightPerHex = hexSize * 2;

    // setup interaction
    if (!this.interaction) {
      this.interaction = new InteractionManager(this);
    }
    this.interaction.initMap(map.hexes, hexSize);

    // Calculate Bounds from Q/R
    // We can use the bounds in JSON or recalc them. Recalc is safer.
    let minQ = Infinity,
      maxQ = -Infinity,
      minR = Infinity,
      maxR = -Infinity;
    for (const h of map.hexes) {
      if (h.q < minQ) minQ = h.q;
      if (h.q > maxQ) maxQ = h.q;
      if (h.r < minR) minR = h.r;
      if (h.r > maxR) maxR = h.r;
    }

    const minX = widthPerHex * (minQ + minR / 2);
    const maxX = (widthPerHex * (maxQ + maxR / 2))-300;
    // Rough estimation for pointy top vertical
    const minY = (hexSize * 1.5 * minR) - 100;
    const maxY = hexSize * 1.5 * maxR;

    const contentWidth = Math.abs(maxX - minX) + widthPerHex * 2;
    const contentHeight = Math.abs(maxY - minY) + heightPerHex * 2;

    // Center point logic
    const mapCenterX = (minX + maxX) / 2;
    const mapCenterY = (minY + maxY) / 2;

    // 3. Initialize Mesh
    // We map the incoming generic "MapHex" to the shape TerrainMesh expects
    this.terrain.init(map, hexSize, this.hexTexture);

    // build outlines for territories
    this.outlineLayer?.build(map);

    const colorMap = new Map<string, number>();

    map.territories.forEach((state) => {
      colorMap.set(state.id, hslStringToHex(state.displayColor));
    });

    // 4. Colorize Mesh
    let cellColorMap: { q: number; r: number; color: number }[] = [];
    for (const hex of map.hexes) {
      cellColorMap.push({ q: hex.q, r: hex.r, color: SECONDARY_COLOR });
    }
    this.terrain.setHexColor(cellColorMap);

    // 5. Update Viewport / Camera
    const aestheticPadding = 800;
    const totalWidth = Math.max(this.viewport.screenWidth, contentWidth + aestheticPadding);
    const totalHeight = Math.max(
      this.viewport.screenHeight,
      contentHeight + aestheticPadding,
    );

    // Pivot terrain to center
    // this.terrain.pivot.set(mapCenterX, mapCenterY);
    // this.terrain.position.set(totalWidth / 2, totalHeight / 2);

    // ✅ 4. Apply Pivot/Position to the SHARED Parent Container
    // Instead of moving just the terrain, we move the whole content holder.
    this.mapContent.pivot.set(mapCenterX, mapCenterY);
    this.mapContent.position.set(totalWidth / 2, totalHeight / 2);

    const parent = this.app.canvas.parentElement;
    if (parent) {
      this.viewport.resize(parent.clientWidth, parent.clientHeight, totalWidth, totalHeight);

      // Update Viewport Bounds
      this.viewport.clamp({
        direction: "all"
      });

      this.viewport.fit();
      const fittedScale = this.viewport.scale.x;

      this.viewport.clampZoom({
        minScale: fittedScale * 1,
        maxScale: fittedScale * 1000,
      });

      this.viewport.snapZoom({
        width:1500,
        height:1500,
        center: new PIXI.Point(totalWidth / 2, totalHeight / 2),
        removeOnComplete:true,
        removeOnInterrupt: true
      });

      setTimeout(() => {
        this.handleZoom();
      }, 100);
    }
  }
  /* ==========================
     ======= Math Helpers =======
     ============================ */
  public worldToAxial(x: number, y: number, hexSize: number) {
    const sqrt3 = Math.sqrt(3);
    const q = ((sqrt3 / 3) * x - (1 / 3) * y) / hexSize;
    const r = ((2 / 3) * y) / hexSize;
    return this.axialRound(q, r);
  }

  private axialRound(q: number, r: number) {
    let rq = Math.round(q);
    let rr = Math.round(r);
    const s = -q - r;
    const rs = Math.round(s);

    const qDiff = Math.abs(rq - q);
    const rDiff = Math.abs(rr - r);
    const sDiff = Math.abs(rs - s);

    if (qDiff > rDiff && qDiff > sDiff) {
      rq = -rr - rs;
    } else if (rDiff > sDiff) {
      rr = -rq - rs;
    }
    return { q: rq, r: rr };
  }

  /* ============================
     ========= DESTROY ==========
     ============================ */

  destroy() {
    this.destroyed = true;
    this.initToken++;

    window.removeEventListener("resize", this.handleResize);

    this.app?.destroy(true);
    this.hoverStateUnsub?.();
    this.selectedStateUnsub?.();
    this.territoryColorUnsub?.();
    this.interaction?.destroy();
    this.viewport?.off("zoomed", this.handleZoom);

    pixiTargetLocator.clear();

    this.app = null;
    this.viewport = null;
    this.worldLayer = null;
    this.terrain = null;
  }
}
