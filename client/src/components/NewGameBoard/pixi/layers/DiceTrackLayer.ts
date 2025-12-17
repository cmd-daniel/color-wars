import * as PIXI from "pixi.js";
import { TRACK_COORDINATES, INNER_EDGE_SPEC } from "../../config/dice-track-config";
import { pixiTargetLocator } from "@/animation/target-locator";
import { BACKGROUND_COLOR } from "../engine";
import { TokenLayer } from "./TokenLayer";
import { type TileType, DICE_TRACK } from "@color-wars/shared/src/config/diceTrack";

export class DiceTrackLayer extends PIXI.Container {
  private background: PIXI.Graphics;
  private trackContainer: PIXI.Container;
  private hexTexture: PIXI.Texture | null = null;
  private sprites: PIXI.Sprite[] = [];
  public tokenLayer: TokenLayer | null = null;
  private hexTextures: Partial<Record<TileType, PIXI.Texture>> = {};

  // Configuration
  private readonly PADDING = 0; // Padding from screen edge

  constructor() {
    super();

    // 1. Background (The opaque wall with the hole)
    this.background = new PIXI.Graphics();
    this.background.eventMode = "static"; // Block clicks
    this.addChild(this.background);

    // 2. Track (The visible tiles)
    this.trackContainer = new PIXI.Container();
    this.addChild(this.trackContainer);
  }
  /**
   * Called once by engine to setup the sprites
   */
  public init(app: PIXI.Application) {
    // Generate a high-res texture for the hexes
    this.hexTexture = this.generateRoundedHexTexture(app, 64);
    this.hexTextures = this.generateRoundedHexTextures(app, 64);

    // Create Sprites
    TRACK_COORDINATES.forEach((coord, i) => {
      const sprite = new PIXI.Sprite(this.hexTextures[DICE_TRACK[i]]);
      sprite.anchor.set(0.5);
      const targetID = `track-tile-${coord.q}-${coord.r}`;
      if (!sprite.destroyed) pixiTargetLocator.register(targetID, sprite); // register for animation
      sprite.label = targetID; // Debug label
      this.sprites.push(sprite);
      this.trackContainer.addChild(sprite);
    });

    this.tokenLayer = new TokenLayer();
    pixiTargetLocator.register("tokenLayer", this.tokenLayer);
    this.trackContainer.addChild(this.tokenLayer);
  }

  public getTrackLayer() {
    return this.trackContainer;
  }

  public getTokenLayer() {
    return this.tokenLayer;
  }

  /**
   * Called on Resize: Fits the track to the screen and cuts the hole
   */
  public resize(screenWidth: number, screenHeight: number) {
    if (this.sprites.length === 0) return;

    // --- 1. Calculate Cartesian Bounds of the Track ---
    // We assume an arbitrary hex size of 1.0 to find the aspect ratio
    let minX = Infinity,
      maxX = -Infinity,
      minY = Infinity,
      maxY = -Infinity;

    TRACK_COORDINATES.forEach((c) => {
      const { x, y } = this.axialToFlat(c.q, c.r, 1);
      if (x < minX) minX = x;
      if (x > maxX) maxX = x;
      if (y < minY) minY = y;
      if (y > maxY) maxY = y;
    });

    // Dimensions of the track in "unit" hexes
    // Add roughly 2.0 (1 hex width on each side) to account for the sprite size itself
    // Width of flat top = 2 * size.
    const trackWidth = maxX - minX + 2.0;
    const trackHeight = maxY - minY + 1.8; // height is sqrt(3) ~ 1.732

    // --- 2. Determine Scale ---
    const availW = screenWidth - this.PADDING * 2;
    const availH = screenHeight - this.PADDING * 2;

    const scaleX = availW / trackWidth;
    const scaleY = availH / trackHeight;

    // Choose smaller scale to fit entirely
    const hexSize = Math.floor(Math.min(scaleX, scaleY));

    // --- 3. Position Track ---
    // Center the container
    this.trackContainer.position.set(screenWidth / 2, screenHeight / 2);

    // Calculate offset to center the grid within the container
    const offsetX = (-(minX + maxX) / 2) * hexSize;
    const offsetY = (-(minY + maxY) / 2) * hexSize;
    const scale = hexSize / 64;

    // Update Sprites
    TRACK_COORDINATES.forEach((c, i) => {
      const { x, y } = this.axialToFlat(c.q, c.r, hexSize);
      this.sprites[i].position.set(x + offsetX, y + offsetY);
      // Scale texture to match the calculated size
      // Texture radius is 64. Real radius is hexSize.
      this.sprites[i].scale.set(scale);
    });

    // --- 4. Draw Overlay with Hole ---
    this.drawOverlay(screenWidth, screenHeight, hexSize, offsetX, offsetY);
    this.tokenLayer!.resize(scale);
  }

