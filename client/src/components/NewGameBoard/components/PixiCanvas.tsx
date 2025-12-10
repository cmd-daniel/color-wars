import { useEffect, useRef } from "react";
import { PixiEngine } from "@/components/NewGameBoard/pixi/engine";
import { useGameStore } from "@/stores/mapStateStore";

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

  return (
    <div className="relative w-full h-full">
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/50 text-white z-10">
          Loading Map...
        </div>
      )}
      <div
        ref={containerRef}
        className="w-full h-full aspect-square bg-[#111111]"
      />
    </div>
  );
}