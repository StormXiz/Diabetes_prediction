"use client";

import { Suspense } from "react";
import { Canvas } from "@react-three/fiber";
import { useReducedMotion } from "motion/react";
import { WebGLErrorBoundary } from "./WebGLErrorBoundary";
import HeroScene from "./HeroScene";

/**
 * Envoltorio del Canvas de Three.js para el hero de la landing. Se carga vía
 * next/dynamic con ssr:false (WebGL no existe en el servidor) — ver uso en
 * app/page.tsx. dpr topado a 2 para no reventar el rendimiento en pantallas
 * retina/4K con muchos píxeles.
 */
export default function HeroCanvas() {
  const shouldReduceMotion = useReducedMotion();

  return (
    <WebGLErrorBoundary>
      <Canvas
        camera={{ position: [0, 0, 6], fov: 50 }}
        dpr={[1, 2]}
        gl={{ antialias: true, alpha: true }}
      >
        <Suspense fallback={null}>
          <HeroScene reducedMotion={!!shouldReduceMotion} />
        </Suspense>
      </Canvas>
    </WebGLErrorBoundary>
  );
}
