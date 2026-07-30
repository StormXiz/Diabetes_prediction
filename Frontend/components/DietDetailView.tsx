"use client";

import Link from "next/link";
import { Reveal } from "@/components/Reveal";
import { FoodIcon } from "@/components/FoodIcon";
import { RISK_META, type RiskCategory } from "@/lib/risk";
import { WeeklyDietPlanner } from "@/components/WeeklyDietPlanner";
import { riskToLevel } from "@/lib/data/diet_guidance";
import { FoodCanvasLoader } from "@/components/three/FoodCanvasLoader";

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
    <main className="min-h-screen bg-white transition-colors duration-200 dark:bg-slate-950">
      {/* HERO — 3D + contexto del plan, tintado con el color del nivel de riesgo */}
      <section className="relative overflow-hidden px-6 pb-12 pt-10">
        <div
          aria-hidden
          className="pointer-events-none absolute -top-40 left-1/2 h-[520px] w-[900px] -translate-x-1/2 rounded-full blur-3xl"
          style={{ background: `radial-gradient(circle, ${meta.color}26, transparent 70%)` }}
        />

        <div className="relative mx-auto max-w-5xl">
          <Link
            href="/diets"
            className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 transition-colors hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <path d="m15 18-6-6 6-6" />
            </svg>
            Todas las dietas
          </Link>

          <div className="mt-6 grid items-center gap-10 lg:grid-cols-[1.1fr_0.9fr]">
            <div>
              <Reveal>
                <span
                  className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold uppercase tracking-wide"
                  style={{ color: meta.color, backgroundColor: meta.bg }}
                >
                  <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: meta.color }} />
                  {meta.label}
                </span>
                <h1 className="mt-4 text-4xl font-extrabold tracking-tight text-slate-900 dark:text-slate-50 sm:text-5xl">
                  {diet.title}
                </h1>
              </Reveal>
              <Reveal delay={0.05} className="mt-4">
                <p className="max-w-lg text-lg leading-relaxed text-slate-600 dark:text-slate-400">
                  {diet.description}
                </p>
              </Reveal>

              {(recommended.length > 0 || avoid.length > 0) && (
                <Reveal delay={0.1} className="mt-8 flex gap-8">
                  <Stat value={recommended.length} label="Alimentos que suman" color={meta.color} />
                  {avoid.length > 0 && <Stat value={avoid.length} label="A moderar" color="#94a3b8" />}
                </Reveal>
              )}
            </div>

            <Reveal delay={0.1}>
              <div
                className="relative h-[280px] overflow-hidden rounded-3xl border sm:h-[320px]"
                style={{ borderColor: `${meta.color}33`, background: `linear-gradient(135deg, ${meta.color}14, transparent 70%)` }}
              >
                <FoodCanvasLoader className="absolute inset-0" />
              </div>
            </Reveal>
          </div>
        </div>
      </section>

      <div className="relative mx-auto max-w-5xl px-6 pb-24">
        <Reveal delay={0.1}>
          <h2 className="flex items-center gap-2 text-sm font-bold uppercase tracking-wide text-emerald-700 dark:text-emerald-400">
            <BoltIcon />
            Alimentos que te ayudan a regular tu riesgo
          </h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            {recommended.map((f, i) => (
              <FoodCard key={f.id} food={f} tone="good" delay={i * 0.04} />
            ))}
            {recommended.length === 0 && (
              <p className="text-sm text-slate-400 dark:text-slate-500">Sin alimentos en esta categoría.</p>
            )}
          </div>
        </Reveal>

        {avoid.length > 0 && (
          <Reveal delay={0.15} className="mt-10">
            <details className="group rounded-2xl border border-slate-200 dark:border-slate-800">
              <summary className="flex cursor-pointer list-none items-center justify-between px-5 py-4 text-sm font-semibold text-slate-600 marker:content-none dark:text-slate-300">
                Qué conviene moderar
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="transition-transform duration-200 group-open:rotate-180" aria-hidden>
                  <path d="m6 9 6 6 6-6" />
                </svg>
              </summary>
              <div className="grid gap-3 px-5 pb-5 sm:grid-cols-2">
                {avoid.map((f, i) => (
                  <FoodCard key={f.id} food={f} tone="bad" delay={i * 0.04} />
                ))}
              </div>
            </details>
          </Reveal>
        )}

        <Reveal delay={0.2} className="mt-8 rounded-2xl border border-emerald-100 bg-emerald-50 p-5 text-center text-sm text-emerald-900 dark:border-emerald-900/40 dark:bg-emerald-950/40 dark:text-emerald-200">
          Orientación general, no un plan nutricional personalizado. Consulta a un nutricionista o
          médico antes de hacer cambios importantes en tu dieta.
        </Reveal>

        <Reveal delay={0.25} className="mt-14">
          <div className="flex items-center gap-3">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500 to-blue-600 text-white shadow-md shadow-emerald-500/20">
              <CalendarIcon />
            </span>
            <div>
              <h2 className="text-xl font-bold text-slate-900 dark:text-slate-50">Tu plan de la semana</h2>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                Comidas de lunes a domingo con gramos y calorías reales, calculadas a partir de tus datos.
              </p>
            </div>
          </div>
          <div className="mt-6">
            <WeeklyDietPlanner riskLevel={riskToLevel(diet.target_risk)} />
          </div>
        </Reveal>
      </div>
    </main>
  );
}

function Stat({ value, label, color }: { value: number; label: string; color: string }) {
  return (
    <div>
      <p className="text-3xl font-extrabold" style={{ color }}>
        {value}
      </p>
      <p className="text-xs font-medium text-slate-500 dark:text-slate-400">{label}</p>
    </div>
  );
}

function FoodCard({ food, tone, delay = 0 }: { food: Food; tone: "good" | "bad"; delay?: number }) {
  const isGood = tone === "good";
  return (
    <Reveal delay={delay}>
      <div
        className={`group relative h-full overflow-hidden rounded-2xl border p-4 shadow-sm transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] hover:-translate-y-1 hover:shadow-lg ${
          isGood
            ? "border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900"
            : "border-slate-200 bg-white/70 dark:border-slate-800 dark:bg-slate-900/60"
        }`}
      >
        <div
          className={`pointer-events-none absolute -right-6 -top-6 h-20 w-20 rounded-full blur-2xl transition-opacity duration-300 group-hover:opacity-100 ${
            isGood ? "bg-emerald-400/20 opacity-50" : "bg-red-400/15 opacity-40"
          }`}
        />
        <div className="relative flex items-start gap-3">
          <div className="shrink-0 transition-transform duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:scale-110 group-hover:-rotate-6">
            <FoodIcon name={food.name} tone={tone} />
          </div>
          <div className="min-w-0 pt-0.5">
            <p className="font-semibold text-slate-800 dark:text-slate-100">{food.name}</p>
            {isMeaningful(food.portion) && (
              <p className="mt-0.5 text-xs font-medium text-slate-400 dark:text-slate-500">Porción: {food.portion}</p>
            )}
            {isMeaningful(food.notes) && (
              <p className="mt-1 text-sm leading-snug text-slate-500 dark:text-slate-400">{food.notes}</p>
            )}
          </div>
        </div>
      </div>
    </Reveal>
  );
}

function BoltIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M13 2 3 14h7l-1 8 10-12h-7l1-8Z" />
    </svg>
  );
}

function CalendarIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <rect width="18" height="18" x="3" y="4" rx="2" />
      <path d="M16 2v4M8 2v4M3 10h18" />
    </svg>
  );
}
