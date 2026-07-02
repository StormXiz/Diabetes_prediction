"use client";

import Link from "next/link";
import { motion, useReducedMotion, useScroll, useMotionValueEvent } from "motion/react";
import { useState } from "react";

/**
 * CTA sticky "Predecir" [PLAN_MAESTRO sec 8.3, decisión confirmada]. Aparece
 * tras pasar el hero. Micro-interacción de hover/tap <300ms con easing propio
 * (no `ease` por defecto) — a diferencia de los <Reveal> de sección, que son
 * animación narrativa, esto es feedback de UI puro.
 */
export function StickyPredictButton() {
  const [visible, setVisible] = useState(false);
  const { scrollY } = useScroll();
  const shouldReduceMotion = useReducedMotion();

  useMotionValueEvent(scrollY, "change", (latest) => {
    setVisible(latest > (typeof window !== "undefined" ? window.innerHeight * 0.7 : 500));
  });

  return (
    <motion.div
      className="fixed bottom-6 right-6 z-50"
      initial={false}
      animate={{
        opacity: visible ? 1 : 0,
        y: visible ? 0 : shouldReduceMotion ? 0 : 12,
        pointerEvents: visible ? "auto" : "none",
      }}
      transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
    >
      <Link
        href="/predict"
        className="flex items-center gap-2 rounded-full bg-gradient-to-r from-emerald-600 to-blue-600 px-6 py-3.5 font-semibold text-white shadow-lg shadow-emerald-900/10 transition-transform duration-200 ease-[cubic-bezier(0.16,1,0.3,1)] hover:scale-[1.04] active:scale-[0.97]"
      >
        Predecir mi riesgo
      </Link>
    </motion.div>
  );
}
