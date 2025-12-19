import { useLayoutEffect, useRef } from "react";
import gsap from '@/lib/gsap';
import { Flip } from '@/lib/gsap';

export function useAnimatedList<T>(
  items: T[],
  options?: {
    duration?: number;
    stagger?: number;
    ease?: string;
  }
) {
  const containerRef = useRef<HTMLUListElement | null>(null);
  const prevHeight = useRef<number | null>(null);

  useLayoutEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const children = Array.from(el.children);

    // 1️⃣ capture FLIP state BEFORE layout change
    const flipState = Flip.getState(children);

    const nextHeight = el.scrollHeight;

    // 2️⃣ container height animation
    if (prevHeight.current !== null && prevHeight.current !== nextHeight) {
      gsap.fromTo(
        el,
        { height: prevHeight.current },
        {
          height: nextHeight,
          duration: options?.duration ?? 0.2,
          ease: options?.ease ?? "power2.out",
          clearProps: "height",
        }
      );
    }

    prevHeight.current = nextHeight;

    // 3️⃣ FLIP reorder animation
    requestAnimationFrame(() => {
      Flip.from(flipState, {
        duration: options?.duration ?? 0.35,
        ease: options?.ease ?? "power2.out",
        stagger: options?.stagger ?? 0.03,
        absolute: false,
      });
    });

  return () => {
    // Optional: Cleanup previous FLIP state or animations if needed
    // In this usage, no explicit cleanup for gsap/Flip is needed,
    // but if you attach event listeners or run side effects, clean up here.
  };
  }, [items]);

  return containerRef;
}
