import { animateUnitHop } from "@/animation/registry/token-anim";
import { BaseAction } from "./core";
import type { ActionRegistry } from "@color-wars/shared/src/types/registry";
import { ActionHandle } from "@/animation/driver/AnimationHandle";
import { pixiTargetLocator } from "@/animation/target-locator";
import { PlayerSprite } from "@/components/NewGameBoard/pixi/units/playerSprite";
import { Sprite } from "pixi.js";
import { TRACK_COORDINATES } from "@/components/NewGameBoard/config/dice-track-config";
import { useDiceTrackStore } from "@/stores/diceTrackStore";
import { useStore } from "@/stores/sessionStore";

export class HexHop extends BaseAction<ActionRegistry["MOVE_PLAYER"]> {
  execute(): ActionHandle {
    const { fromTile, toTile, tokenId } = this.payload;
    const unit = pixiTargetLocator.get<PlayerSprite>(tokenId);
    if (!unit) throw Error("unit is not valid");

    const pathSprites: Sprite[] = [];
    const totalTiles = TRACK_COORDINATES.length;

    // 1. Calculate the number of clockwise steps needed
    // If to >= from: Simple difference (e.g., 5 to 10 = 5 steps)
    // If to < from: Wrap around difference (e.g., 30 to 2 with size 34 = 4 + 2 = 6 steps)
    const stepCount = toTile >= fromTile ? toTile - fromTile : totalTiles - fromTile + toTile;

    // 2. Build the path using modulo (%) to handle the array wrap

    for (let i = 0; i <= stepCount; i++) {
      // This ensures that when we hit index 34, it wraps back to 0
      const currentIndex = (fromTile + i) % totalTiles;

      const id = `track-tile-${currentIndex}`;
      const tile = pixiTargetLocator.get<Sprite>(id);

      if (tile) {
        pathSprites.push(tile);
      } else {
        console.warn(`Tile sprite missing for index ${currentIndex} (ID: ${id})`);
      }
    }

    unit.isAnimating = true;
    useDiceTrackStore.getState().setActiveToken(null);
    const newHopAction = animateUnitHop(unit, pathSprites);

    const actionHandle = ActionHandle.attachCallBack(newHopAction, async () => {
      const finalTileId = pathSprites.at(pathSprites.length - 1)!.label;
      unit.currentTileId = finalTileId;
      unit.isAnimating = false;
      useDiceTrackStore.getState().upsertToken({ id: unit.id, tileId: finalTileId });
      useDiceTrackStore.getState().setActiveToken(unit.id);
    });
    return actionHandle;
  }
}

export class RollDice extends BaseAction<ActionRegistry["ROLL_DICE"]> {
  execute(): ActionHandle {
    const { die1, die2 } = this.payload;
    useStore.getState().rollDiceTo(die1, die2);
    return new ActionHandle(
      new Promise<void>((resolve) => setTimeout(resolve, 2500)),
      () => {},
      () => {},
    );
  }
}
