// src/pixi/PixiEngine.ts
import * as PIXI from "pixi.js";
import { Viewport } from "pixi-viewport";

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
    orientation: "pointy" | "flat"; // currently we implement pointy
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
  private app: PIXI.Application | null = null;
  private viewport: Viewport | null = null;
  private worldLayer: PIXI.Container | null = null;

  private mapLayer: PIXI.Container | null = null;
  private hexTexture: PIXI.Texture | null = null;

  private destroyed = false;
  private initToken = 0;
  private initPromise: Promise<void> | null = null;

  /* ============================
     ========= GETTERS ==========
     ============================ */

  getApp() {
    return this.app;
  }

  getViewport() {
    return this.viewport;
  }

  getMapLayer() {
    return this.mapLayer;
  }

  /* ============================
     ============ INIT ==========
     ============================ */

  async init(root: HTMLDivElement) {
    const myToken = ++this.initToken;
    this.destroyed = false;

    // Defensive DOM cleanup
    root.querySelectorAll("canvas").forEach(c => c.remove());

    this.initPromise = (async () => {
      const localApp = new PIXI.Application();

      await localApp.init({
        resizeTo: root,
        backgroundColor: 0xffffff,
        antialias: true,
        powerPreference: "high-performance",
      });

      // Strict-Mode + async cancellation guard
      if (this.destroyed || myToken !== this.initToken) {
        try {
          localApp.destroy(true);
        } catch {}
        return;
      }

      this.app = localApp;
      root.appendChild(this.app.canvas);

      this.viewport = new Viewport({
        screenWidth: root.clientWidth,
        screenHeight: root.clientHeight,
        worldWidth: 1000,
        worldHeight: 1000,
        events: this.app.renderer.events,
      });

      this.viewport.drag().wheel().pinch().decelerate();
			this.viewport.fit(true)
		// 	this.viewport.clamp({
		// 		left: true,
		// 		right: true,
		// 		top: true,
		// 		bottom: true,
		// 		direction: 'all',
		// 		//underflow: 'center' // If zoomed out (fitted), lock world to center.
		// });
      this.app.stage.addChild(this.viewport);

      this.worldLayer = new PIXI.Container();
      this.viewport.addChild(this.worldLayer);

      // ✅ One-time procedural hex texture
      this.generateHexTexture(40);

      window.addEventListener("resize", this.handleResize);
    })();

    return this.initPromise;
  }

  /* ============================
     ========= RESIZE ===========
     ============================ */

	private handleResize = () => {
    if (!this.app || !this.viewport) return;
    const parent = this.app.canvas.parentElement;
    if (!parent) return;

    this.app.renderer.resize(parent.clientWidth, parent.clientHeight);
    this.viewport.resize(parent.clientWidth, parent.clientHeight, this.viewport.worldWidth, this.viewport.worldHeight);

    // Fit & Move to POSITIVE center
    this.viewport.fit();
    this.viewport.moveCenter(this.viewport.worldWidth / 2, this.viewport.worldHeight / 2);

    const newFittedScale = this.viewport.scale.x;
    this.viewport.clampZoom({
      minScale: newFittedScale,
      maxScale: newFittedScale * 4
    });
  };

  /* ============================
     === GRAPHICS → TEXTURE ====
     ============================ */

  private generateHexTexture(size: number) {
    if (!this.app) return;

    const g = new PIXI.Graphics();

    const corners = 6;
    const angleOffset = -30; // pointy-top

    for (let i = 0; i < corners; i++) {
      const angle = (Math.PI / 180) * (60 * i + angleOffset);
      const x = size * Math.cos(angle);
      const y = size * Math.sin(angle);

      if (i === 0) g.moveTo(x, y);
      else g.lineTo(x, y);
    }

    g.closePath();
    g.fill({ color: 0xffffff });
    g.stroke({ width: 1, color: 0x222222, alpha: 0.8 });

    const texture =
      this.app.renderer.textureGenerator.generateTexture({
        target: g,
        resolution: 2,
        antialias: true,
      });

    g.destroy(true);

    if (this.hexTexture) {
      this.hexTexture.destroy(true);
    }

    this.hexTexture = texture;
  }

  /* ============================
     ===== AXIAL → WORLD ========
     ============================ */

  private axialToWorld(q: number, r: number, size: number) {
    // Pointy-top axial layout
    const x = size * Math.sqrt(3) * (q + r / 2);
    const y = size * 1.5 * r;
    return { x, y };
  }

  /* ============================
     ===== MAP LAYER RESET ======
     ============================ */

  private destroyMapLayer() {
    if (!this.mapLayer || !this.worldLayer) return;

    this.mapLayer.removeChildren();
    this.worldLayer.removeChild(this.mapLayer);
    this.mapLayer.destroy({ children: true });
    this.mapLayer = null;
  }

	private drawWorldBounds(w: number, h: number) {
		if (!this.viewport || !this.worldLayer) return;
	
		const g = new PIXI.Graphics();
	
        // Draw from 0,0 to w,h (Positive coords)
		g.rect(0, 0, w, h).stroke({ width: 2, color: 0xff3333, alpha: 0.9 });
	
        // Add directly to worldLayer (but NOT inside mapLayer)
		this.worldLayer.addChild(g);
	}

	// Draws the actual hex content boundary (Green Box)
  private drawContentBounds(width: number, height: number) {
    if (!this.mapLayer) return;

    const g = new PIXI.Graphics();
    
    // Drawn relative to mapLayer, so (0,0) is the center.
    // We draw from negative half-width to positive half-width.
    g.rect(-width / 2, -height / 2, width, height)
     .stroke({ width: 2, color: 0x00ff00, alpha: 0.8 }); // Green color

    this.mapLayer.addChild(g);
  }
	

  /* ============================
     ===== LOAD TEST MAP ========
     ============================ */


	public loadTestMap(map: TestMap) {
    if (!this.app || !this.viewport || !this.worldLayer || !this.hexTexture) return;

    this.destroyMapLayer();
    this.mapLayer = new PIXI.Container();
    this.worldLayer.addChild(this.mapLayer);

    const { hexSize } = map.grid;

    // --- Calculate Bounds (Same as before) ---
    let minQ = Infinity, maxQ = -Infinity, minR = Infinity, maxR = -Infinity;
    for (const h of map.hexes) {
      if (h.q < minQ) minQ = h.q; if (h.q > maxQ) maxQ = h.q;
      if (h.r < minR) minR = h.r; if (h.r > maxR) maxR = h.r;
    }
    const centerQ = (minQ + maxQ) / 2;
    const centerR = (minR + maxR) / 2;

    const corners = [ { q: minQ, r: minR }, { q: minQ, r: maxR }, { q: maxQ, r: minR }, { q: maxQ, r: maxR } ];
    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
    
    for (const c of corners) {
      const { x, y } = this.axialToWorld(c.q - centerQ, c.r - centerR, hexSize);
      if (x < minX) minX = x; if (x > maxX) maxX = x;
      if (y < minY) minY = y; if (y > maxY) maxY = y;
    }

    // --- Dimensions Calculation ---
    
    const geometricMargin = hexSize * 2; 
    const aestheticPadding = 100; // The extra space around the edges

    // 1. Content Size (The Green Box)
    const contentWidth = Math.abs(maxX - minX) + geometricMargin;
    const contentHeight = Math.abs(maxY - minY) + geometricMargin;

    // 2. World Size (The Red Box / Viewport limits)
    const totalWidth = Math.max(4 * hexSize, contentWidth + (aestheticPadding * 2));
    const totalHeight = Math.max(4 * hexSize, contentHeight + (aestheticPadding * 2));

    // Center map layer
    this.mapLayer.position.set(totalWidth / 2, totalHeight / 2);
    
    // ✅ NEW: Draw the content bounds (Green)
    this.drawContentBounds(contentWidth, contentHeight);

    const parent = this.app.canvas.parentElement;
    if (parent) {
      this.viewport.resize(parent.clientWidth, parent.clientHeight, totalWidth, totalHeight);
      
      // Draw World Bounds (Red)
      this.drawWorldBounds(totalWidth, totalHeight);

      this.viewport.clamp({
        left: 0, top: 0, right: totalWidth, bottom: totalHeight,
        direction: 'all', underflow: 'center'
      });

      // --- ZOOM LOGIC ---

      // 1. Calculate the "Perfect Fit"
      this.viewport.fit(true);
      
      // 2. Capture that scale
      const fittedScale = this.viewport.scale.x;
			
      // 3. Set Limits (User can zoom out to the fit, but no further)
      this.viewport.clampZoom({
				minScale: fittedScale,
        maxScale: fittedScale * 4
      });
			
      // ✅ NEW: Apply "Slight Zoom In"
      // This sets the initial view to be 20% closer than the "perfect fit".
      // The user can scroll out to see the edges, but starts focused.
      const initialZoom = fittedScale * 2; 
      
      // Ensure we don't exceed max scale if map is tiny
      const safeZoom = Math.min(initialZoom, fittedScale * 4); 
      
      this.viewport.setZoom(safeZoom);
			this.viewport.moveCenter(totalWidth / 2, totalHeight / 2);
    }

    // Render Hexes (Unchanged)
    for (const cell of map.hexes) {
      const { x, y } = this.axialToWorld(cell.q - centerQ, cell.r - centerR, hexSize);
      const sprite = new PIXI.Sprite(this.hexTexture);
      sprite.anchor.set(0.5);
      sprite.position.set(x, y);
      sprite.tint = colorByState(cell.stateId);
      this.mapLayer.addChild(sprite);
    }
  }

  /* ============================
     ========= DESTROY ==========
     ============================ */

  destroy() {
    this.destroyed = true;
    this.initToken++;

    if (!this.initPromise) return;

    if (this.app) {
      try {
        window.removeEventListener("resize", this.handleResize);

        const canvas = this.app.canvas;
        this.app.destroy(true);
        canvas?.parentElement?.removeChild(canvas);
      } catch {}
    }

    if (this.hexTexture) {
      this.hexTexture.destroy(true);
      this.hexTexture = null;
    }

    this.app = null;
    this.viewport = null;
    this.mapLayer = null;
    this.worldLayer = null;
    this.initPromise = null;
  }
}
