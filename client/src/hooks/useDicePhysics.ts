import { useRef, useState } from "react";
import { Quaternion, Vector3 } from "@/lib/diceMath";
import { DiceRotationCalculator } from "../lib/rotationCalculator";

export type DiceMode =
  | "idle"
  | "accelerate"
  | "ragdoll"
  | "auto-spin"
  | "spin-to-target"
  | "ragdoll";

const VELOCITY_CUTOFF_THRESHOLD = 0.0003;
const MAX_SPEED = 0.0435
const ACCELERATION = MAX_SPEED * 0.001;
const ANIMATION_SPEED = 200
//const CONTINUOUS_SPEED = 14500
const DECELERATION_RATE = 0.002

export const useDicePhysics = () => {
  const [quat, setQuat] = useState(new Quaternion());
  const [rolledNumber, setRolledNumber] = useState<number | null>(null);

  const calculatorRef = useRef(new DiceRotationCalculator());
  const animationRef = useRef<number | null>(null);

  // INTERNAL STATE MACHINE
  const rollIdRef = useRef("");
  const isApiPending = useRef(false);

  const stateRef = useRef<{
    mode: DiceMode;
    targetFace: number | null;
  }>({
    mode: "idle",
    targetFace: null,
  });

  // ---------------------------------------------------
  // HIGH-LEVEL MODE SETTER (APP CONTROLS DICE)
  // ---------------------------------------------------
  const setMode = (mode: DiceMode, payload?: any) => {
    stateRef.current.mode = mode;

    if (mode === "auto-spin") {
      isApiPending.current = true;
      return;
    }

    if (mode === "spin-to-target") {
      stateRef.current.targetFace = payload.face;
      setRolledNumber(payload.face);
      isApiPending.current = false;
      return;
    }

    if (mode === "ragdoll") {
      isApiPending.current = false;
      return;
    }
  };

  // ---------------------------------------------------
  // START LOOP (App provides rollId)
  // ---------------------------------------------------
  const startPhysicsLoop = (rollId: string) => {
    rollIdRef.current = rollId;

    if (animationRef.current) cancelAnimationFrame(animationRef.current);

    let rotationAxis = new Vector3(
      Math.random() - 0.5,
      Math.random() - 0.5,
      Math.random() - 0.5
    ).normalize();

    let SPEED = 0;
    

    let last = Date.now();

    const loop = () => {
      if (rollIdRef.current !== rollId) return; // stale

      const now = Date.now();
      const dt = now - last;
      last = now;

      const mode = stateRef.current.mode;

      // accelerate → accelerate
      if (mode === "accelerate") {
        SPEED = Math.min(SPEED + ACCELERATION * dt, MAX_SPEED);
      }

      // EARLY RELEASE → normal decel
      if (mode === "ragdoll") {

        const friction = SPEED * DECELERATION_RATE;
        SPEED = Math.max(SPEED - friction * dt, 0);

        if (SPEED < VELOCITY_CUTOFF_THRESHOLD) {
          animationRef.current = null;
          return;
        }
      }

      // WAITING API → spin at max speed
      if (mode === "auto-spin") {
        SPEED = MAX_SPEED;
      }

      // API SUCCESS → steer to final face
      if (mode === "spin-to-target") {
        const face = stateRef.current.targetFace!;
        console.log('spin to target', face)
        animationRef.current = null;
        startSteering(face, SPEED, rotationAxis.clone());
        return;
      }

      // APPLY ROTATION
      const angle = SPEED * dt;
      const inc = new Quaternion().setFromAxisAngle(rotationAxis, angle);

      setQuat((q) => inc.multiply(q));

      animationRef.current = requestAnimationFrame(loop);
    };

    loop();
  };

  const startSteering = (
    targetFace: number,
    initialSpeed: number,
    initialAxis: Vector3
  ) => {
    const startTime = Date.now();
    let lastTime = startTime;
    let SPEED = initialSpeed;

    const startQuat = quat.clone();
    const targetQuat = calculatorRef.current.calculateRotationToFace(
      startQuat,
      targetFace
    );

    let rotationAxis = initialAxis.clone();

    const decelTime =
      Math.log(VELOCITY_CUTOFF_THRESHOLD / SPEED) / -DECELERATION_RATE;
    
      console.log(decelTime)

    const step = () => {
      const now = Date.now();
      const dt = now - lastTime;
      const elapsed = now - startTime;
      lastTime = now;

      const progress = Math.min(elapsed / decelTime, 1);
      console.log("progress", progress)
      console.log("elapsed", elapsed)
      const friction = SPEED * DECELERATION_RATE;
      SPEED = Math.max(SPEED - friction * dt, 0);

      const steeringStrength = Math.pow(progress, 2) * 0.12;

      if (SPEED < VELOCITY_CUTOFF_THRESHOLD) {
        animationRef.current = null;
        return;
      }

      const angle = SPEED * dt;
      const spin = new Quaternion().setFromAxisAngle(rotationAxis, angle);

      setQuat((q) => {
        const newQ = spin.multiply(q);
        return newQ.clone().slerp(targetQuat, steeringStrength);
      });

      animationRef.current = requestAnimationFrame(step);
    };

    step();
  };

  // CONTROL PANEL COMMANDS
  const rotateToFace = (face: number) => {
    const start = quat.clone();
    const end = calculatorRef.current.calculateRotationToFace(start, face);
    const startTime = Date.now();

    const duration = ANIMATION_SPEED;

    const animLoop = () => {
      const t = Math.min((Date.now() - startTime) / duration, 1);
      const q = start.clone().slerp(end, t);
      setQuat(q);

      if (t < 1) animationRef.current = requestAnimationFrame(animLoop);
    };

    animLoop();
  };

  const randomRotate = () => {
    const start = quat.clone();
    const end = calculatorRef.current.generateRandomQuaternion();
    const startTime = Date.now();
    const duration = ANIMATION_SPEED * 1.5;

    const animLoop = () => {
      const t = Math.min((Date.now() - startTime) / duration, 1);
      const q = start.clone().slerp(end, t);
      setQuat(q);

      if (t < 1) animationRef.current = requestAnimationFrame(animLoop);
    };

    animLoop();
  };

  return {
    quat,
    rolledNumber,
    startPhysicsLoop,
    setMode,

    rotateToFace,
    randomRotate,

    isApiPending,
  };
};
