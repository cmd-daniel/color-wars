import * as PIXI from "pixi.js";
import { TRACK_COORDINATES, INNER_EDGE_SPEC } from "../../config/dice-track-config";

export class DiceTrackLayer extends PIXI.Container {
  private background: PIXI.Graphics;
  private trackContainer: PIXI.Container;
  private hexTexture: PIXI.Texture | null = null;
  private sprites: PIXI.Sprite[] = [];

  // Configuration
  private readonly PADDING = 0; // Padding from screen edge
  private readonly CORNER_RADIUS_RATIO = 0.25; // 25% rounding

  constructor() {
    super();
    
    // 1. Background (The opaque wall with the hole)
    this.background = new PIXI.Graphics();
    this.background.eventMode = 'static'; // Block clicks
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

    // Create Sprites
    TRACK_COORDINATES.forEach((coord, i) => {
      const sprite = new PIXI.Sprite(this.hexTexture!);
      sprite.anchor.set(0.5);
      sprite.tint = i % 2 === 0 ? 0x444444 : 0x555555; // Placeholder pattern
      sprite.label = `${coord.q},${coord.r}`; // Debug label
      this.sprites.push(sprite);
      this.trackContainer.addChild(sprite);
    });

  }

  /**
   * Called on Resize: Fits the track to the screen and cuts the hole
   */
  public resize(screenWidth: number, screenHeight: number) {
    if (this.sprites.length === 0) return;

    // --- 1. Calculate Cartesian Bounds of the Track ---
    // We assume an arbitrary hex size of 1.0 to find the aspect ratio
    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;

    TRACK_COORDINATES.forEach(c => {
      const { x, y } = this.axialToFlat(c.q, c.r, 1);
      if (x < minX) minX = x; if (x > maxX) maxX = x;
      if (y < minY) minY = y; if (y > maxY) maxY = y;
    });

    // Dimensions of the track in "unit" hexes
    // Add roughly 2.0 (1 hex width on each side) to account for the sprite size itself
    // Width of flat top = 2 * size. 
    const trackWidth = (maxX - minX) + 2.0; 
    const trackHeight = (maxY - minY) + 1.8; // height is sqrt(3) ~ 1.732

    // --- 2. Determine Scale ---
    const availW = screenWidth - (this.PADDING * 2);
    const availH = screenHeight - (this.PADDING * 2);
    
    const scaleX = availW / trackWidth;
    const scaleY = availH / trackHeight;
    
    // Choose smaller scale to fit entirely
    const hexSize = Math.floor(Math.min(scaleX, scaleY)); 

    // --- 3. Position Track ---
    // Center the container
    this.trackContainer.position.set(screenWidth / 2, screenHeight / 2);
    
    // Calculate offset to center the grid within the container
    const offsetX = -(minX + maxX) / 2 * hexSize;
    const offsetY = -(minY + maxY) / 2 * hexSize;

    // Update Sprites
    TRACK_COORDINATES.forEach((c, i) => {
      const { x, y } = this.axialToFlat(c.q, c.r, hexSize);
      this.sprites[i].position.set(x + offsetX, y + offsetY);
      // Scale texture to match the calculated size
      // Texture radius is 64. Real radius is hexSize.
      const scale = hexSize / 64; 
      this.sprites[i].scale.set(scale);
    });

    // --- 4. Draw Overlay with Hole ---
    this.drawOverlay(screenWidth, screenHeight, hexSize, offsetX, offsetY);
  }

