import * as PIXI from "pixi.js";
import { Viewport } from "pixi-viewport";
import { TerrainMesh } from "./layers/TerrianMesh";
import type { GameMap } from "@/types/map-types";
import { hslStringToHex } from "@/utils/color-utils";
import { InteractionManager } from "./systems/InteractionManager";
import { OutlineLayer } from "./layers/OutlineLayer";
import { useGameStore } from "@/stores/mapStateStore"; // For subscription


/* ============================
   ======== MAP TYPES =========
   ============================ */

export type AxialHex = {
  q: number;
  r: number;
  s: number;
  stateId: string;
};

export type TestMap = {
  id: string;
  grid: {
    orientation: "pointy" | "flat";
    hexSize: number;
    origin: { q: number; r: number };
  };
  hexes: AxialHex[];
};

/* ============================
   ===== COLOR RESOLVER =======
   ============================ */

function colorByState(stateId: string): number {
  switch (stateId) {
    case "A": return 0x4fa3ff;
    case "B": return 0xff8c4f;
    default:  return 0xaaaaaa;
  }
}

/* ============================
   ========= ENGINE ===========
   ============================ */

export class PixiEngine {
	private LOD_THRESHOLD = 2
	private lodMode: "NEAR" | "FAR" = "NEAR"
  private app: PIXI.Application | null = null;
  private viewport: Viewport | null = null;
  
  // Layers
  private worldLayer: PIXI.Container | null = null;
	private mapContent: PIXI.Container | null = null;
  private terrain: TerrainMesh | null = null;
	private outlineLayer: OutlineLayer | null = null;
  private debugLayer: PIXI.Container | null = null; // Separate layer for debug boxes

  // Assets
  private hexTexture: PIXI.Texture | null = null;

  // Lifecycle
  private destroyed = false;
  private initToken = 0;
  private initPromise: Promise<void> | null = null;

	//
  private interaction: InteractionManager | null = null;
  private storeUnsub: (() => void) | null = null;

  // Getters
  getApp() { return this.app; }
  getViewport() { return this.viewport; }
	public getTerrain() { return this.terrain; }

  /* ============================
     ============ INIT ==========
     ============================ */

  async init(root: HTMLDivElement) {
    const myToken = ++this.initToken;
    this.destroyed = false;

    // Cleanup existing canvas
    root.querySelectorAll("canvas").forEach(c => c.remove());

    this.initPromise = (async () => {
      const localApp = new PIXI.Application();

      await localApp.init({
        resizeTo: root,
        backgroundColor: 0x0,
        antialias: true,
        powerPreference: "high-performance",
      });

      if (this.destroyed || myToken !== this.initToken) {
        try { localApp.destroy(true); } catch {}
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
      });

      this.viewport
        .drag()
        .wheel()
        .pinch()
        .decelerate();

      this.app.stage.addChild(this.viewport);

      // --- Layer Setup ---
      this.worldLayer = new PIXI.Container();
      this.viewport.addChild(this.worldLayer);

			this.mapContent = new PIXI.Container();
			this.worldLayer.addChild(this.mapContent)
			

      this.terrain = new TerrainMesh();
      this.mapContent.addChild(this.terrain);

			this.outlineLayer = new OutlineLayer();
			this.mapContent.addChild(this.outlineLayer)

			
      
      // this.debugLayer = new PIXI.Container();
      // this.worldLayer.addChild(this.debugLayer);

      // Generate Assets
      this.generateHexTexture(50);

			//listen for state changes
			this.storeUnsub = useGameStore.subscribe((s)=>{
				if(this.outlineLayer){
					this.outlineLayer.updateSelection(s.hoveredStateId, s.selectedStateId)
				}
			})

      window.addEventListener("resize", this.handleResize);
			this.viewport.on('zoomed', this.handleZoom)
    })();

