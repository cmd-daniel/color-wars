// src/lib/rotationCalculator.ts
// DiceRotationCalculator: computes target orientations & random quaternions

import {
  Quaternion,
  Vector3,
  swingTwistDecomposition,
  getRotationBetweenVectors,
} from "./diceMath";
import { FACE_NORMALS } from "./diceConfig";

export class DiceRotationCalculator {
  upDirection: Vector3;

  constructor(upDirection: Vector3 = new Vector3(0, 1, 0)) {
    this.upDirection = upDirection;
  }

  calculateRotationToFace(currentQuaternion: Quaternion, faceNumber: number): Quaternion {
    const faceLocalNormal = FACE_NORMALS[faceNumber].clone();
    const faceWorldNormal = faceLocalNormal.applyQuaternion(currentQuaternion);

    const alignmentQuat = getRotationBetweenVectors(faceWorldNormal, this.upDirection);
    const { swing } = swingTwistDecomposition(alignmentQuat, this.upDirection);

    const result = swing.multiply(currentQuaternion);
    return result;
  }

  generateRandomQuaternion(): Quaternion {
    const u1 = Math.random();
    const u2 = Math.random();
    const u3 = Math.random();

    return new Quaternion(
      Math.sqrt(1 - u1) * Math.sin(2 * Math.PI * u2),
      Math.sqrt(1 - u1) * Math.cos(2 * Math.PI * u2),
      Math.sqrt(u1) * Math.sin(2 * Math.PI * u3),
      Math.sqrt(u1) * Math.cos(2 * Math.PI * u3),
    );
  }
}
