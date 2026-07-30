"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { motion } from "motion/react";

// Simulador ilustrativo con una heurística simple y transparente (no es el
// modelo real de ML) para que cualquier visitante, sin loguearse, sienta en
// segundos cómo edad/IMC/hábitos mueven el riesgo — y de ahí lo invitamos a
// la predicción real con el modelo entrenado.

function estimateIllustrative(age: number, bmi: number, active: boolean, familyHistory: boolean) {
  let score = 5;
  score += Math.max(0, Math.min(30, (age - 30) * 0.55));
  score += Math.max(0, Math.min(35, (bmi - 22) * 1.7));
  if (!active) score += 8;
  if (familyHistory) score += 12;
  return Math.round(Math.max(3, Math.min(92, score)));
}

function bandFor(score: number) {
  if (score < 25) return { label: "Bajo", color: "#059669", bg: "#d1fae5" };
  if (score < 55) return { label: "Moderado", color: "#d97706", bg: "#fef3c7" };
  return { label: "Alto", color: "#dc2626", bg: "#fee2e2" };
}

export function RiskTeaser() {
  const [age, setAge] = useState(35);
  const [bmi, setBmi] = useState(26);
  const [active, setActive] = useState(true);
  const [familyHistory, setFamilyHistory] = useState(false);

  const score = useMemo(() => estimateIllustrative(age, bmi, active, familyHistory), [age, bmi, active, familyHistory]);
  const band = bandFor(score);

  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:p-8">
      <div className="grid gap-8 lg:grid-cols-[1fr_auto]">
        <div className="space-y-6">
          <div>
            <div className="flex items-center justify-between text-sm font-medium text-slate-700 dark:text-slate-300">
              <span>Edad</span>
              <span className="tabular-nums text-slate-500 dark:text-slate-400">{age} años</span>
            </div>
            <input
              type="range"
              min={18}
              max={80}
              value={age}
              onChange={(e) => setAge(Number(e.target.value))}
              className="mt-2 w-full accent-emerald-600"
              aria-label="Edad"
            />
          </div>

          <div>
            <div className="flex items-center justify-between text-sm font-medium text-slate-700 dark:text-slate-300">
              <span>IMC aproximado</span>
              <span className="tabular-nums text-slate-500 dark:text-slate-400">{bmi}</span>
            </div>
            <input
              type="range"
              min={17}
              max={45}
              value={bmi}
              onChange={(e) => setBmi(Number(e.target.value))}
              className="mt-2 w-full accent-emerald-600"
              aria-label="Índice de masa corporal"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <ToggleChip label="Activo físicamente" active={active} onClick={() => setActive((v) => !v)} />
            <ToggleChip label="Antecedentes familiares" active={familyHistory} onClick={() => setFamilyHistory((v) => !v)} />
          </div>
        </div>

        <div className="flex flex-col items-center justify-center">
          <div className="relative h-32 w-32">
            <svg width="128" height="128" viewBox="0 0 128 128" className="-rotate-90">
              <circle cx="64" cy="64" r="54" fill="none" strokeWidth="12" className="stroke-slate-100 dark:stroke-slate-800" />
              <motion.circle
                cx="64"
                cy="64"
                r="54"
                fill="none"
                stroke={band.color}
                strokeWidth="12"
                strokeLinecap="round"
                strokeDasharray={2 * Math.PI * 54}
                animate={{ strokeDashoffset: 2 * Math.PI * 54 * (1 - score / 100) }}
                transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <motion.span
                key={score}
                initial={{ opacity: 0.4, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="text-2xl font-extrabold text-slate-900 dark:text-slate-50"
              >
                {score}%
              </motion.span>
              <span className="text-[11px] font-semibold uppercase tracking-wide" style={{ color: band.color }}>
                {band.label}
              </span>
            </div>
          </div>
          <p className="mt-3 max-w-[10rem] text-center text-[11px] leading-snug text-slate-400 dark:text-slate-500">
            Simulador ilustrativo — no es el modelo real
          </p>
        </div>
      </div>

      <Link
        href="/predict"
        className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-full bg-gradient-to-r from-emerald-600 to-blue-600 px-6 py-3 text-sm font-semibold text-white shadow-md transition-transform duration-200 ease-[cubic-bezier(0.16,1,0.3,1)] hover:scale-[1.02] active:scale-[0.98]"
      >
        Ver mi riesgo real con el modelo entrenado
      </Link>
    </div>
  );
}

function ToggleChip({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`cursor-pointer rounded-xl border px-3 py-2.5 text-xs font-semibold transition-colors duration-200 ${
        active
          ? "border-emerald-300 bg-emerald-50 text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300"
          : "border-slate-200 bg-slate-50 text-slate-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-400"
      }`}
    >
      {label}: {active ? "Sí" : "No"}
    </button>
  );
}