  private drawOverlay(w: number, h: number, size: number, offX: number, offY: number) {
    const g = this.background;
    g.clear();

    // 1. Draw Opaque Screen
    g.rect(0, 0, w, h).fill({ color: 0x111111, alpha: 1.0 });

    // 2. Cut out the Hole
    // We walk through the INNER_EDGE_SPEC
    const points: {x: number, y: number}[] = [];

    // Order matters for the hole polygon. 
    // The keys in INNER_EDGE_SPEC in your config are ordered (Top -> Right -> Bottom -> Left).
    // We iterate them in that order.
    
    for (const key in INNER_EDGE_SPEC) {
      const edges = INNER_EDGE_SPEC[key];
      const [q, r] = key.split(',').map(Number);
      
      // Center of this hex relative to screen center
      const { x: cx, y: cy } = this.axialToFlat(q, r, size);
      // Absolute screen position
      const absX = (w / 2) + offX + cx;
      const absY = (h / 2) + offY + cy;

      // Add corners for these edges
      // Edge i connects Corner i to Corner (i+1)%6
      edges.forEach(edgeIdx => {
        // Flat Top Corners
        // 0: Right, 1: BotRight, 2: BotLeft, 3: Left, 4: TopLeft, 5: TopRight
        // const startCorner = edgeIdx; 
        // const endCorner = (edgeIdx + 1) % 6;

        // We push the Start Corner. 
        // (Simplification: pushing all start corners in order effectively traces the path)
        // Ideally we need a connected path. Since the input list is contiguous, 
        // we can just push the vertices.
        
        const p = this.getFlatHexCorner(absX, absY, size , edgeIdx);
        
        const last = points[points.length - 1];
        if (!last || Math.hypot(p.x - last.x, p.y - last.y) > 2) {
          points.push(p);
        }
        
        // Note: We don't push endCorner here because it will be the startCorner of the next edge/hex
        // Exception: The very last point might need closing, but Pixi handles closePath.
        
        // Actually, for specific corner logic:
        // We probably want the point BETWEEN the edges.
        // But simply tracing the corners of the specified edges usually works for HUD masks.
      });
      
      // Special case: Add the END corner of the very last edge of this hex 
      // to ensure we bridge the gap to the next hex?
      // Actually, relying on the sequence of INNER_EDGE_SPEC is safer. 
      // Let's trust the points array will form a valid shape.
    }

    //g.cut(); // Switch to hole mode
    //g.poly(points, true) // Draw the polygon

    this.drawRoundedLoop(g, points, 12)
    g.cut()
    this.drawRoundedLoop(g, points, 4)
    g.stroke({ width: 4, color: 0x111111, join:'round', cap:'round' }); // Debug: visualize the cut line
  }

  // --- Helpers ---

  private drawRoundedLoop(g: PIXI.Graphics, points: {x: number, y: number}[], radius: number) {
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
      y: cy + size * Math.sin(angle_rad)
    };
  }

  private generateRoundedHexTexture(app: PIXI.Application, radius: number) {
    const g = new PIXI.Graphics();
    const r = radius; 
    // We draw slightly smaller to account for stroke if needed, 
    // but here we just fill.
    
    // const corners = [];
    // for (let i = 0; i < 6; i++) {
    //   const angle = (Math.PI / 180) * (60 * i);
    //   corners.push({ x: r * Math.cos(angle), y: r * Math.sin(angle) });
    // }

    // // Draw Rounded Poly manually using quadratic curves or arcTo
    // // Simple approx: Draw line to a bit before corner, quadCurve to bit after corner
    // g.moveTo(corners[0].x, corners[0].y); // Start at right
    
    // // Actually, Pixi 8 has roundPoly built-in?
    // // g.roundPoly(..., radius) - if not, use the manual path.
    // // Let's use a robust manual path for "Flat Top"
    
    // const cornerRadius = r * this.CORNER_RADIUS_RATIO;
    
    // // Start mid-bottom-right edge
    // const midX = (corners[0].x + corners[1].x) / 2;
    // const midY = (corners[0].y + corners[1].y) / 2;
    // g.moveTo(midX, midY);

    // for (let i = 1; i <= 6; i++) {
    //   const current = corners[i % 6];
    //   const next = corners[(i + 1) % 6];
    //   // ArcTo is perfect for this
    //   g.arcTo(current.x, current.y, next.x, next.y, cornerRadius);
    // }

    g.roundPoly(0, 0, r, 6, 10, Math.PI/6)

    g.fill(0xffffff); // White for tinting
    g.stroke({ width: 4, color: 0x111111 }); // Inner border

    return app.renderer.textureGenerator.generateTexture({
      target: g,
      resolution: 1,
      antialias: true
    });
  }
}
