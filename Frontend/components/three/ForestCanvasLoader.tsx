"use client";

import dynamic from "next/dynamic";
import { Canvas3DGate } from "./Canvas3DGate";

const ForestCanvas = dynamic(() => import("./ForestCanvas"), { ssr: false, loading: () => null });

// Sin fallback visual si no hay WebGL: el fondo es decorativo, así que si no
// carga simplemente no se ve el bosque (la página sigue funcionando normal
// con su fondo de color plano) — no vale la pena un placeholder para algo
// puramente ambiental.
export function ForestCanvasLoader({ className }: { className?: string }) {
  return (
    <div className={className} aria-hidden>
      <Canvas3DGate fallback={null}>
        <ForestCanvas />
      </Canvas3DGate>
    </div>
  );
}
