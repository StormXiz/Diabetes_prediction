"use client";

import Link from "next/link";
import { Reveal } from "@/components/Reveal";
import { FoodIcon } from "@/components/FoodIcon";
import { RISK_META, type RiskCategory } from "@/lib/risk";

type Diet = {
  title: string;
  description: string | null;
  target_risk: string;
  image_url: string | null;
};

type Food = {
  id: string;
  name: string;
  category: string;
  portion: string | null;
  notes: string | null;
};

function isMeaningful(text: string | null): text is string {
  return !!text && text.trim() !== "" && text.trim() !== "-";
}

export function DietDetailView({ diet, foods }: { diet: Diet; foods: Food[] }) {
  const meta = RISK_META[diet.target_risk as RiskCategory] ?? RISK_META.moderate;

  const recommended = foods.filter((f) => f.category === "recommended");
  const avoid = foods.filter((f) => f.category === "avoid");

  return (
    <main className="relative min-h-screen overflow-hidden bg-white transition-colors duration-200 dark:bg-slate-950">
      {/* Blob decorativo con el color de la categoría de riesgo, igual de espíritu que el hero de la landing */}
      <div
        aria-hidden
        className="pointer-events-none absolute left-1/2 top-0 h-[420px] w-[720px] -translate-x-1/2 rounded-full blur-3xl"
        style={{ background: `radial-gradient(circle, ${meta.color}22, transparent 70%)` }}
      />

      <div className="relative mx-auto max-w-3xl px-6 py-16">
        <Link href="/diets" className="text-sm font-medium text-blue-600 hover:underline dark:text-blue-400">
          ← Todas las dietas
        </Link>

        {diet.image_url && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={diet.image_url} alt="" className="mt-6 h-48 w-full rounded-2xl object-cover" />
          )}

          <Reveal className="mt-6">
            <span
              className="inline-block rounded-full px-3 py-1 text-xs font-semibold"
              style={{ color: meta.color, backgroundColor: meta.bg }}
            >
              {meta.label}
            </span>
            <h1 className="mt-3 text-3xl font-bold text-slate-900 dark:text-slate-50">{diet.title}</h1>
          </Reveal>
          <Reveal delay={0.05} className="mt-3">
            <p className="text-slate-600 dark:text-slate-400">{diet.description}</p>
          </Reveal>

          <div className="mt-10 grid gap-6 sm:grid-cols-2">
            <Reveal delay={0.1}>
              <FoodColumn title="Recomendados" tone="good" items={recommended} />
            </Reveal>
            <Reveal delay={0.15}>
              <FoodColumn title="Evitar / moderar" tone="bad" items={avoid} />
            </Reveal>
          </div>

          <Reveal delay={0.2} className="mt-10 rounded-2xl border border-emerald-100 bg-emerald-50 p-5 text-center text-sm text-emerald-900 dark:border-emerald-900/40 dark:bg-emerald-950/40 dark:text-emerald-200">
            Orientación general, no un plan nutricional personalizado. Consulta a un nutricionista o
            médico antes de hacer cambios importantes en tu dieta.
        </Reveal>
      </div>
    </main>
  );
}

function FoodColumn({ title, tone, items }: { title: string; tone: "good" | "bad"; items: Food[] }) {
  const isGood = tone === "good";
  return (
    <div
      className={`h-full rounded-2xl border p-5 ${
        isGood
          ? "border-emerald-100 bg-emerald-50/50 dark:border-emerald-900/40 dark:bg-emerald-950/20"
          : "border-red-100 bg-red-50/50 dark:border-red-900/40 dark:bg-red-950/20"
      }`}
    >
      <h2
        className={`text-xs font-semibold uppercase tracking-wide ${
          isGood ? "text-emerald-700 dark:text-emerald-400" : "text-red-700 dark:text-red-400"
        }`}
      >
        {title}
      </h2>
      <ul className="mt-4 space-y-3">
        {items.map((f) => (
          <li
            key={f.id}
            className="flex items-start gap-3 rounded-xl bg-white p-3 shadow-sm dark:bg-slate-900"
          >
            <FoodIcon name={f.name} tone={tone} />
            <div className="min-w-0">
              <p className="font-medium text-slate-800 dark:text-slate-100">{f.name}</p>
              {isMeaningful(f.portion) && (
                <p className="text-xs text-slate-400 dark:text-slate-500">Porción: {f.portion}</p>
              )}
              {isMeaningful(f.notes) && (
                <p className="mt-0.5 text-sm text-slate-500 dark:text-slate-400">{f.notes}</p>
              )}
            </div>
          </li>
        ))}
        {items.length === 0 && (
          <p className="text-sm text-slate-400 dark:text-slate-500">Sin alimentos en esta categoría.</p>
        )}
      </ul>
    </div>
  );
}
