// src/pixi/PixiEngine.ts
import * as PIXI from "pixi.js";
import { Viewport } from "pixi-viewport";

export class PixiEngine {
  private app: PIXI.Application | null = null;
  private viewport: Viewport | null = null;
  private worldLayer: PIXI.Container | null = null;

  private destroyed = false;
  private initToken = 0;
  private initPromise: Promise<void> | null = null;

  // --- Public getters (same as before) ---
  getApp() {
    return this.app;
  }

  getViewport() {
    return this.viewport;
  }

  getWorldLayer() {
    return this.worldLayer;
  }

  // --- INIT ---
  async init(root: HTMLDivElement) {
    const myToken = ++this.initToken;
    this.destroyed = false;

    // ✅ HARD DOM CLEANUP (prevents duplicate canvases)
    root.querySelectorAll("canvas").forEach(c => c.remove());

    this.initPromise = (async () => {
      const localApp = new PIXI.Application();

      await localApp.init({
        resizeTo: root,
        backgroundColor: 0x0,
        antialias: true,
        powerPreference: "high-performance",
      });

      // ✅ Strict-Mode + async cancellation guard
      if (this.destroyed || myToken !== this.initToken) {
        try {
          localApp.destroy(true);
        } catch {}
        return;
      }

      // ✅ SAFE TO COMMIT INSTANCE STATE
      this.app = localApp;
      root.appendChild(this.app.canvas);

      this.viewport = new Viewport({
        screenWidth: root.clientWidth,
        screenHeight: root.clientHeight,
        worldWidth: 5000,
        worldHeight: 5000,
        events: this.app.renderer.events,
      });

      this.viewport.drag().wheel().pinch().decelerate();
      this.app.stage.addChild(this.viewport);

      this.worldLayer = new PIXI.Container();
      this.viewport.addChild(this.worldLayer);

      this.addDebugContent(this.worldLayer);

      window.addEventListener("resize", this.handleResize);
    })();

    return this.initPromise;
  }

  // --- RESIZE ---
  private handleResize = () => {
    if (!this.app || !this.viewport) return;

    const parent = this.app.canvas.parentElement;
    if (!parent) return;

    const width = parent.clientWidth;
    const height = parent.clientHeight;

    this.app.renderer.resize(width, height);
    this.viewport.resize(
      width,
      height,
      this.viewport.worldWidth,
      this.viewport.worldHeight
    );
  };

  // --- DEBUG CONTENT ---
  private addDebugContent(world: PIXI.Container) {
    const g = new PIXI.Graphics();
    g.setStrokeStyle({ width: 1, color: 0x444444, alpha: 1 });

    const step = 100;
    const size = 2000;

    for (let x = -size; x <= size; x += step) {
      g.moveTo(x, -size);
      g.lineTo(x, size);
    }

    for (let y = -size; y <= size; y += step) {
      g.moveTo(-size, y);
      g.lineTo(size, y);
    }

    world.addChild(g);

    const center = new PIXI.Graphics();
    center.rect(-50, -50, 100, 100).fill(0x00ff99);
    world.addChild(center);
  }

  // --- DESTROY ---
  destroy() {
    this.destroyed = true;
    this.initToken++; // ✅ invalidates all pending async inits

    if (!this.initPromise) return;

    if (this.app) {
      try {
        window.removeEventListener("resize", this.handleResize);

        const canvas = this.app.canvas;
        this.app.destroy(true);

        // ✅ ALWAYS manually remove canvas
        if (canvas && canvas.parentElement) {
          canvas.parentElement.removeChild(canvas);
        }
      } catch {}
    }

    this.app = null;
    this.viewport = null;
    this.worldLayer = null;
    this.initPromise = null;
  }
}
