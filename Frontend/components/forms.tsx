"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { motion, AnimatePresence, useReducedMotion } from "motion/react";

// Inputs reutilizables para los formularios de predicción. Estilo consistente
// con el resto de la app (bordes redondeados, foco verde, mismo tamaño de
// texto) para que no se sienta "otra app" al llegar aquí desde la landing.

/**
 * Botón "i" con explicación de a qué se refiere un campo. Popover <150ms,
 * se cierra con click afuera o Escape. Micro-interacción de UI, no narrativa.
 */
export function InfoTooltip({ text }: { text: string }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const shouldReduceMotion = useReducedMotion();

  useEffect(() => {
    if (!open) return;
    function handlePointer(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", handlePointer);
    document.addEventListener("keydown", handleKey);
    return () => {
      document.removeEventListener("mousedown", handlePointer);
      document.removeEventListener("keydown", handleKey);
    };
  }, [open]);

  return (
    <div className="relative inline-block" ref={ref}>
      <button
        type="button"
        aria-label="Más información"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className="relative flex h-4 w-4 cursor-pointer items-center justify-center rounded-full bg-slate-200 text-[10px] font-bold text-slate-500 transition-colors before:absolute before:-inset-3.5 before:content-[''] hover:bg-slate-300 dark:bg-slate-700 dark:text-slate-300 dark:hover:bg-slate-600"
      >
        i
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, scale: 0.95, y: -4 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, scale: 0.95, y: -4 }}
            transition={{ duration: 0.15, ease: [0.16, 1, 0.3, 1] }}
            style={{ transformOrigin: "top left" }}
            className="absolute left-0 top-6 z-20 w-64 rounded-lg border border-slate-200 bg-white p-3 text-xs leading-relaxed text-slate-600 shadow-lg dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"
          >
            {text}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function FieldLabel({ label, info }: { label: string; info?: string }) {
  return (
    <span className="flex items-center gap-1.5 text-sm font-medium text-slate-700 dark:text-slate-300">
      {label}
      {info && <InfoTooltip text={info} />}
    </span>
  );
}

export function NumberField({
  label,
  help,
  info,
  value,
  onChange,
  min,
  max,
  step = 1,
  children,
}: {
  label: string;
  help?: string;
  info?: string;
  value: number | "";
  onChange: (v: number) => void;
  min: number;
  max: number;
  step?: number;
  children?: ReactNode;
}) {
  return (
    <label className="block">
      <FieldLabel label={label} info={info} />
      {help && <span className="mt-0.5 block text-xs text-slate-400 dark:text-slate-500">{help}</span>}
      <input
        type="number"
        required
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
      />
      {children}
    </label>
  );
}

export function SelectField<T extends string | number>({
  label,
  help,
  info,
  value,
  onChange,
  options,
}: {
  label: string;
  help?: string;
  info?: string;
  value: T | "";
  onChange: (v: T) => void;
  options: { value: T; label: string }[];
}) {
  return (
    <label className="block">
      <FieldLabel label={label} info={info} />
      {help && <span className="mt-0.5 block text-xs text-slate-400 dark:text-slate-500">{help}</span>}
      <select
        required
        value={value}
        onChange={(e) => {
          const raw = e.target.value;
          const match = options.find((o) => String(o.value) === raw);
          if (match) onChange(match.value);
        }}
        className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
      >
        <option value="" disabled>
          Selecciona...
        </option>
        {options.map((o) => (
          <option key={String(o.value)} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </label>
  );
}

export function YesNoField({
  label,
  help,
  info,
  value,
  onChange,
}: {
  label: string;
  help?: string;
  info?: string;
  value: 0 | 1 | "";
  onChange: (v: 0 | 1) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-lg border border-slate-200 bg-slate-50/70 px-3 py-2.5 dark:border-slate-700 dark:bg-slate-800/40">
      <div>
        <FieldLabel label={label} info={info} />
        {help && <span className="block text-xs text-slate-400 dark:text-slate-500">{help}</span>}
      </div>
      <div className="flex shrink-0 gap-1.5">
        <button
          type="button"
          onClick={() => onChange(1)}
          className={`min-h-[38px] min-w-[52px] cursor-pointer rounded-full px-3.5 text-xs font-semibold transition-colors ${
            value === 1
              ? "bg-emerald-600 text-white"
              : "bg-slate-100 text-slate-500 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:hover:bg-slate-700"
          }`}
        >
          Sí
        </button>
        <button
          type="button"
          onClick={() => onChange(0)}
          className={`min-h-[38px] min-w-[52px] cursor-pointer rounded-full px-3.5 text-xs font-semibold transition-colors ${
            value === 0
              ? "bg-blue-600 text-white"
              : "bg-slate-100 text-slate-500 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:hover:bg-slate-700"
          }`}
        >
          No
        </button>
      </div>
    </div>
  );
}

export function FormSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900/60 sm:p-6">
      <h3 className="text-sm font-semibold uppercase tracking-wide text-emerald-700 dark:text-emerald-400">{title}</h3>
      <div className="mt-4 space-y-4">{children}</div>
    </div>
  );
}

/** Barra de progreso para formularios largos — cuántos campos ya están llenos. */
export function FormProgress({ done, total }: { done: number; total: number }) {
  const pct = total === 0 ? 100 : Math.round((done / total) * 100);
  return (
    <div className="sticky top-14 z-10 -mx-6 border-b border-slate-200 bg-white/95 px-6 py-3 backdrop-blur transition-colors duration-200 dark:border-slate-800 dark:bg-slate-950/95 sm:top-16">
      <div className="flex items-center justify-between text-xs font-medium text-slate-500 dark:text-slate-400">
        <span>Progreso del formulario</span>
        <span>
          {done}/{total} campos
        </span>
      </div>
      <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
        <div
          className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-blue-500 transition-[width] duration-300 ease-out"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}
