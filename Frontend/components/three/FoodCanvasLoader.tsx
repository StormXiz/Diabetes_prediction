"use client";

import dynamic from "next/dynamic";
import { Canvas3DGate } from "./Canvas3DGate";
import { SceneFallback } from "./SceneFallback";

// fallback=null aquí dejaba la sección de dietas completamente vacía en
// cualquier navegador sin WebGL (hardware acceleration apagado, GPU en
// sandbox, etc.) — nada visible, sin ninguna pista de que faltaba algo.
// SceneFallback (el mismo que ya usa el hero de home) garantiza que SIEMPRE
// se vea algo con la identidad de marca, con o sin WebGL.
const FoodCanvas = dynamic(() => import("./FoodCanvas"), { ssr: false, loading: () => <SceneFallback /> });

export function FoodCanvasLoader({ className }: { className?: string }) {
  return (
    <div className={className} aria-hidden>
      <Canvas3DGate fallback={<SceneFallback />}>
        <FoodCanvas />
      </Canvas3DGate>
    </div>
  );
}
