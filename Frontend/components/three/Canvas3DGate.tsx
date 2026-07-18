"use client";

import type { ReactNode } from "react";
import { useWebGLSupport } from "@/hooks/useWebGLSupport";

/**
 * Puerta genérica para cualquier escena 3D del sitio: solo monta `children`
 * (el Canvas real) si el navegador de verdad soporta WebGL. Mientras se
 * revisa (primer render) o si no hay soporte, muestra `fallback` — nunca se
 * intenta crear un WebGLRenderer que sabemos que va a fallar.
 */
export function Canvas3DGate({ children, fallback }: { children: ReactNode; fallback: ReactNode }) {
  const supported = useWebGLSupport();
  return supported ? <>{children}</> : <>{fallback}</>;
}
