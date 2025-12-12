import {
  defineHex,
  Direction,
  fromCoordinates,
  Grid,
  Hex,
  move,
  Orientation,
  type Traverser,
} from "honeycomb-grid";
import { type Point } from "./geometryUtils";
import { GRID_CONFIG } from "./diceTrackConfig";

export function createHollowGrid() {
  const Hexagon = defineHex({
    dimensions: GRID_CONFIG.hexDimensions,
    origin: GRID_CONFIG.hexOrigin,
    orientation: Orientation.FLAT,
  });

  // Build your hollow rectangular ring
  const hollowPath: Array<Traverser<Hex>> = [];
  hollowPath.push(fromCoordinates({ q: 0, r: 0, s: 0 }));
  for (let i = 0; i < 5; i++) {
    hollowPath.push(move(Direction.NE));
    hollowPath.push(move(Direction.SE));
  }
  for (let i = 0; i < 7; i++) {
    hollowPath.push(move(Direction.S));
  }
  for (let i = 0; i < 5; i++) {
    hollowPath.push(move(Direction.SW));
    hollowPath.push(move(Direction.NW));
  }
  for (let i = 0; i < 7; i++) {
    hollowPath.push(move(Direction.N));
  }

  return new Grid(Hexagon, hollowPath);
}

export function computeViewBox(grid: Grid<Hex>) {
  let minX = Infinity,
    minY = Infinity,
    maxX = -Infinity,
    maxY = -Infinity;
  grid.forEach((hex: Hex) => {
    (hex.corners as Point[]).forEach(({ x, y }) => {
      minX = Math.min(minX, x);
      minY = Math.min(minY, y);
      maxX = Math.max(maxX, x);
      maxY = Math.max(maxY, y);
    });
  });
  const pad = GRID_CONFIG.viewBoxPadding;
  return `${minX - pad} ${minY - pad} ${maxX - minX + 2 * pad} ${maxY - minY + 2 * pad}`;
}
