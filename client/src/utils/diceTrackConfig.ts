// ==========================
// DiceTrack Configuration
// ==========================

export const GRID_CONFIG = {
  hexDimensions: 24,
  hexOrigin: "topLeft" as const,
  viewBoxPadding: 10,
  defaultViewBox: "0 0 100 100",
  hexScale: 0.97, // used by HexCell, not needed for mask path
};

// Toggle if you want to see loop vertices for sanity
export const SHOW_DEBUG_POINTS = false;

// ==========================
// Inner edge specification
// ==========================
export const INNER_EDGE_SPEC: Record<string, Array<number | string>> = {
  // top edge (left → right)
  "0,0": ["SE"],
  "1,-1": ["S"],
  "2,-1": ["SW", "S", "SE"],
  "3,-2": ["S"],
  "4,-2": ["SW", "S", "SE"],
  "5,-3": ["S"],
  "6,-3": ["SW", "S", "SE"],
  "7,-4": ["S"],
  "8,-4": ["SW", "S", "SE"],
  "9,-5": ["S"],
  "10,-5": ["SW"],

  // right edge (top → bottom)
  "10,-4": ["NW", "SW"],
  "10,-3": ["NW", "SW"],
  "10,-2": ["NW", "SW"],
  "10,-1": ["NW", "SW"],
  "10,0": ["NW", "SW"],
  "10,1": ["NW", "SW"],
  "10,2": ["NW"], // bottom-right corner

  // bottom edge (right → left)
  "9,3": ["N"],
  "8,3": ["NE", "N", "NW"],
  "7,4": ["N"],
  "6,4": ["NE", "N", "NW"],
  "5,5": ["N"],
  "4,5": ["NE", "N", "NW"],
  "3,6": ["N"],
  "2,6": ["NE", "N", "NW"],
  "1,7": ["N"],
  "0,7": ["NE"], // bottom-left corner

  // left edge (bottom → top)
  "0,6": ["NE", "SE"],
  "0,5": ["NE", "SE"],
  "0,4": ["NE", "SE"],
  "0,3": ["NE", "SE"],
  "0,2": ["NE", "SE"],
  "0,1": ["NE", "SE"],
};

export const TRACK_SPEC = [
  [0,0],
  [1,-1],
  [2,-1],
  [3,-2],
  [4,-2],
  [5,-3],
  [6,-3],
  [7,-4],
  [8,-4],
  [9,-5],
  [10,-5],
  [10,-4],
  [10,-3],
  [10,-2],
  [10,-1],
  [10,0],
  [10,1],
  [10,2],
  [9,3],
  [8,3],
  [7,4],
  [6,4],
  [5,5],
  [4,5],
  [3,6],
  [2,6],
  [1,7],
  [0,7],
  [0,6],
  [0,5],
  [0,4],
  [0,3],
  [0,2],
  [0,1],
];
