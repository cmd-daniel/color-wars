import * as PIXI from "pixi.js";
import gsap from "@gsap";
import { PlayerSprite } from "@/components/NewGameBoard/pixi/units/playerSprite";

/**
 * Animation Recipe: token hop
 */
export function animateUnitHop(unit: PlayerSprite, pathTiles: PIXI.Sprite[]) {
  const tl = gsap.timeline();

  // We start from the unit's current position (or the first tile in the path if we want to be strict)
  // But usually, the path[0] is the tile the unit is currently on.
  
  for (let i = 0; i < pathTiles.length - 1; i++) {
    const startTile = pathTiles[i];
    const endTile = pathTiles[i + 1];

    // Helper object to tween 'progress' from 0 to 1
    const tweenObj = { t: 0 };

    tl.to(tweenObj, {
      duration: 0.4,
      t: 1,
      ease: "power1.inOut",
      onStart: () => {
        // Optional: Update logical ID at start of hop, or end?
        // Usually safer to update at end, or update strictly purely visual here.
      },
      onUpdate: () => {
        // LINEAR INTERPOLATION (Lerp)
        // Calculate position based on where the tiles are RIGHT NOW.
        // If tiles move due to resize, this formula accounts for it instantly.
        unit.x = startTile.x + (endTile.x - startTile.x) * tweenObj.t;
        unit.y = startTile.y + (endTile.y - startTile.y) * tweenObj.t;
      },
      onComplete: () => {
        // Snap explicitly to ensure precision at end of step
        unit.position.copyFrom(endTile.position);
        console.log('setting currentTileId: ', endTile.label)
        unit.currentTileId = endTile.label; // Update logical position step-by-step
      }
    });
  }

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
