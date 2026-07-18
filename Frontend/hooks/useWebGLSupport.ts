"use client";

import { useEffect, useState } from "react";

function detectWebGL(): boolean {
  try {
    const canvas = document.createElement("canvas");
    return !!(
      window.WebGLRenderingContext &&
      (canvas.getContext("webgl") || canvas.getContext("experimental-webgl"))
    );
  } catch {
    return false;
  }
}

/**
 * Chequeo previo antes de montar cualquier <Canvas> de Three.js. Sin esto,
 * en navegadores/entornos con WebGL deshabilitado a nivel de sistema
 * (GPU sandboxeada, hardware acceleration off) el propio THREE.WebGLRenderer
 * dispara un console.error que Next.js muestra como error de página en dev,
 * incluso si un error boundary ya lo atrapa. Mejor nunca intentar crear el
 * contexto si sabemos que va a fallar.
 */
export function useWebGLSupport(): boolean | null {
  const [supported, setSupported] = useState<boolean | null>(null);

  useEffect(() => {
    setSupported(detectWebGL());
  }, []);

  return supported;
}
