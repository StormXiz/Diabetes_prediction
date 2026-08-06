"use client";

import Link from "next/link";
import { Reveal } from "@/components/Reveal";
import { NutritionExplorer } from "@/components/NutritionExplorer";
import { FoodCanvasLoader } from "@/components/three/FoodCanvasLoader";
import { FoodIcon } from "@/components/FoodIcon";
import { allTemplateItems } from "@/lib/data/mealTemplates";
import type { RiskLevel } from "@/lib/data/diet_guidance";

const RISK_LABEL: Record<string, { label: string; color: string; dot: string }> = {
  low: { label: "Riesgo bajo", color: "text-emerald-700 dark:text-emerald-300", dot: "bg-emerald-500" },
  moderate: { label: "Riesgo moderado", color: "text-amber-700 dark:text-amber-300", dot: "bg-amber-500" },
  high: { label: "Riesgo alto", color: "text-red-700 dark:text-red-300", dot: "bg-red-500" },
};

const LEVEL_ORDER: RiskLevel[] = ["low", "moderate", "high"];

type Diet = {
  id: string;
  title: string;
  slug: string;
  description: string | null;
  target_risk: string;
  image_url: string | null;
};

export function DietsGalleryView({ diets }: { diets: Diet[] }) {
  return (
    <main className="min-h-screen bg-white transition-colors duration-200 dark:bg-slate-950">
      <section className="relative overflow-hidden px-6 pb-16 pt-20">
        <FoodCanvasLoader className="pointer-events-none absolute inset-0" />
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-white/10 via-white/60 to-white dark:from-slate-950/10 dark:via-slate-950/60 dark:to-slate-950" />
        <Reveal className="relative mx-auto max-w-3xl text-center">
          <p className="text-sm font-semibold uppercase tracking-widest text-emerald-600 dark:text-emerald-400">
            Nutrición
          </p>
          <h1 className="mt-2 text-4xl font-bold text-slate-900 dark:text-slate-50 sm:text-5xl">
            Come según tu riesgo
          </h1>
          <p className="mx-auto mt-4 max-w-xl text-lg text-slate-600 dark:text-slate-300">
            Recomendaciones basadas en la American Diabetes Association y la Tabla de Composición de
            Alimentos de Ecuador. Elige tu nivel de riesgo y descubre qué comer, qué evitar y por qué.
          </p>
        </Reveal>
      </section>

      <section className="px-6 pb-20">
        <div className="mx-auto max-w-5xl">
          <NutritionExplorer />
        </div>
      </section>

      <section className="border-t border-slate-200 bg-slate-50 px-6 py-20 dark:border-slate-800 dark:bg-slate-900/50">
        <div className="mx-auto max-w-5xl">
          <Reveal className="text-center">
            <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-50">Planes detallados</h2>
            <p className="mx-auto mt-2 max-w-xl text-slate-500 dark:text-slate-400">
              Dietas completas preparadas por el equipo, con menú semanal y alimentos específicos.
            </p>
          </Reveal>

          {diets.length === 0 ? (
            <Reveal delay={0.05} className="mt-10 rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center dark:border-slate-700 dark:bg-slate-900">
              <p className="text-slate-500 dark:text-slate-400">
                Todavía no hay planes publicados. Mientras tanto, arriba puedes explorar qué comer y qué
                evitar para tu nivel de riesgo.
              </p>
            </Reveal>
          ) : (
            <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {[...diets]
                .sort((a, b) => LEVEL_ORDER.indexOf(a.target_risk as RiskLevel) - LEVEL_ORDER.indexOf(b.target_risk as RiskLevel))
                .map((d, i) => (
                  <Reveal key={d.id} delay={0.05 * i}>
                    <DietCard diet={d} />
                  </Reveal>
                ))}
            </div>
          )}
        </div>
      </section>
    </main>
  );
}

function DietCard({ diet }: { diet: Diet }) {
  const meta = RISK_LABEL[diet.target_risk] ?? { label: diet.target_risk, color: "text-slate-600 dark:text-slate-300", dot: "bg-slate-400" };
  // Vitrina real de 4 alimentos del plan de este nivel — no un ícono
  // genérico ni una foto de stock, sino comida real que sí va a aparecer en
  // el menú semanal si entras a esta dieta.
  const level = (["low", "moderate", "high"].includes(diet.target_risk) ? diet.target_risk : "moderate") as RiskLevel;
  const showcase = allTemplateItems(level).slice(0, 4);

  return (
    <Link
      href={`/diets/${diet.slug}`}
      className="group block overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition-all duration-200 ease-[cubic-bezier(0.16,1,0.3,1)] hover:-translate-y-0.5 hover:border-emerald-300 hover:shadow-md dark:border-slate-800 dark:bg-slate-900 dark:hover:border-emerald-700"
    >
      <div className="flex items-center justify-center gap-1 bg-gradient-to-br from-slate-50 to-white px-4 py-6 dark:from-slate-800/60 dark:to-slate-900">
        {showcase.map((f) => (
          <div key={f.nombre} className="rounded-full bg-white p-1.5 shadow-sm ring-1 ring-slate-100 dark:bg-slate-800 dark:ring-slate-700">
            <FoodIcon name={f.nombre} tone="good" />
          </div>
        ))}
      </div>
      <div className="p-6">
        <span className={`inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide ${meta.color}`}>
          <span className={`h-1.5 w-1.5 rounded-full ${meta.dot}`} />
          {meta.label}
        </span>
        <h3 className="mt-2 font-semibold text-slate-900 group-hover:text-emerald-700 dark:text-slate-100 dark:group-hover:text-emerald-400">
          {diet.title}
        </h3>
        <p className="mt-2 text-sm leading-relaxed text-slate-500 dark:text-slate-400">{diet.description}</p>
        <span className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-blue-600 dark:text-blue-400">
          Ver plan
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="transition-transform duration-200 group-hover:translate-x-0.5" aria-hidden>
            <path d="M5 12h14M13 6l6 6-6 6" />
          </svg>
        </span>
      </div>
    </Link>
  );
}