  private drawOverlay(w: number, h: number, size: number, offX: number, offY: number) {
    const g = this.background;
    g.clear();

    // 1. Draw Opaque Screen
    g.rect(0, 0, w, h).fill({ color: BACKGROUND_COLOR, alpha: 1.0 });

    // 2. Cut out the Hole
    // We walk through the INNER_EDGE_SPEC
    const points: { x: number; y: number }[] = [];

    for (const key in INNER_EDGE_SPEC) {
      const edges = INNER_EDGE_SPEC[key];
      const [q, r] = key.split(",").map(Number);

      // Center of this hex relative to screen center
      const { x: cx, y: cy } = this.axialToFlat(q, r, size);
      // Absolute screen position
      const absX = w / 2 + offX + cx;
      const absY = h / 2 + offY + cy;

      // Add corners for these edges
      // Edge i connects Corner i to Corner (i+1)%6
      edges.forEach((edgeIdx) => {
        const p = this.getFlatHexCorner(absX, absY, size, edgeIdx);

        const last = points[points.length - 1];
        if (!last || Math.hypot(p.x - last.x, p.y - last.y) > 2) {
          points.push(p);
        }
      });
    }

    this.drawRoundedLoop(g, points, 12);
    g.cut();
    // this.drawRoundedLoop(g, points, 4);
    // g.stroke({ width: 4, color: 0x111111, join: "round", cap: "round" }); // Debug: visualize the cut line
  }

  private drawRoundedLoop(g: PIXI.Graphics, points: { x: number; y: number }[], radius: number) {
    if (points.length < 3) return;

    // To round corners, we start between the last and first point
    const len = points.length;
    const p0 = points[len - 1];
    const p1 = points[0];

    // Start mid-segment to allow arcTo to work on the first corner
    const startX = (p0.x + p1.x) / 2;
    const startY = (p0.y + p1.y) / 2;

    g.moveTo(startX, startY);

    for (let i = 0; i < len; i++) {
      const p = points[i];
      const next = points[(i + 1) % len];
      // Draw line to current point, then curve toward next
      g.arcTo(p.x, p.y, next.x, next.y, radius);
    }
    g.closePath();
  }

  private axialToFlat(q: number, r: number, size: number) {
    // Flat Top Conversion
    // x = size * 3/2 * q
    // y = size * sqrt(3) * (r + q/2)
    const x = size * 1.5 * q;
    const y = size * Math.sqrt(3) * (r + q / 2);
    return { x, y };
  }

  private getFlatHexCorner(cx: number, cy: number, size: number, i: number) {
    const angle_deg = 60 * i;
    const angle_rad = (Math.PI / 180) * angle_deg;
    return {
      x: cx + size * Math.cos(angle_rad),
      y: cy + size * Math.sin(angle_rad),
    };
  }

  private generateRoundedHexTexture(app: PIXI.Application, radius: number) {
    const g = new PIXI.Graphics();
    const r = radius;

    g.roundPoly(0, 0, r, 6, 10, Math.PI / 6);

    g.fill(0xffffff); // White for tinting
    g.stroke({ width: 0, color: 0x111111 }); // Inner border

    return app.renderer.textureGenerator.generateTexture({
      target: g,
      resolution: 1,
      antialias: true,
    });
  }

  private generateRoundedHexTextures(app: PIXI.Application, radius: number) {
    const hexTextures: Partial<Record<TileType, PIXI.Texture>> = {};
  
    const drawHex = (
      innerStrokeColor: number,
      outerStrokeColor: number,
      fillColor: number,
      innerStrokeWidth = 4,
      outerStrokeWidth = 5,
    ) => {
      const g = new PIXI.Graphics();
  
      // OUTER STROKE PATH
      g.roundPoly(0, 0, radius, 6, 10, Math.PI / 6);
      g.stroke({ width: outerStrokeWidth, color: outerStrokeColor, alignment:0 });
  
      // INNER STROKE PATH
      g.roundPoly(0, 0, radius - outerStrokeWidth, 6, 10, Math.PI / 6);
      g.stroke({ width: innerStrokeWidth, color: innerStrokeColor, alignment: 1 });
  
      // FILL PATH
      g.roundPoly(0, 0, radius - outerStrokeWidth - innerStrokeWidth, 6, 10, Math.PI / 6);
      g.fill(innerStrokeColor);
  
      return app.renderer.textureGenerator.generateTexture({
        target: g,
        resolution: window.devicePixelRatio || 1,
        antialias: true,
      });
    };
  
    hexTextures.START    = drawHex(0xffffff, 0x09090b, 0x262626);
    hexTextures.SAFE     = drawHex(0x262626, 0x09090b, 0x262626);
    hexTextures.SURPRISE = drawHex(0xF1C40F, 0x09090b, 0x262626);
    hexTextures.INCOME   = drawHex(0x27AE60, 0x09090b, 0x262626);
    hexTextures.TAX      = drawHex(0x9B59B6, 0x09090b, 0x262626);
    hexTextures.PENALTY  = drawHex(0xE74C3C, 0x09090b, 0x262626);
    hexTextures.REWARD   = drawHex(0x3498DB, 0x09090b, 0x262626);
  
    return hexTextures;
  }
}
