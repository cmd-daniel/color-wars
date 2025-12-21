// Counter.tsx
import { useEffect, useRef } from "react";
import gsap from "gsap";
import { useStore } from "@/stores/sessionStore";
import { animateCounter, createFloatingDiff } from "@/animation/registry/anim";

export default function Counter({ playerId }: { playerId: string }) {
  const score = useStore((s) => s.state.game.players[playerId]?.money || 0);

  const elRef = useRef<HTMLSpanElement>(null);
  const diffContainerRef = useRef<HTMLDivElement>(null);
  const animatedValue = useRef({ val: 0 });
  const lastValue = useRef(0);

  useEffect(() => {
    if (!elRef.current || !diffContainerRef.current) return;

    const diff = score - lastValue.current;
    lastValue.current = score;

    const tl = gsap.timeline();

    // counter animation
    tl.add(animateCounter(elRef.current, animatedValue.current, score), 0);

    // diff animation
    if (diff !== 0) {
      tl.add(createFloatingDiff(diffContainerRef.current, diff), 0);
    }
  }, [score]);

  return (
    <span ref={diffContainerRef} id={`player-money-${playerId}`} className="relative inline-block">
      <span ref={elRef}>0</span>
      <div
        className="absolute left-1/2 -top-1 transform -translate-x-1/2 pointer-events-none"
      />
    </span>
  );
}
