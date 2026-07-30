"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";

const FACTS = [
  "El 90% de los casos de diabetes en el mundo son tipo 2, y muchos son prevenibles.",
  "La actividad física regular mejora la sensibilidad a la insulina en cuestión de semanas.",
  "La prediabetes suele no dar síntomas — por eso conviene estimar el riesgo antes.",
  "Reducir solo un 5-7% del peso corporal puede bajar significativamente el riesgo.",
  "La fibra en la dieta ayuda a suavizar los picos de glucosa después de comer.",
];

export function FactTicker() {
  const [i, setI] = useState(0);
  const shouldReduceMotion = useReducedMotion();

  useEffect(() => {
    if (shouldReduceMotion) return;
    const id = setInterval(() => setI((v) => (v + 1) % FACTS.length), 5000);
    return () => clearInterval(id);
  }, [shouldReduceMotion]);

  return (
    <div className="min-h-[3.5rem]">
      <AnimatePresence mode="wait">
        <motion.p
          key={i}
          initial={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, y: -8 }}
          transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
          className="text-sm leading-relaxed text-white/70"
        >
          {FACTS[i]}
        </motion.p>
      </AnimatePresence>
    </div>
  );
}
