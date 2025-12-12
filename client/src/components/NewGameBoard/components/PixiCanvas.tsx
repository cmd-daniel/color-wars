import { useEffect, useRef } from "react";
import { PixiEngine } from "@/components/NewGameBoard/pixi/engine";
import { Sprite } from "pixi.js";
import { useGameStore } from "@/stores/mapStateStore";
import { pixiTargetLocator } from "@/animation/target-locator";
import { HexHop } from "@/actions/actions";
import { network } from "@/lib/managers/network";
import { GameEventBus } from "@/lib/managers/GameEventBus";

// Example URL - in a real app this might come from props or a route param
const MAP_URL = "/sample-subcontinent.json";

export function PixiCanvas() {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const engineRef = useRef<PixiEngine | null>(null);

  // Zustand Hooks
  const { currentMap, fetchMap, isLoading } = useGameStore();

  // 1. Init Engine
  useEffect(() => {
    const node = containerRef.current;
    if (!node) return;

    const engine = new PixiEngine();
    engineRef.current = engine;

    engine.init(node).then(() => {
      console.log("Pixi Engine Initialized");
      // If map is already in store (e.g. from hot reload), load it immediately
      if (useGameStore.getState().currentMap) {
        engine.loadMap(useGameStore.getState().currentMap!);
      }
    });

    return () => {
      console.log("Pixi Engine Destroyed");
      engine.destroy();
      engineRef.current = null;
    };
  }, []);

  // 2. Fetch Map on Mount
  useEffect(() => {
    fetchMap(MAP_URL);
  }, []);

  // 3. React to Map Changes -> Update Engine
  useEffect(() => {
    if (currentMap && engineRef.current) {
      engineRef.current.loadMap(currentMap);
    }
  }, [currentMap]);

  function testAnimation() {
    // 1. Find the target (The Hex at 0,0 on the dice track)
    const targetSprite = pixiTargetLocator.get<Sprite>("unit-1");
    GameEventBus.emit("UPDATE_ANIMATION_SPEED", {
      speedMultiplier: 2,
    });
    if (targetSprite) {
      network.actionQueue.enqueue(new HexHop({ fromTile:1, toTile: 17 }));
    } else {
      console.error("Sprite not found in registry");
    }
  }

  const addPlayer = () => {
    const tile = pixiTargetLocator.get<Sprite>("track-tile-0-0");
    engineRef.current?.getTokenLayer()?.addToken(`unit-1`, 0x4450d4, tile!.x, tile!.y);
  };

  return (
    <div className="relative h-full w-full">
      {isLoading && (
        <div className="absolute inset-0 z-10 flex items-center justify-center bg-black/50 text-white">
          Loading Map...
        </div>
      )}
      <button className="h-8 w-fit rounded-md bg-amber-50 px-2 text-black" onClick={testAnimation}>
        test animation
      </button>
      <button className="h-8 w-fit rounded-md bg-amber-50 px-2 text-black" onClick={addPlayer}>
        add player
      </button>
      <div ref={containerRef} className="aspect-square h-full w-full bg-[#111111]" />
    </div>
  );
}
