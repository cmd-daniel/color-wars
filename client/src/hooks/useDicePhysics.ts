import { useRef, useState } from "react";
import { Quaternion, Vector3 } from "@/lib/diceMath";
import { DiceRotationCalculator } from "../lib/rotationCalculator";
import { getRandomVertexAxis } from "@/lib/diceMath";
export type DiceMode =
  | "idle"
  | "accelerate"
  | "ragdoll"
  | "auto-spin"
  | "spin-to-target"
  | "ragdoll";

const VELOCITY_CUTOFF_THRESHOLD = 0.0003;
const MAX_SPEED = 0.0435;
const ACCELERATION = MAX_SPEED * 0.002;
const ANIMATION_SPEED = 200;
//const CONTINUOUS_SPEED = 14500
const DECELERATION_RATE = 0.002;

export const useDicePhysics = () => {
  const [quat, setQuat] = useState(new Quaternion());
  const [rolledNumber] = useState<number | null>(null);

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
  const setMode = (mode: DiceMode, payload?: { face: number }) => {
    stateRef.current.mode = mode;

    if (mode === "auto-spin") {
      isApiPending.current = true;
      return;
    } else if (mode === "spin-to-target") {
      stateRef.current.targetFace = payload!.face;
      isApiPending.current = false;
      return;
    } else if (mode === "ragdoll") {
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

    //const rotationAxis = new Vector3(Math.random() - 0.5, Math.random() - 0.5, Math.random() - 0.5).normalize();
    const rotationAxis = getRandomVertexAxis();

    let SPEED = 0;
    const first = Date.now()
    let last = first;
    let shouldContinue = true;

    // LOCAL SOURCE OF TRUTH (NOT REACT)
    let currentQuat = quat.clone();

    const loop = () => {
      if (rollIdRef.current !== rollId) return;
      if (!shouldContinue) return;

      const now = Date.now();
      const dt = now - last;
      last = now;
      
      const mode = stateRef.current.mode;
      
      console.log(mode)
      // ACCELERATE
      if (mode === "accelerate") {
        // If spinning for over 10s, transition to 'ragdoll' mode
        if (now - first > 10000) {
          console.warn('no input for dice, resetting it')
          setMode("ragdoll");
        }
        SPEED = Math.min(SPEED + ACCELERATION * dt, MAX_SPEED);
      }

      // NATURAL DECEL
      else if (mode === "ragdoll") {
        const friction = SPEED * DECELERATION_RATE;
        SPEED = Math.max(SPEED - friction * dt, 0);

        if (SPEED < VELOCITY_CUTOFF_THRESHOLD) {
          animationRef.current = null;
          return;
        }
      }

      // FORCE MAX SPEED
      else if (mode === "auto-spin") {
        SPEED = MAX_SPEED;
      }
      
      // HANDOFF TO STEERING
      else if (mode === "spin-to-target") {
        if(SPEED == 0) SPEED = MAX_SPEED;
        const face = stateRef.current.targetFace!;
        shouldContinue = false;
        animationRef.current = null;

        startSteering(face, SPEED, rotationAxis, currentQuat);
        return;
      }

      // INTEGRATE SPIN
      const angle = SPEED * dt;
      const inc = new Quaternion().setFromAxisAngle(rotationAxis, angle);
      currentQuat = inc.multiply(currentQuat);

      setQuat(currentQuat.clone());
      animationRef.current = requestAnimationFrame(loop);
    };

    loop();
  };

  const startSteering = (
    targetFace: number,
    initialSpeed: number,
    vertexAxis: Vector3,
    _startQuat: Quaternion,
  ) => {
    console.log("targetFace", targetFace);

    const axis = vertexAxis.normalize();
    let omega = initialSpeed;

    const targetQuat = calculatorRef.current
      .calculateRotationToFace(_startQuat, targetFace)
      .normalize();

    // --------------------------------------------------
    // 1. Exact analytic solution (FPS independent)
    // --------------------------------------------------
    const k = DECELERATION_RATE;
    const w0 = initialSpeed;
    const wCut = VELOCITY_CUTOFF_THRESHOLD;

    let tStop = 0;
    let thetaExact = 0;

    if (w0 > wCut) {
      tStop = Math.log(w0 / wCut) / k;
      thetaExact = (w0 / k) * (1 - Math.exp(-k * tStop));
    }

    // --------------------------------------------------
    // 2. Correct starting pose (no bias, exact)
    //    Q_start = R(-θ_exact) · Q_target
    // --------------------------------------------------
    const reverseRot = new Quaternion().setFromAxisAngle(axis, -thetaExact);

    let currentQuat = reverseRot.multiply(targetQuat).normalize();

    setQuat(currentQuat.clone());

    // --------------------------------------------------
    // 3. Normal forward ragdoll (unchanged runtime)
    // --------------------------------------------------
    let lastTime = Date.now();

    const inc = new Quaternion();
    const negK = -k;

    const step = () => {
      const now = Date.now();
      const dt = now - lastTime;
      lastTime = now;

      const omegaPrev = omega;

      // ✅ exact exponential decay (FPS independent)
      omega *= Math.exp(negK * dt);

      // ✅ exact integrated angle for this frame
      const stepAngle = (omegaPrev / k) * (1 - Math.exp(negK * dt));

      inc.setFromAxisAngle(axis, stepAngle);

      currentQuat = inc.multiply(currentQuat).normalize();
      setQuat(currentQuat.clone());

      if (omega < wCut) {
        setQuat(targetQuat.clone());
        animationRef.current = null;
        return;
      }

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
    animationRef,
    rotateToFace,
    randomRotate,

    isApiPending,
  };
};
