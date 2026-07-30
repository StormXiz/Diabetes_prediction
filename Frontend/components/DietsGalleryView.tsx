"use client";

import Link from "next/link";
import { Reveal } from "@/components/Reveal";
import { NutritionExplorer } from "@/components/NutritionExplorer";
import { FoodCanvasLoader } from "@/components/three/FoodCanvasLoader";

const RISK_LABEL: Record<string, { label: string; color: string }> = {
  low: { label: "Riesgo bajo", color: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300" },
  moderate: { label: "Riesgo moderado", color: "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300" },
  high: { label: "Riesgo alto", color: "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300" },
};

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
        <FoodCanvasLoader className="pointer-events-none absolute inset-0 opacity-70 dark:opacity-50" />
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-white/40 via-white/70 to-white dark:from-slate-950/40 dark:via-slate-950/70 dark:to-slate-950" />
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

      {diets.length > 0 && (
        <section className="border-t border-slate-200 bg-slate-50 px-6 py-20 dark:border-slate-800 dark:bg-slate-900/50">
          <div className="mx-auto max-w-5xl">
            <Reveal className="text-center">
              <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-50">Planes detallados</h2>
              <p className="mx-auto mt-2 max-w-xl text-slate-500 dark:text-slate-400">
                Dietas completas preparadas por el equipo, con menús y alimentos específicos.
              </p>
            </Reveal>

            <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {diets.map((d, i) => {
                const meta = RISK_LABEL[d.target_risk] ?? {
                  label: d.target_risk,
                  color: "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300",
                };
                return (
                  <Reveal key={d.id} delay={0.05 * i}>
                    <Link
                      href={`/diets/${d.slug}`}
                      className="group block overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition-all duration-200 ease-[cubic-bezier(0.16,1,0.3,1)] hover:-translate-y-0.5 hover:shadow-md dark:border-slate-800 dark:bg-slate-900"
                    >
                      {d.image_url && (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={d.image_url} alt="" className="h-36 w-full object-cover" />
                      )}
                      <div className="p-6">
                        <span className={`inline-block rounded-full px-3 py-1 text-xs font-semibold ${meta.color}`}>
                          {meta.label}
                        </span>
                        <h3 className="mt-3 font-semibold text-slate-900 group-hover:text-emerald-700 dark:text-slate-100 dark:group-hover:text-emerald-400">
                          {d.title}
                        </h3>
                        <p className="mt-2 text-sm leading-relaxed text-slate-500 dark:text-slate-400">
                          {d.description}
                        </p>
                      </div>
                    </Link>
                  </Reveal>
                );
              })}
            </div>
          </div>
        </section>
      )}
    </main>
  );
}
