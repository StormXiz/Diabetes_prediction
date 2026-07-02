"use client";

import { motion, useReducedMotion, type Variants } from "motion/react";
import type { ReactNode } from "react";

/**
 * Envoltorio de scroll-reveal reutilizable para las 6 secciones de la landing
 * [PLAN_MAESTRO sec 8.3 y 9]. Respeta `prefers-reduced-motion` (si el usuario
 * lo tiene activado, aparece sin animación, sin desplazamiento).
 *
 * Nota de diseño: esto es una animación NARRATIVA de scroll (una vez por
 * sección, ~500-700ms), distinta de las micro-interacciones de UI (botones,
 * hover) que sí deben ir <300ms con easing propio — esas están en
 * StickyPredictButton y en los `transition` de los `<a>`/`<button>` de las
 * páginas de auth.
 */
export function Reveal({
  children,
  delay = 0,
  y = 24,
  className,
}: {
  children: ReactNode;
  delay?: number;
  y?: number;
  className?: string;
}) {
  const shouldReduceMotion = useReducedMotion();

  const variants: Variants = shouldReduceMotion
    ? { hidden: { opacity: 1, y: 0 }, visible: { opacity: 1, y: 0 } }
    : { hidden: { opacity: 0, y }, visible: { opacity: 1, y: 0 } };

  return (
    <motion.div
      className={className}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, amount: 0.35 }}
      variants={variants}
      transition={{ duration: 0.6, delay, ease: [0.16, 1, 0.3, 1] }}
    >
      {children}
    </motion.div>
  );
}
