import * as PIXI from "pixi.js";
import { gsap } from "gsap";

/**
 * Animation Recipe: token hop
 */
export function animateUnitHop(target: PIXI.Container, endPos: { x: number; y: number }) {
  const tl = gsap.timeline();

  tl.to(target, {
    x: endPos.x,
    y: endPos.y,
    duration: 0.5,
    ease: "power1.inOut",
    onUpdate: () => {
      console.log("updating x", target.x);
    },
  });

  tl.to(target.scale, {
    x: 1.2,
    y: 1.2,
    duration: 0.25,
    yoyo: true,
    repeat: 1,
    ease: "sine.out",
  });
  return tl;
}

export function ToXY(target: PIXI.Sprite, endPos: { x: number; y: number }) {
  return gsap.to(target, {
    x: endPos.x,
    y: endPos.y,
    duration: 0.5,
    onUpdate: () => {
      console.log("updating,", target.x);
    },
  });
}
