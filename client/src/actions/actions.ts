import { animateUnitHop } from "@/animation/registry/token-anim";
import { BaseAction } from "./core";
import type { ActionRegistry } from "@color-wars/shared/src/types/registry";
import { ActionHandle } from "@/animation/driver/AnimationHandle";
import { pixiTargetLocator } from "@/animation/target-locator";
import { Sprite } from "pixi.js";

export class HexHop extends BaseAction<ActionRegistry["ANIMATE_HEX_HOP"]> {
  execute(): ActionHandle {
    // animate
    // update state
    // return

    const tile = pixiTargetLocator.get<Sprite>("unit-1");
    if (!tile) throw Error("tile is not valid");

    const newHopAction = animateUnitHop(tile, { x: tile.x, y: tile.y + 20 });
    const actionHandle = ActionHandle.attachCallBack(newHopAction, async () => {
      console.log("animation done");
    });
    return actionHandle;
  }
}
