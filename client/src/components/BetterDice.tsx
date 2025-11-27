// src/components/Dice.tsx
// Pure visual dice component — no physics, no logic

import React from "react";
import { Quaternion } from "@/lib/diceMath";
import styles from "@components/Dice.module.css";

export interface DiceProps {
  quaternion: Quaternion;
}

export const Dice: React.FC<DiceProps> = ({ quaternion }) => {
  const transform = quaternion.toCSSMatrix();

  return (
    <div className={styles.diceWrap}>
      <div className={styles.dice} style={{ transform }}>
        <div className={`${styles.diceFace} ${styles.face4}`}></div>
        <div className={`${styles.diceFace} ${styles.face3}`}></div>
        <div className={`${styles.diceFace} ${styles.face5}`}></div>
        <div className={`${styles.diceFace} ${styles.face2}`}></div>
        <div className={`${styles.diceFace} ${styles.face6}`}></div>
        <div className={`${styles.diceFace} ${styles.face1}`}></div>
      </div>
    </div>
  );
};

export default Dice;
