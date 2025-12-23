import { useRef, useState } from "react";
import { gsap } from "gsap";

interface DiceHoldButtonProps {
  onHoldStart?: () => void;
  onHoldEnd?: () => void;
  hasRolled?: boolean;
}

// Durations
const SHAKE_DURATION = 1;
const ROLL_DURATION = 9;
const RESET_ANIM_TIME = 0.2;

export default function DiceHoldButton({ onHoldStart, onHoldEnd, hasRolled }: DiceHoldButtonProps) {
  const safeOnHoldStart = typeof onHoldStart === "function" ? onHoldStart : () => {};
  const safeOnHoldEnd = typeof onHoldEnd === "function" ? onHoldEnd : () => {};

  const [helperText, setHelperText] = useState("Hold to shake dice");
  const holdStartRef = useRef<number | null>(null);
  const darkLayerRef = useRef<HTMLDivElement | null>(null);
  const redLayerRef = useRef<HTMLDivElement | null>(null);
  const buttonRef = useRef<HTMLButtonElement | null>(null);

  const shakeTl = useRef<gsap.core.Tween | null>(null);
  const rollTl = useRef<gsap.core.Tween | null>(null);

  const cleanupTLs = () => {
    shakeTl.current?.kill();
    rollTl.current?.kill();
  };

  const resetLayers = () => {
    cleanupTLs();
    gsap.to([darkLayerRef.current, redLayerRef.current], {
      height: 0,
      duration: RESET_ANIM_TIME,
    });
    setHelperText("Hold to shake dice");
  };

  const handlePressStart = () => {
    holdStartRef.current = performance.now();
    safeOnHoldStart();
    setHelperText("Hold to shake dice");

    shakeTl.current = gsap.to(darkLayerRef.current, {
      height: "100%",
      duration: SHAKE_DURATION,
      ease: "linear",
      onComplete: () => {
        setHelperText("Release to roll dice");
        rollTl.current = gsap.to(redLayerRef.current, {
          height: "100%",
          duration: ROLL_DURATION,
          ease: "linear",
          onComplete: () => {
            safeOnHoldEnd();
            resetLayers();
            gsap.to(buttonRef.current, { scale: 1, duration: 0.2 });
          },
        });
      },
    });

    gsap.to(buttonRef.current, { scale: 1.1, duration: 0.2 });
  };

  const handlePressEnd = () => {
    cleanupTLs();
    safeOnHoldEnd();
    resetLayers();
    gsap.to(buttonRef.current, { scale: 1, duration: 0.2 });
  };

  if (hasRolled) return null;

  return (
    <div className="relative h-full flex items-center justify-center select-none">
      <div className="mb-2 text-center top-0 absolute text-gray-300 font-medium">{helperText}</div>

      <div className="relative h-[75%] aspect-square self-end">
        <button
          ref={buttonRef}
          className="relative w-full h-full rounded-full bg-blue-500 shadow-md cursor-pointer select-none overflow-hidden"
          onPointerDown={(e) => {
            e.preventDefault();
            handlePressStart();
          }}
          onPointerUp={(e) => {
            e.preventDefault();
            handlePressEnd();
          }}
          onPointerLeave={(e) => {
            e.preventDefault();
            handlePressEnd();
          }}
          onPointerCancel={(e) => {
            e.preventDefault();
            handlePressEnd();
          }}
        >
          <div
            ref={darkLayerRef}
            style={{ height: 0 }}
            className="absolute bottom-0 left-0 w-full bg-black/50 z-10"
          />
          <div
            ref={redLayerRef}
            style={{ height: 0 }}
            className="absolute bottom-0 left-0 w-full bg-red-500/50 z-20"
          />
        </button>
      </div>
    </div>
  );
}
