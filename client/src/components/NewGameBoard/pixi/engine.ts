// src/pixi/engine.ts
import * as PIXI from "pixi.js";
import { Viewport } from "pixi-viewport";

let app: PIXI.Application | null = null;
let viewport: Viewport | null = null;
let worldLayer: PIXI.Container | null = null;

let initPromise: Promise<void> | null = null;
let destroyed = false;

// 🚨 THIS is the crucial fix:
let initToken = 0; // increments on every init request

export const getApp = () => app;
export const getViewport = () => viewport;
export const getWorldLayer = () => worldLayer;

export async function initPixi(root: HTMLDivElement) {
  const myToken = ++initToken; // each init gets a unique token

  // Hard DOM cleanup (defensive)
  root.querySelectorAll("canvas").forEach(c => c.remove());

  destroyed = false;

  initPromise = (async () => {
    const localApp = new PIXI.Application();

    await localApp.init({
      resizeTo: root,
      backgroundColor: 0x0,
      antialias: true,
      powerPreference: "high-performance",
    });

    // ✅ CANCEL STALE ASYNC INITS
    if (destroyed || myToken !== initToken) {
      try {
        localApp.destroy(true);
      } catch {}
      return;
    }

    // ✅ Now it is GUARANTEED this is the only live instance
    app = localApp;
    root.appendChild(app.canvas);

    viewport = new Viewport({
      screenWidth: root.clientWidth,
      screenHeight: root.clientHeight,
      worldWidth: 5000,
      worldHeight: 5000,
      events: app.renderer.events,
    });

    viewport.drag().wheel().pinch().decelerate();
    app.stage.addChild(viewport);

    worldLayer = new PIXI.Container();
    viewport.addChild(worldLayer);

    addDebugContent(worldLayer);

    window.addEventListener("resize", handleResize);
  })();

  return initPromise;
}

function handleResize() {
  if (!app || !viewport) return;

  const parent = app.canvas.parentElement;
  if (!parent) return;

  const width = parent.clientWidth;
  const height = parent.clientHeight;

  app.renderer.resize(width, height);
  viewport.resize(width, height, viewport.worldWidth, viewport.worldHeight);
}

function addDebugContent(world: PIXI.Container) {
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

export function destroyPixi() {
  destroyed = true;
  initToken++; // 🚨 invalidates ALL pending async inits

  if (!initPromise) return;

  if (app) {
    try {
      window.removeEventListener("resize", handleResize);

      const canvas = app.canvas;
      app.destroy(true);

      if (canvas && canvas.parentElement) {
        canvas.parentElement.removeChild(canvas);
      }
    } catch {}
  }

  app = null;
  viewport = null;
  worldLayer = null;
  initPromise = null;
}
