"use client";

import dynamic from "next/dynamic";
import { Canvas3DGate } from "./Canvas3DGate";
import { SceneFallback } from "./SceneFallback";

// ssr:false es obligatorio (WebGL no existe en el servidor) y solo se puede
// llamar desde un Client Component — por eso este wrapper existe, para que
// app/page.tsx (Server Component) pueda seguir siendo server sin errores.
const HeroCanvas = dynamic(() => import("./HeroCanvas"), { ssr: false, loading: () => <SceneFallback /> });

export function HeroCanvasLoader() {
  return (
    <Canvas3DGate fallback={<SceneFallback />}>
      <HeroCanvas />
    </Canvas3DGate>
  );
}
