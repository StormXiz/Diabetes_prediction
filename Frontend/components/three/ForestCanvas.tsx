"use client";

import { Suspense } from "react";
import { Canvas } from "@react-three/fiber";
import { useReducedMotion } from "motion/react";
import { WebGLErrorBoundary } from "./WebGLErrorBoundary";
import ForestScene from "./ForestScene";

/**
 * Fondo ambiental de bosque/palmeras para inicio, registro y login. Baja
 * opacidad + blur por CSS desde el contenedor que lo usa — este componente
 * solo dibuja la escena, no decide qué tan visible es.
 */
export default function ForestCanvas() {
  const shouldReduceMotion = useReducedMotion();

  return (
    <WebGLErrorBoundary>
      <Canvas camera={{ position: [0, 0, 8], fov: 55 }} dpr={[1, 1.5]} gl={{ antialias: true, alpha: true }}>
        <Suspense fallback={null}>
          <ForestScene reducedMotion={!!shouldReduceMotion} />
        </Suspense>
      </Canvas>
    </WebGLErrorBoundary>
  );
}
