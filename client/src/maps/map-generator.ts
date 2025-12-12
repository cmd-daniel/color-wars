import type { TestMap, AxialHex } from "@/components/NewGameBoard/pixi/engine";

// Directions for moving neighbor-to-neighbor in a hex grid
const HEX_DIRECTIONS = [
  { q: +1, r: 0 },
  { q: +1, r: -1 },
  { q: 0, r: -1 },
  { q: -1, r: 0 },
  { q: -1, r: +1 },
  { q: 0, r: +1 },
];

export function generateProceduralMap(hexCount: number, hexSize: number = 20): TestMap {
  const hexes: AxialHex[] = [];
  const territoryIds = ["A", "B", "C", "D", "E", "F", "G", "H"];

  // 1. Add Center Hex
  hexes.push({ q: 0, r: 0, s: 0, stateId: resolveState(0, 0, territoryIds) });

  // 2. Spiral Outwards until we hit the count
  // Based on Red Blob Games: https://www.redblobgames.com/grids/hexagons/#rings
  let radius = 1;
  while (hexes.length < hexCount) {
    // Start at: q = -radius, r = radius (Bottom Leftish in pointy top)
    // Actually, let's start at direction 4 multiplied by radius
    let q = -radius;
    let r = radius; // direction 4 is (-1, 1)

    // Walk around the 6 sides of the ring
    for (let i = 0; i < 6; i++) {
      const dir = HEX_DIRECTIONS[i];
      // Each side has length equal to radius
      for (let j = 0; j < radius; j++) {
        // Stop exactly when we hit the limit
        if (hexes.length >= hexCount) break;

        // Move to neighbor
        q += dir.q;
        r += dir.r;

        hexes.push({
          q,
          r,
          s: -q - r,
          stateId: resolveState(q, r, territoryIds),
        });
      }
    }
    radius++;
  }

  return {
    id: `generated-${hexCount}`,
    grid: {
      orientation: "pointy",
      hexSize,
      origin: { q: 0, r: 0 },
    },
    hexes,
  };
}

/**
 * Determines a "Territory ID" based on coordinates to create distinct blobs.
 * Uses simple sin/cos waves to simulate noise without external libraries.
 */
function resolveState(q: number, r: number, ids: string[]): string {
  // Scale down coords to make "features" larger
  // Lower scale = Larger territories
  const scale = 0.15;

  // Create a pseudo-random value between -1 and 1
  const noise = Math.sin(q * scale) + Math.cos(r * scale * 0.8) + Math.sin((q + r) * scale * 0.5);

  // Normalize roughly to 0..1
  // noise range is roughly -3 to +3, so add 3 divide by 6
  const normalized = (noise + 3) / 6;

  // Pick an ID
  const index = Math.floor(normalized * ids.length);
  return ids[Math.max(0, Math.min(ids.length - 1, index))];
}
