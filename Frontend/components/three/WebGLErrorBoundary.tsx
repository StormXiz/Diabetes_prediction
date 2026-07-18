"use client";

import { Component, type ReactNode } from "react";
import { SceneFallback } from "./SceneFallback";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
}

/**
 * Segunda red de seguridad: <Canvas3DGate> ya evita montar el Canvas si no
 * hay WebGL, pero el contexto se puede perder DESPUÉS de montado (GPU
 * reset, pestaña en segundo plano mucho tiempo). Si eso pasa, mostramos el
 * mismo fallback en vez de una página rota.
 */
export class WebGLErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  render() {
    if (this.state.hasError) return <SceneFallback />;
    return this.props.children;
  }
}
