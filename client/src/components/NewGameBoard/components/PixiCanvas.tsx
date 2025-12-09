import { useEffect, useRef } from "react";
import { initPixi, destroyPixi } from "@components/NewGameBoard/pixi/engine";

export function PixiCanvas() {
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const node = containerRef.current;
    console.log("🟡 PixiCanvas mounted, node:", node);

    if (!node) return;

    initPixi(node);

    return () => {
      console.log("🔵 PixiCanvas unmounting");
      destroyPixi();
    };
  }, []);

  return (
    <div
      ref={containerRef}
      className="w-full h-full aspect-square"
    />
  );
}
