"use client";

import { Suspense } from "react";
import { Canvas } from "@react-three/fiber";
import { useReducedMotion } from "motion/react";
import { WebGLErrorBoundary } from "./WebGLErrorBoundary";
import FoodScene from "./FoodScene";

export default function FoodCanvas() {
  const shouldReduceMotion = useReducedMotion();
  return (
    <WebGLErrorBoundary>
      <Canvas camera={{ position: [0, 0, 6], fov: 50 }} dpr={[1, 2]} gl={{ antialias: true, alpha: true }}>
        <Suspense fallback={null}>
          <FoodScene reducedMotion={!!shouldReduceMotion} />
        </Suspense>
      </Canvas>
    </WebGLErrorBoundary>
  );
}