    return this.initPromise;
  }

	/* ============================
     ========== ZOOM ============
     ============================ */

	private handleZoom = () =>{
		if (!this.viewport || !this.terrain || !this.outlineLayer) return;

		const scale = this.viewport.scale.x
		const newMode = scale < this.LOD_THRESHOLD ? "FAR" : "NEAR";

		if(newMode !== this.lodMode){
			this.lodMode = newMode
			this.updateLOD();
		}
	}

	private updateLOD(){
		if (!this.terrain || !this.outlineLayer) return;

		if( this.lodMode === 'FAR'){
			this.terrain.visible = false;
			this.outlineLayer.setLODMode('FAR')
		}else{
			this.terrain.visible = true;
			this.outlineLayer.setLODMode('NEAR')
		}
	}

  /* ============================
     ========= RESIZE ===========
     ============================ */
  
  private handleResize = () => {
    if (!this.app || !this.viewport) return;
    const parent = this.app.canvas.parentElement;
    if (!parent) return;

    this.app.renderer.resize(parent.clientWidth, parent.clientHeight);
    
    // Resize viewport but keep world dimensions intact
    this.viewport.resize(
        parent.clientWidth, 
        parent.clientHeight, 
        this.viewport.worldWidth, 
        this.viewport.worldHeight
    );
    
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

  private drawWorldBounds(w: number, h: number) {
    if (!this.debugLayer) return;
    const g = new PIXI.Graphics();
    // Red Box (0,0 to w,h)
    g.rect(0, 0, w, h).stroke({ width: 4, color: 0xff3333, alpha: 0.5 });
    this.debugLayer.addChild(g);
  }

  private drawContentBounds(w: number, h: number) {
    if (!this.debugLayer) return;
    const g = new PIXI.Graphics();
    // Green Box (Centered at 0,0 relative to terrain, so -w/2 to w/2)
    // NOTE: This is drawn relative to the WORLD center now because we pivot the terrain
    g.rect(-w / 2, -h / 2, w, h).stroke({ width: 4, color: 0x00ff00, alpha: 0.8 });
    this.terrain?.addChild(g); // Attach to terrain so it moves with it
  }

  /* ============================
     ===== LOAD TEST MAP ========
     ============================ */

  public loadTestMap(map: TestMap) {
    if (!this.app || !this.viewport || !this.worldLayer || !this.hexTexture || !this.terrain || !this.debugLayer) return;

    // Reset Layers
    this.debugLayer.removeChildren();
    
    const { hexSize } = map.grid;
    const widthPerHex = hexSize * Math.sqrt(3);
    const heightPerHex = hexSize * 2;

    // 1. Calculate Content Bounds (Raw Q/R logic)
    let minQ = Infinity, maxQ = -Infinity, minR = Infinity, maxR = -Infinity;
    for (const h of map.hexes) {
      if (h.q < minQ) minQ = h.q; if (h.q > maxQ) maxQ = h.q;
      if (h.r < minR) minR = h.r; if (h.r > maxR) maxR = h.r;
    }

    // Convert Axial Extents to Local Cartesian Extents
    // NOTE: This is an approximation of the bounding box.
    // For precise bounds, we'd check all 6 corners of min/max hexes, 
    // but calculating centers of min/max Q/R is sufficient for the viewport logic.
    
    const minX = widthPerHex * (minQ + minR / 2);
    const maxX = widthPerHex * (maxQ + maxR / 2);
    const minY = heightPerHex * 1.5 * (minR / 2); // vertical spacing is 3/4 height * r
    const maxY = heightPerHex * 1.5 * (maxR / 2);
    
    // More precise vertical calc: y = size * 3/2 * r
    const realMinY = hexSize * 1.5 * minR;
    const realMaxY = hexSize * 1.5 * maxR;

    const contentWidth = Math.abs(maxX - minX) + widthPerHex * 2; // Add some margin for hex width
    const contentHeight = Math.abs(realMaxY - realMinY) + heightPerHex * 2;

    const mapCenterX = (minX + maxX) / 2;
    const mapCenterY = (realMinY + realMaxY) / 2;

    // 2. Calculate World Size (Red Box)
    const aestheticPadding = 200;
    const totalWidth = Math.max(this.viewport.screenWidth, contentWidth + aestheticPadding * 2);
    const totalHeight = Math.max(this.viewport.screenHeight, contentHeight + aestheticPadding * 2);

    // 3. Initialize Terrain Mesh
    this.terrain.init(map.hexes, hexSize, this.hexTexture);
    
    // 4. Colorize
    for (const cell of map.hexes) {
      this.terrain.setHexColor(cell.q, cell.r, colorByState(cell.stateId));
    }

    // 5. Position Terrain in Center of World
    // We pivot the terrain so its internal center aligns with the world center
    this.terrain.pivot.set(mapCenterX, mapCenterY);
    this.terrain.position.set(totalWidth / 2, totalHeight / 2);

    // 6. Draw Bounds
    this.drawWorldBounds(totalWidth, totalHeight); // Red
    this.drawContentBounds(contentWidth, contentHeight); // Green

    // 7. Update Viewport
    const parent = this.app.canvas.parentElement;
    if (parent) {
      // Update world size
      this.viewport.resize(parent.clientWidth, parent.clientHeight, totalWidth, totalHeight);

      // Hard clamp to the Red Box
      this.viewport.clamp({
        left: 0,
        top: 0,
        right: totalWidth,
        bottom: totalHeight,
        direction: "all",
        underflow: "center",
      });

      // --- ZOOM LOGIC ---
      // 1. Fit to see everything
      this.viewport.fit(true, totalWidth, totalHeight);
      
      const fittedScale = this.viewport.scale.x;

      // 2. Set Zoom Constraints
      this.viewport.clampZoom({
        minScale: fittedScale * 0.8, // Allow zooming out slightly past the fit
        maxScale: fittedScale * 6,   // Allow deep zoom
      });

      // 3. Initial Zoom "Ease-In"
      // Zoom in slightly so the user feels "in" the world, not looking at a small map
      const initialZoom = fittedScale * 1.2; 
      const safeZoom = Math.min(initialZoom, fittedScale * 4);

      this.viewport.setZoom(safeZoom);
      this.viewport.moveCenter(totalWidth / 2, totalHeight / 2);
    }
  }

	public loadMap(map: GameMap) {
    if (!this.app || !this.viewport || !this.worldLayer || !this.hexTexture || !this.terrain || !this.mapContent) return;

    // 1. Pre-calculate Colors
    // Create a lookup: StateID -> HexColorNumber
    const colorMap = new Map<string, number>();
    
    map.states.forEach(state => {
      colorMap.set(state.id, hslStringToHex(state.displayColor));
    });

    // 2. Setup Dimensions
    const { hexSize } = map.grid;
    const widthPerHex = hexSize * Math.sqrt(3);
    const heightPerHex = hexSize * 2;


		

		// setup interaction
		if(!this.interaction){
			this.interaction = new InteractionManager(this)
		}
		this.interaction.initMap(map.hexes, hexSize)

    // Calculate Bounds from Q/R
    // We can use the bounds in JSON or recalc them. Recalc is safer.
    let minQ = Infinity, maxQ = -Infinity, minR = Infinity, maxR = -Infinity;
    for (const h of map.hexes) {
      if (h.q < minQ) minQ = h.q;
      if (h.q > maxQ) maxQ = h.q;
      if (h.r < minR) minR = h.r;
      if (h.r > maxR) maxR = h.r;
    }

    const minX = widthPerHex * (minQ + minR / 2);
    const maxX = widthPerHex * (maxQ + maxR / 2);
    // Rough estimation for pointy top vertical
    const minY = hexSize * 1.5 * minR; 
    const maxY = hexSize * 1.5 * maxR;

    const contentWidth = Math.abs(maxX - minX) + widthPerHex * 2;
    const contentHeight = Math.abs(maxY - minY) + heightPerHex * 2;
    
    // Center point logic
    const mapCenterX = (minX + maxX) / 2;
    const mapCenterY = (minY + maxY) / 2;

		
    // 3. Initialize Mesh
    // We map the incoming generic "MapHex" to the shape TerrainMesh expects
    this.terrain.init(map.hexes, hexSize, this.hexTexture);

		// build outlines for territories
		this.outlineLayer?.build(map)

    // 4. Colorize Mesh
    for (const hex of map.hexes) {
      if (!hex.stateId) {
        // Handle "Water" or "Void" - e.g., dark blue or transparent
        this.terrain.setHexColor(hex.q, hex.r, 0x1a1a2e); 
        continue;
      }

      const color = colorMap.get(hex.stateId);
      if (color !== undefined) {
        this.terrain.setHexColor(hex.q, hex.r, color);
      } else {
        // Fallback for unknown state
        this.terrain.setHexColor(hex.q, hex.r, 0xFF00FF); 
      }
    }

    // 5. Update Viewport / Camera
    const aestheticPadding = 500;
    const totalWidth = Math.max(this.viewport.screenWidth, contentWidth + aestheticPadding);
    const totalHeight = Math.max(this.viewport.screenHeight, contentHeight + aestheticPadding);

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
            left: 0, top: 0, right: totalWidth, bottom: totalHeight,
            // direction: "all", 
						underflow: "center",
        });

        this.viewport.fit(true, totalWidth, totalHeight);
        const fittedScale = this.viewport.scale.x;
        
        this.viewport.clampZoom({
            minScale: fittedScale * 2, 
            maxScale: fittedScale * 1000
        });

        // Start with a nice view
        this.viewport.setZoom(fittedScale * 2); 
        this.viewport.moveCenter(totalWidth / 2, totalHeight / 2);

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
			let rs = Math.round(s);
	
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
		this.storeUnsub?.()
		this.interaction?.destroy()
		this.viewport?.off("zoomed", this.handleZoom);
    
    this.app = null;
    this.viewport = null;
    this.worldLayer = null;
    this.terrain = null;
    this.debugLayer = null;
  }
}