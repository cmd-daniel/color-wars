import { useState, useEffect, useRef, useMemo } from "react";
import styles from "./Dice.module.css";

interface DiceProps {
  value?: number | null;
  diceType?: "default" | "red" | "blue" | "black" | "pink";
}

// Your manually-tuned face rotations (kept untouched)
const FACE_ROTATIONS = [
  { x: 30, y: 0, z: 30 },
  { x: -60, y: -30, z: 0 },
  { x: -60, y: 45, z: 90 },
  { x: -60, y: 150, z: -90 },
  { x: 120, y: 30, z: 0 },
  { x: 210, y: 0, z: 45 },
];

type DiceState = "idle" | "rolling" | "settled";

export default function Dice({
  value = null,
  diceType = "default",
}: DiceProps) {
  const [state, setState] = useState<DiceState>("settled");
  const [displayValue, setDisplayValue] = useState(6);

  const prevValue = useRef<number | null>(null);
  const diceRef = useRef<HTMLDivElement | null>(null);

  // ----------------------------
  // Compute final transform
  // ----------------------------
  const finalTransform = useMemo(() => {
    const idx = Math.max(0, Math.min(5, displayValue - 1));
    const { x, y, z } = FACE_ROTATIONS[idx];
    return `rotateX(${x}deg) rotateY(${y}deg) rotateZ(${z}deg)`;
  }, [displayValue]);

  // ----------------------------
  // Handle value change → roll → settle
  // ----------------------------
  useEffect(() => {
    // Reset dice if null
    if (value == null) {
      setState("settled");
      setDisplayValue(6);
      prevValue.current = null;
      return;
    }

    // Avoid redundant rolls
    if (value === prevValue.current) return;

    // Start roll
    setState("rolling");

    const dice = diceRef.current;
    if (!dice) return;

    // Listen for animation end (clean solution)
    const handleEnd = () => {
      setDisplayValue(value);
      setState("settled");
      prevValue.current = value;

      dice.removeEventListener("animationend", handleEnd);
    };

    dice.addEventListener("animationend", handleEnd, { once: true });
  }, [value]);

  // ----------------------------
  // Build class names
  // ----------------------------
  const diceClass = `${styles.dice} ${
    state === "rolling" ? styles.rolling : ""
  } ${diceType !== "default" ? styles[diceType] : ""}`;

  return (
    <div className={styles.diceWrap}>
      <div
        ref={diceRef}
        className={diceClass}
        style={state === "settled" ? { transform: finalTransform } : {}}
      >
        <div className={`${styles.diceFace} ${styles.front}`}></div>
        <div className={`${styles.diceFace} ${styles.up}`}></div>
        <div className={`${styles.diceFace} ${styles.left}`}></div>
        <div className={`${styles.diceFace} ${styles.right}`}></div>
        <div className={`${styles.diceFace} ${styles.bottom}`}></div>
        <div className={`${styles.diceFace} ${styles.back}`}></div>
      </div>
    </div>
  );
}
