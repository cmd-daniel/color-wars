// components/Gameboard/DiceTrack/hooks/useTrackGeometry.ts
import { useMemo } from "react";
import type { Hex } from "honeycomb-grid";
import { createHollowGrid, computeViewBox } from "@/utils/gridUtils";
import { buildInnerPathFromSpec } from "@/utils/hexEdgeUtils";
import { INNER_EDGE_SPEC } from "@/utils/diceTrackConfig";
import type { Point } from "@/utils/geometryUtils";

export interface TrackGeometry {
  hexes: Hex[];
  tileCenters: Array<{ x: number; y: number }>;
  viewBox: { minX: number; minY: number; width: number; height: number };
  innerLoop: Point[] | null;
}

export const useTrackGeometry = (): TrackGeometry => {
  return useMemo(() => {
    const grid = createHollowGrid();
    const hexes = Array.from(grid) as Hex[];

    const [minX, minY, width, height] = computeViewBox(grid)
      .split(" ")
      .map((v) => Number.parseFloat(v));

    const inner = buildInnerPathFromSpec(grid, INNER_EDGE_SPEC, {
      radius: 3,
      edgeScaleForLoop: 1,
    });

    const tileCenters = hexes.map((h) => ({ x: h.x, y: h.y }));

    return {
      hexes,
      tileCenters,
      viewBox: { minX, minY, width, height },
      innerLoop: inner?.loop ?? null,
    };
  }, []);
};
