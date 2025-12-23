import { useEffect, useRef } from "react";
import { PixiEngine } from "@/components/NewGameBoard/pixi/engine";
import { useMapStore } from "@/stores/mapStateStore";
//import DebugGameControls from "./animationDebug";
import { pixiTargetLocator } from "@/animation/target-locator";

// Example URL - in a real app this might come from props or a route param
const MAP_URL = "/india_5.json";

export function PixiCanvas() {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const engineRef = useRef<PixiEngine | null>(null);

  // Zustand Hooks
  const { fetchMap, isLoading } = useMapStore();

  // 1. Init Engine
  useEffect(() => {
    const node = containerRef.current;
    if (!node) return;

    const engine = new PixiEngine();
    engineRef.current = engine;

    engine.init(node).then(() => {
      fetchMap(MAP_URL).then((map)=>{
        engine.loadMap(map!)
        pixiTargetLocator.register("pixi-engine", engineRef.current!);
      })
    });

    return () => {
      console.log('destroying pixi engine')
      engine.destroy();
      engineRef.current = null;
      pixiTargetLocator.unregister("pixi-engine");
    };
  }, []);


  return (
    <div className="relative h-full w-full p-4">
      {isLoading && <div className="absolute inset-0 z-10 flex items-center justify-center bg-black/50 text-white">Loading Map...</div>}
      <div ref={containerRef} className="aspect-square h-full w-full bg-[#111111]" />
      {/* <DebugGameControls /> */}
    </div>
  );
}
