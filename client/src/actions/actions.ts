import { animateCoinConfettiToDom, animateCoinConfetti, animateUnitHop } from "@/animation/registry/anim";
import { BaseAction } from "./core";
import { TURN_ACTION_REGISTRY } from "@color-wars/shared/src/types/turnActionRegistry";
import { ActionHandle } from "@/animation/driver/AnimationHandle";
import { pixiTargetLocator } from "@/animation/target-locator";
import { PlayerSprite } from "@/components/NewGameBoard/pixi/units/playerSprite";
import { Sprite } from "pixi.js";
import { TRACK_COORDINATES } from "@/components/NewGameBoard/config/dice-track-config";
import { useDiceTrackStore } from "@/stores/diceTrackStore";
import { useStore } from "@/stores/sessionStore";
import { PixiEngine } from "@/components/NewGameBoard/pixi/engine";
import { useCardStore } from "@/stores/cardSelectionStore";

export class HexHop extends BaseAction<typeof TURN_ACTION_REGISTRY["MOVE_PLAYER"]> {
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

export class RollDice extends BaseAction<typeof TURN_ACTION_REGISTRY["ROLL_DICE"]> {
  execute(): ActionHandle {
    const { die1, die2 } = this.payload;
    useStore.getState().rollDiceTo(die1, die2);
    return new ActionHandle(
      new Promise<void>((resolve) => setTimeout(resolve, 2500)),
      () => { },
      () => { },
    );
  }
}

export class IncrMoney extends BaseAction<typeof TURN_ACTION_REGISTRY["INCR_MONEY"]> {
  execute(): ActionHandle {
    const { playerId, amount } = this.payload;

    const unit = pixiTargetLocator.get<PlayerSprite>(playerId);
    if (!unit) throw new Error("PlayerSprite unit not found for IncrMoney animation");
    const tileID = unit.currentTileId
    if(!tileID) throw new Error("PlayerSprite has no currentTileId for IncrMoney animation");
    const tile = pixiTargetLocator.get<Sprite>(tileID);
    const engine = pixiTargetLocator.get("pixi-engine") as PixiEngine;
    if (!engine) throw new Error("PixiEngine not found in target locator");

    const app = engine.getApp()!;
    if (!app) throw new Error("Pixi Application not found in engine");
    
    const ele = document.getElementById(`player-money-${playerId}`)
    if(!ele) throw new Error("Target DOM element for money transfer not found");

    const anim = animateCoinConfettiToDom(tile!, ele, app, 50);

    return ActionHandle.attachCallBack(anim, async () => {
      useStore.getState().updatePlayerMoney(playerId, useStore.getState().state.game.players[playerId].money + amount);
      console.log("IncrMoney animation complete");
    });
  }
}

export class DecrMoney extends BaseAction<typeof TURN_ACTION_REGISTRY["DECR_MONEY"]> {
  execute(): ActionHandle {
    const { playerId, amount } = this.payload;

    const unit = pixiTargetLocator.get<PlayerSprite>(playerId);
    if (!unit) throw new Error("PlayerSprite unit not found for DecrMoney animation");
    const tileID = unit.currentTileId
    if(!tileID) throw new Error("PlayerSprite has no currentTileId for DecrMoney animation");
    const tile = pixiTargetLocator.get<Sprite>(tileID);
    const engine = pixiTargetLocator.get("pixi-engine") as PixiEngine;
    if (!engine) throw new Error("PixiEngine not found in target locator");

    const app = engine.getApp()!;
    if (!app) throw new Error("Pixi Application not found in engine");

    const anim = animateCoinConfetti(tile!, app, 50);

    return ActionHandle.attachCallBack(anim, async () => {
      useStore.getState().updatePlayerMoney(playerId, useStore.getState().state.game.players[playerId].money - amount);
      console.log("IncrMoney animation complete");
    });
  }
}

// --- Action 1: Draw Cards ---
export class DrawCardsAction extends BaseAction<{ cardIds: string[] }> {
  execute(): ActionHandle {
    // Wrap the store interaction and waiting logic in a Promise
    const drawAnimationTask = new Promise<void>((resolve) => {
      // 1. Trigger the UI to mount and start animating
      useCardStore.getState().setupDraw(this.payload.cardIds);

      // 2. Wait for the entrance animation to complete (phase becomes 'interacting')
      const unsubscribe = useCardStore.subscribe(
        (state) => state.phase,
        (phase) => {
          if (phase === 'interacting') {
            unsubscribe();
            resolve();
          }
        }
      );
    });

    // Return the ActionHandle with empty cancel/fast-forward callbacks for now
    return new ActionHandle(drawAnimationTask, () => {}, () => {});
  }
}

// --- Action 2: Resolve Selection ---
export class ResolveSelectionAction extends BaseAction<{ selectedCardId: string }> {
  execute(): ActionHandle {
    const { selectedCardId } = this.payload;

    const resolveAnimationTask = new Promise<void>((resolve) => {
      // 1. Trigger the UI to start the exit/resolution animation
      useCardStore.getState().resolveSelection(selectedCardId);

      // 2. Wait for the exit animation to complete and cleanup (phase becomes 'idle')
      const unsubscribe = useCardStore.subscribe(
        (state) => state.phase,
        (phase) => {
          if (phase === 'idle') {
            unsubscribe();
            console.log("Card exit animation complete");
            resolve();
          }
        }
      );
    });

    return new ActionHandle(resolveAnimationTask, () => {}, () => {});
  }
}