"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence, useReducedMotion } from "motion/react";
import { bmiCategory } from "@/lib/bmi";

/**
 * Calculadora de IMC = peso(kg) / estatura(m)². No guarda nada, solo rellena
 * el campo BMI del formulario para quien no sepa su IMC de memoria.
 */
export function BmiCalculatorModal({
  open,
  onClose,
  onApply,
}: {
  open: boolean;
  onClose: () => void;
  onApply: (bmi: number) => void;
}) {
  const [weight, setWeight] = useState("");
  const [height, setHeight] = useState("");
  const shouldReduceMotion = useReducedMotion();

  useEffect(() => {
    if (!open) return;
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [open, onClose]);

  useEffect(() => {
    if (open) {
      setWeight("");
      setHeight("");
    }
  }, [open]);

  const w = parseFloat(weight);
  const hCm = parseFloat(height);
  const hM = hCm / 100;
  const bmi = w > 0 && hM > 0 ? w / (hM * hM) : null;

  function handleApply() {
    if (bmi) {
      onApply(Math.round(bmi * 10) / 10);
      onClose();
    }
  }

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 px-6"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
          onClick={onClose}
        >
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-labelledby="bmi-modal-title"
            onClick={(e) => e.stopPropagation()}
            initial={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
            className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl dark:bg-slate-900"
          >
            <h2 id="bmi-modal-title" className="text-lg font-bold text-slate-900 dark:text-slate-50">
              Calcula tu IMC
            </h2>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              IMC = peso (kg) ÷ estatura (m)². Solo se usa para rellenar el campo, no se guarda en
              ningún lado.
            </p>

            <div className="mt-4 space-y-3">
              <label className="block">
                <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Peso (kg)</span>
                <input
                  type="number"
                  min={20}
                  max={300}
                  step={0.1}
                  value={weight}
                  onChange={(e) => setWeight(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
                />
              </label>
              <label className="block">
                <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Estatura (cm)</span>
                <input
                  type="number"
                  min={100}
                  max={250}
                  step={1}
                  value={height}
                  onChange={(e) => setHeight(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
                />
              </label>
            </div>

            {bmi !== null && (
              <div
                className="mt-4 rounded-lg px-3 py-2.5 text-center"
                style={{ backgroundColor: bmiCategory(bmi).bg }}
              >
                <p className="text-sm text-slate-600">
                  Tu IMC es <strong className="text-slate-900">{bmi.toFixed(1)}</strong>
                </p>
                <p className="mt-0.5 text-sm font-semibold" style={{ color: bmiCategory(bmi).color }}>
                  {bmiCategory(bmi).label}
                </p>
              </div>
            )}

            <div className="mt-5 flex gap-2">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 cursor-pointer rounded-full bg-slate-100 py-2.5 text-sm font-semibold text-slate-600 transition-colors hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={!bmi}
                onClick={handleApply}
                className="flex-1 cursor-pointer rounded-full bg-gradient-to-r from-emerald-600 to-blue-600 py-2.5 text-sm font-semibold text-white transition-transform duration-200 ease-[cubic-bezier(0.16,1,0.3,1)] hover:scale-[1.02] active:scale-[0.97] disabled:opacity-50 disabled:hover:scale-100 disabled:cursor-not-allowed"
              >
                Usar este IMC
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
