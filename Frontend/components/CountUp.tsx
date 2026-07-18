"use client";

import { useEffect, useState } from "react";
import { animate, useReducedMotion } from "motion/react";

/**
 * Contador que se anima al aparecer, una sola vez por montaje.
 * Es una animación NARRATIVA de datos (como <Reveal>, ~1.1s), no una
 * micro-interacción de UI de <300ms — por eso no usa el easing de
 * StickyPredictButton, sino el mismo cubic-bezier que <Reveal> ya usa.
 */
export function CountUp({
  value,
  suffix = "",
  className,
}: {
  value: number;
  suffix?: string;
  className?: string;
}) {
  const [display, setDisplay] = useState(0);
  const shouldReduceMotion = useReducedMotion();

  useEffect(() => {
    if (shouldReduceMotion) {
      setDisplay(value);
      return;
    }
    const controls = animate(0, value, {
      duration: 1.1,
      ease: [0.16, 1, 0.3, 1],
      onUpdate: (v) => setDisplay(Math.round(v)),
    });
    return () => controls.stop();
  }, [value, shouldReduceMotion]);

  return (
    <span className={className}>
      {display.toLocaleString("es")}
      {suffix}
    </span>
  );
}
