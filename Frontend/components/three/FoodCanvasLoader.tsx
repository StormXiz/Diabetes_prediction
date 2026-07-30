"use client";

import dynamic from "next/dynamic";
import { Canvas3DGate } from "./Canvas3DGate";

const FoodCanvas = dynamic(() => import("./FoodCanvas"), { ssr: false, loading: () => null });

export function FoodCanvasLoader({ className }: { className?: string }) {
  return (
    <div className={className} aria-hidden>
      <Canvas3DGate fallback={null}>
        <FoodCanvas />
      </Canvas3DGate>
    </div>
  );
}
