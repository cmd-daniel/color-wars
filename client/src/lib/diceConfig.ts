// src/lib/diceConfig.ts
// Face normals and dice configuration

import { Vector3 } from "./diceMath";
export const FACE_NORMALS: Record<number, Vector3> = {
  1: new Vector3(0, -1, 0), // Bottom
  2: new Vector3(1, 0, 0), // Right
  3: new Vector3(0, 0, 1), // Front
  4: new Vector3(0, 0, -1), // Back
  5: new Vector3(-1, 0, 0), // Left
  6: new Vector3(0, 1, 0), // Top
};

// Physics constant (must not change)
export const VELOCITY_CUTOFF_THRESHOLD = 0.0003;
