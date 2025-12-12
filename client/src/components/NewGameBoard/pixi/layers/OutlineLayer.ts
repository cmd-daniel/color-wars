import * as PIXI from "pixi.js";
import type { GameMap, MapHex } from "@/types/map-types";
import { hslStringToHex } from "@/utils/color-utils";

export class OutlineLayer extends PIXI.Container {
  private bordersContainer: PIXI.Container;
  private fillsContainer: PIXI.Container;

  // Storage for lookups
  private stateGraphics: Map<string, { border: PIXI.Graphics; fill: PIXI.Graphics }> = new Map();

  // Interaction State
  private activeHoverId: string | null = null;
  private activeSelectId: string | null = null;

  constructor() {
    super();
    // Order matters: Fills at bottom, Borders on top
    this.fillsContainer = new PIXI.Container();
    this.bordersContainer = new PIXI.Container();

    this.addChild(this.fillsContainer);
    this.addChild(this.bordersContainer);
  }

  public build(map: GameMap) {
    this.fillsContainer.removeChildren();
    this.bordersContainer.removeChildren();
    this.stateGraphics.clear();

    const { hexSize } = map.grid;
    const hexMap = new Map<string, string>();

    // 1. Map Hex -> State
    map.hexes.forEach((h) => {
      if (h.stateId) hexMap.set(`${h.q},${h.r}`, h.stateId);
    });

    // 2. Group Hexes by State
    const states = new Map<string, MapHex[]>();
    map.hexes.forEach((h) => {
      if (!h.stateId) return;
      if (!states.has(h.stateId)) states.set(h.stateId, []);
      states.get(h.stateId)!.push(h);
    });

    // 3. Color Lookup
    const colorMap = new Map<string, number>();
    map.territories.forEach((s) => colorMap.set(s.id, hslStringToHex(s.displayColor)));

    // 4. Geometry Pre-calculation
    const width = hexSize * Math.sqrt(3);

    // Neighbor offsets (odd-r/pointy)
    const neighbors = [
      { q: 1, r: 0 },
      { q: 0, r: 1 },
      { q: -1, r: 1 },
      { q: -1, r: 0 },
      { q: 0, r: -1 },
      { q: 1, r: -1 },
    ];

    // Corner offsets
    const corners: { x: number; y: number }[] = [];
    for (let i = 0; i < 6; i++) {
      const angle = (Math.PI / 180) * (60 * i - 30);
      corners.push({ x: hexSize * Math.cos(angle), y: hexSize * Math.sin(angle) });
    }

    states.forEach((hexList, stateId) => {
      const stateColor = colorMap.get(stateId) || 0x999999;

      // --- A. Create Outline Graphics ---
      const gBorder = new PIXI.Graphics();
      // --- B. Create Fill Graphics ---
      const gFill = new PIXI.Graphics();

      hexList.forEach((h) => {
        const cx = width * (h.q + h.r / 2);
        const cy = hexSize * 1.5 * h.r;

        // 1. Draw Fill (Simply draw a hex polygon for every cell)
        // We draw it slightly overlapping to prevent hairline cracks
        gFill.poly(corners.map((c) => ({ x: cx + c.x, y: cy + c.y })));

        // 2. Draw Borders (Only on edges)
        neighbors.forEach((offset, i) => {
          const nKey = `${h.q + offset.q},${h.r + offset.r}`;
          const nState = hexMap.get(nKey);

          if (nState !== stateId) {
            const c1 = corners[i];
            const c2 = corners[(i + 1) % 6];
            gBorder.moveTo(cx + c1.x, cy + c1.y);
            gBorder.lineTo(cx + c2.x, cy + c2.y);
          }
        });
      });

      // Finalize Styles

      // Fill Style: Solid color, no stroke
      gFill.fill({ color: stateColor, alpha: 1.0 });

      // Border Style: Thick White
      gBorder.stroke({ width: 3, color: 0xffffff, alpha: 1, join: "round", cap: "round" });

      // Store references
      this.stateGraphics.set(stateId, { border: gBorder, fill: gFill });

      this.fillsContainer.addChild(gFill);
      this.bordersContainer.addChild(gBorder);
    });

    // Initial State:
    // Fills hidden (assuming we start zoomed in)
    // Borders hidden (until selected)
    this.fillsContainer.visible = false;

    // Actually, borders should probably be visible?
    // Or do you only want borders on hover?
    // Based on prompt: "outline on hover and select". So hide borders by default.
    this.bordersContainer.visible = true;
    this.bordersContainer.children.forEach((c) => (c.visible = false));
  }

  /**
   * LOD Switcher
   * mode = 'NEAR' -> Show Terrain (handled by Engine), Hide Fills
   * mode = 'FAR'  -> Hide Terrain (handled by Engine), Show Fills
   */
  public setLODMode(mode: "NEAR" | "FAR") {
    // If FAR, we show the solid fills (Political Map Mode)
    this.fillsContainer.visible = mode === "FAR";
  }

  public updateSelection(hoverId: string | null, selectId: string | null) {
    // Reset previous
    if (this.activeHoverId) this.toggleBorder(this.activeHoverId, false);
    if (this.activeSelectId) this.toggleBorder(this.activeSelectId, false);

    // Set new
    if (hoverId) this.toggleBorder(hoverId, true, 0xaaaaaa); // Greyish hover
    if (selectId) this.toggleBorder(selectId, true, 0xffd700); // Gold select

    this.activeHoverId = hoverId;
    this.activeSelectId = selectId;
  }

  private toggleBorder(stateId: string, isVisible: boolean, tint: number = 0xffffff) {
    const obj = this.stateGraphics.get(stateId);
    if (!obj) return;

    obj.border.visible = isVisible;
    if (isVisible) {
      obj.border.tint = tint;
      // Bring to top within its container
      this.bordersContainer.addChild(obj.border);
    }
  }
}
