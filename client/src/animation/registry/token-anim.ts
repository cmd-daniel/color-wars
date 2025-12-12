import * as PIXI from "pixi.js";
import gsap from "@gsap";

/**
 * Animation Recipe: token hop
 */
export function animateUnitHop(target: PIXI.Container, endPos: { x: number; y: number }[]) {
  const tl = gsap.timeline();

  for(const p of endPos){

    tl.to(target, {
      duration: 0.4,
      pixi: {
        x: p.x,
        y: p.y,
      },
      // keyframes: {
      //   "50%": { pixi: { scale: 1.2 } },  // scale up at midpoint
      //   "100%": { pixi: { scale: 1 } }    // end at scale 1
      // },
      ease: "power1.inOut"
    });
  }
  return tl
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
