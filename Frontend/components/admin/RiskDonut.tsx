"use client";

import { useEffect, useState } from "react";
import { useReducedMotion } from "motion/react";
import { RISK_META, type RiskCategory } from "@/lib/risk";

const ORDER: RiskCategory[] = ["low", "moderate", "high"];

/**
 * Dona de distribución de riesgo. Mismos colores que el gauge de
 * /result/[id] (lib/risk.ts) para que un admin reconozca de un vistazo qué
 * franja es cuál. Cada segmento "se dibuja" al montar, como el Gauge.
 */
export function RiskDonut({ distribution }: { distribution: Partial<Record<RiskCategory, number>> }) {
  const shouldReduceMotion = useReducedMotion();
  const [drawn, setDrawn] = useState(false);

  useEffect(() => {
    const id = requestAnimationFrame(() => setDrawn(true));
    return () => cancelAnimationFrame(id);
  }, []);

  const total = ORDER.reduce((sum, k) => sum + (distribution[k] ?? 0), 0);
  const r = 60;
  const circumference = 2 * Math.PI * r;

  let cumulative = 0;

  return (
    <div className="flex flex-col items-center gap-6 sm:flex-row sm:items-center sm:justify-center">
      <svg width="160" height="160" viewBox="0 0 160 160" className="-rotate-90 shrink-0">
        <circle cx="80" cy="80" r={r} fill="none" stroke="#f1f5f9" strokeWidth="18" />
        {total === 0 ? null : (
          <>
            {ORDER.map((key) => {
              const count = distribution[key] ?? 0;
              if (count === 0) return null;
              const fraction = count / total;
              const length = fraction * circumference;
              const offset = drawn || shouldReduceMotion ? -cumulative : 0;
              const dasharray = drawn || shouldReduceMotion ? `${length} ${circumference - length}` : `0 ${circumference}`;
              cumulative += length;
              return (
                <circle
                  key={key}
                  cx="80"
                  cy="80"
                  r={r}
                  fill="none"
                  stroke={RISK_META[key].color}
                  strokeWidth="18"
                  strokeDasharray={dasharray}
                  strokeDashoffset={offset}
                  style={{
                    transition: shouldReduceMotion
                      ? "none"
                      : "stroke-dasharray 0.9s cubic-bezier(0.16,1,0.3,1)",
                  }}
                />
              );
            })}
          </>
        )}
      </svg>

      <div className="space-y-2">
        {total === 0 ? (
          <p className="text-sm text-slate-400">Todavía no hay predicciones para repartir por riesgo.</p>
        ) : (
          ORDER.map((key) => {
            const count = distribution[key] ?? 0;
            const pct = Math.round((count / total) * 100);
            return (
              <div key={key} className="flex items-center gap-2.5 text-sm">
                <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: RISK_META[key].color }} />
                <span className="text-slate-600">{RISK_META[key].label}</span>
                <span className="font-semibold text-slate-900">{pct}%</span>
                <span className="text-slate-400">({count})</span>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
