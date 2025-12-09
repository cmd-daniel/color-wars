// src/components/PixiCanvas.tsx
import { useEffect, useRef } from "react";
import { PixiEngine } from "../pixi/engine";

export function PixiCanvas() {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const engineRef = useRef<PixiEngine | null>(null);

  useEffect(() => {
    const node = containerRef.current;
    if (!node) return;

    const engine = new PixiEngine();
    engineRef.current = engine;

    engine.init(node);

    return () => {
      engineRef.current?.destroy();
      engineRef.current = null;
    };
  }, []);

  return (
    <div
      ref={containerRef}
      className="w-full h-full aspect-square"
      style={{ background: "#000" }}
    />
  );
}
