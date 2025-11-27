// src/components/Dice.tsx
// Pure visual dice component — no physics, no logic

import React from "react";
import { Quaternion } from "@/lib/diceMath";
import styles from '@components/Dice.module.css'

export interface DiceProps {
  quaternion: Quaternion;
}

const faceStyle: React.CSSProperties = {
  position: "absolute",
  width: "100px",
  height: "100px",
  border: "4px solid white",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  fontSize: "80px",
  fontWeight: "bold",
  color: "white"
};

export const Dice: React.FC<DiceProps> = ({ quaternion }) => {
  const transform = quaternion.toCSSMatrix();

  return (
    <div
      style={{
        transformStyle: "preserve-3d",
        transform: "rotateX(-60deg) rotateY(45deg)"
      }}
    >
      <div
        style={{
          width: "100px",
          height: "100px",
          position: "relative",
          transformStyle: "preserve-3d",
          transform
        }}
      >
        {/* Front - Face 4 */}
        <div
          style={{
            ...faceStyle,
            background: "#aa96da",
            transform: "rotateY(0deg) translateZ(50px)"
          }}
        >
          4
        </div>

        {/* Back - Face 3 */}
        <div
          style={{
            ...faceStyle,
            background: "#f38181",
            transform: "rotateY(180deg) translateZ(50px)"
          }}
        >
          3
        </div>

        {/* Right - Face 5 */}
        <div
          style={{
            ...faceStyle,
            background: "#4ecdc4",
            transform: "rotateY(90deg) translateZ(50px)"
          }}
        >
          5
        </div>

        {/* Left - Face 2 */}
        <div
          style={{
            ...faceStyle,
            background: "#ff6b6b",
            transform: "rotateY(-90deg) translateZ(50px)"
          }}
        >
          2
        </div>

        {/* Top - Face 6 */}
        <div
          style={{
            ...faceStyle,
            background: "#ffe66d",
            transform: "rotateX(90deg) translateZ(50px)"
          }}
        >
          6
        </div>

        {/* Bottom - Face 1 */}
        <div
          style={{
            ...faceStyle,
            background: "#95e1d3",
            transform: "rotateX(-90deg) translateZ(50px)"
          }}
        >
          1
        </div>
      </div>
    </div>
  );
};

export default Dice;
