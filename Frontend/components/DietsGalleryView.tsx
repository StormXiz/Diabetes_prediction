"use client";

import Link from "next/link";
import { Reveal } from "@/components/Reveal";

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
    <main className="min-h-screen bg-white px-6 py-16 transition-colors duration-200 dark:bg-slate-950">
      <div className="mx-auto max-w-5xl">
        <Reveal className="text-center">
            <p className="text-sm font-semibold uppercase tracking-widest text-emerald-600 dark:text-emerald-400">
              Dietas
            </p>
            <h1 className="mt-2 text-3xl font-bold text-slate-900 dark:text-slate-50 sm:text-4xl">
              Recomendaciones de alimentación
            </h1>
            <p className="mx-auto mt-3 max-w-xl text-slate-500 dark:text-slate-400">
              Orientación general por nivel de riesgo. No reemplaza a un nutricionista o médico.
            </p>
          </Reveal>

          <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
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
                      <h2 className="mt-3 font-semibold text-slate-900 group-hover:text-emerald-700 dark:text-slate-100 dark:group-hover:text-emerald-400">
                        {d.title}
                      </h2>
                      <p className="mt-2 text-sm leading-relaxed text-slate-500 dark:text-slate-400">
                        {d.description}
                      </p>
                    </div>
                  </Link>
                </Reveal>
              );
            })}
          </div>

        {diets.length === 0 && (
          <p className="mt-10 text-center text-sm text-slate-400 dark:text-slate-500">
            Aún no hay dietas publicadas.
          </p>
        )}
      </div>
    </main>
  );
}
