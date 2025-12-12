import { animateUnitHop } from "@/animation/registry/token-anim";
import { BaseAction } from "./core";
import type { ActionRegistry } from "@color-wars/shared/src/types/registry";
import { ActionHandle } from "@/animation/driver/AnimationHandle";
import { pixiTargetLocator } from "@/animation/target-locator";
import { Sprite } from "pixi.js";
import { TRACK_SPEC } from "@/utils/diceTrackConfig";
export class HexHop extends BaseAction<ActionRegistry["ANIMATE_HEX_HOP"]> {
  execute(): ActionHandle {
    // animate
    // update state
    // return

    const unit = pixiTargetLocator.get<Sprite>("unit-1");
    if (!unit) throw Error("unit is not valid");

    const {fromTile, toTile} = this.payload

    const xy = []
    for(let i=fromTile; i<=toTile; i++ ){
        const tile = pixiTargetLocator.get<Sprite>(`track-tile-${TRACK_SPEC[i][0]}-${TRACK_SPEC[i][1]}`)!
        xy.push({x:tile?.x, y:tile.y})
    }
    const newHopAction = animateUnitHop(unit,  xy);
    const actionHandle = ActionHandle.attachCallBack(newHopAction, async () => {
      console.log("animation done");
    });
    return actionHandle;
  }
}
