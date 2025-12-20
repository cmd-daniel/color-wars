// src/components/Dice.tsx
// Pure visual dice component — no physics, no logic

import {type FC, useLayoutEffect, useRef} from "react";
import { Quaternion } from "@/lib/diceMath";
import styles from "@components/Dice.module.css";

export interface DiceProps {
  quaternion: Quaternion;
}

export const Dice: FC<DiceProps> = ({ quaternion }) => {
  const transform = quaternion.toCSSMatrix();
  const ref = useRef<HTMLDivElement | null>(null);
  useLayoutEffect(() => {
    console.log('setting up ResizeObserver for dice sizing');
    const el = ref.current;
    if (!el || typeof ResizeObserver === "undefined") return;

    const update = () => {
      const parent = el.parentElement ?? el;
      console.log('updating dice size based on parent height:', parent.getBoundingClientRect().height);
      const size = Math.round(parent.getBoundingClientRect().height  * 0.6); // match your desired percent
      el.firstChild && (el.firstChild as HTMLElement).style.setProperty("--dice-side", `${size}px`);
    };

    update();
    const ro = new ResizeObserver(update);
    ro.observe(el.parentElement ?? el);
    return () => ro.disconnect();
  }, []);
  return (
    <div ref={ref} className={styles.diceWrap}>
      <div className={styles.dice} style={{ transform }}>
        <div className={`${styles.diceFace} ${styles.face1}`}></div>
        <div className={`${styles.diceFace} ${styles.face2}`}></div>
        <div className={`${styles.diceFace} ${styles.face3}`}></div>
        <div className={`${styles.diceFace} ${styles.face4}`}></div>
        <div className={`${styles.diceFace} ${styles.face5}`}></div>
        <div className={`${styles.diceFace} ${styles.face6}`}></div>
      </div>
    </div>
  );
};

export default Dice;
