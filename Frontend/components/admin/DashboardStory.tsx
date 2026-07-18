"use client";

import Link from "next/link";
import { CountUp } from "@/components/CountUp";
import { RiskDonut } from "./RiskDonut";
import { TrendSparkline } from "./TrendSparkline";
import { EmptyState } from "./EmptyState";
import type { DashboardStats } from "@/lib/admin";

/**
 * El dashboard admin cuenta una historia con los datos [brief Fase 7], igual
 * que la landing cuenta la historia de la diabetes: los números son el
 * protagonista tipográfico, no una tabla.
 */
export function DashboardStory({ stats }: { stats: DashboardStats }) {
  const trend = [...stats.predictions_last_14_days].sort((a, b) => a.date.localeCompare(b.date));
  const last7 = trend.slice(-7).reduce((sum, d) => sum + d.count, 0);

  const lifestyle = stats.predictions_by_module.lifestyle ?? 0;
  const clinical = stats.predictions_by_module.clinical ?? 0;
  const moduleTotal = lifestyle + clinical || 1;

  return (
    <div className="space-y-12">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Resumen</h1>
        <p className="mt-1 text-slate-500">Cómo está usando la gente la herramienta, en números reales.</p>
      </div>

      {/* Hero narrativo: el número es el protagonista, la frase le da contexto humano */}
      <section className="rounded-3xl border border-slate-200 bg-gradient-to-br from-emerald-50/60 to-blue-50/40 p-8 sm:p-10">
        {stats.total_predictions === 0 ? (
          <EmptyState
            title="Todavía nadie se ha hecho una pregunta sobre su salud aquí"
            description="En cuanto una persona registrada complete un formulario de predicción, su historia empieza a contarse en este panel."
          />
        ) : (
          <>
            <p className="text-lg text-slate-600">
              <CountUp value={stats.total_predictions} className="text-5xl font-extrabold tracking-tight text-slate-900 sm:text-6xl" />
              <br className="sm:hidden" /> personas ya se hicieron una pregunta sobre su salud con esta
              herramienta.
            </p>
            {last7 > 0 && (
              <p className="mt-3 text-slate-500">
                <span className="font-semibold text-emerald-700">{last7}</span> de ellas, solo en los
                últimos 7 días.
              </p>
            )}
          </>
        )}

        <div className="mt-8 grid grid-cols-2 gap-6 border-t border-slate-200/70 pt-6 sm:grid-cols-3">
          <Stat label="Personas registradas" value={stats.total_users} />
          <Stat label="Módulo estilo de vida" value={lifestyle} hint={`${Math.round((lifestyle / moduleTotal) * 100)}% de las predicciones`} />
          <Stat label="Módulo clínico" value={clinical} hint={`${Math.round((clinical / moduleTotal) * 100)}% de las predicciones`} />
        </div>
      </section>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-400">
            En qué categoría de riesgo cae la gente
          </h2>
          <div className="mt-6">
            <RiskDonut distribution={stats.risk_distribution} />
          </div>
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-400">
            Actividad de los últimos 14 días
          </h2>
          <div className="mt-6">
            <TrendSparkline data={trend} />
          </div>
        </section>
      </div>

      <section className="flex flex-col items-start justify-between gap-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:flex-row sm:items-center">
        <div>
          <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-400">Contenido de dietas</h2>
          {stats.diets_total === 0 ? (
            <p className="mt-2 max-w-md text-slate-600">
              Aún no existe ninguna dieta publicada. Crea la primera para que aparezca en las
              recomendaciones de resultado.
            </p>
          ) : (
            <p className="mt-2 max-w-md text-slate-600">
              <span className="font-semibold text-slate-900">{stats.diets_published}</span> de{" "}
              <span className="font-semibold text-slate-900">{stats.diets_total}</span> dietas están
              publicadas, con <span className="font-semibold text-slate-900">{stats.foods_total}</span>{" "}
              alimentos catalogados en total.
            </p>
          )}
        </div>
        <Link
          href="/admin/diets"
          className="shrink-0 rounded-full bg-gradient-to-r from-emerald-600 to-blue-600 px-6 py-3 font-semibold text-white shadow-md transition-transform duration-200 ease-[cubic-bezier(0.16,1,0.3,1)] hover:scale-[1.03] active:scale-[0.97]"
        >
          Gestionar dietas
        </Link>
      </section>
    </div>
  );
}

function Stat({ label, value, hint }: { label: string; value: number; hint?: string }) {
  return (
    <div>
      <CountUp value={value} className="block text-2xl font-bold text-slate-900" />
      <p className="mt-1 text-xs text-slate-500">{label}</p>
      {hint && <p className="text-xs text-slate-400">{hint}</p>}
    </div>
  );
}
