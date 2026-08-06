"use client";

import { useMemo, useState } from "react";
import { Reveal } from "@/components/Reveal";
import { FoodIcon } from "@/components/FoodIcon";
import { DIET_PLANS, type RiskLevel } from "@/lib/data/diet_guidance";
import { CURATED_FOODS, type FoodItem } from "@/lib/data/curatedFoods";
import { allTemplateItems } from "@/lib/data/mealTemplates";
import { displayFoodName } from "@/lib/foodDisplay";

const LEVEL_TABS: { level: RiskLevel; label: string; dot: string }[] = [
  { level: "low", label: "Riesgo bajo", dot: "bg-emerald-500" },
  { level: "moderate", label: "Riesgo intermedio", dot: "bg-amber-500" },
  { level: "high", label: "Riesgo alto", dot: "bg-red-500" },
];

export function NutritionExplorer({ initialLevel = "moderate" }: { initialLevel?: RiskLevel }) {
  const [level, setLevel] = useState<RiskLevel>(initialLevel);
  const plan = DIET_PLANS[level];

  const { recommended, limit } = useMemo(() => {
    // Comida real de los platos del motor de dietas (mealTemplates.ts) — no
    // el pool de CURATED_FOODS ordenado por fibra, que mezclaba ingredientes
    // crudos (ej. "lenteja cruda", "salvado de trigo crudo") con comida real.
    const realFoods = allTemplateItems(level);
    const rec: FoodItem[] = realFoods
      .map((i) => ({
        nombre: i.nombre, categoria: i.categoria, kcal: i.kcal100, prot: i.prot100,
        carb: i.carb100, grasa: i.grasa100, fibra: i.fibra100, sodio: null, potasio: null, gsat: null, avoid: false,
      }))
      .sort((a, b) => (b.fibra ?? 0) - (a.fibra ?? 0))
      .slice(0, 6);
    const lim = CURATED_FOODS.filter((f) => f.avoid)
      .sort((a, b) => (b.kcal ?? 0) - (a.kcal ?? 0))
      .slice(0, 4);
    return { recommended: rec, limit: lim };
  }, [level]);

  return (
    <div>
      <div className="flex flex-wrap justify-center gap-2 rounded-2xl border border-slate-200 bg-slate-50 p-1.5 dark:border-slate-800 dark:bg-slate-900/60 sm:inline-flex">
        {LEVEL_TABS.map((t) => {
          const active = t.level === level;
          return (
            <button
              key={t.level}
              onClick={() => setLevel(t.level)}
              className={`flex cursor-pointer items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-semibold transition-all duration-200 ${
                active
                  ? "bg-white text-slate-900 shadow-sm dark:bg-slate-800 dark:text-white"
                  : "text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-100"
              }`}
            >
              <span className={`h-2 w-2 rounded-full ${t.dot}`} />
              {t.label}
            </button>
          );
        })}
      </div>

      <Reveal key={level} className="mt-8">
        <div className="rounded-3xl border border-slate-200 bg-gradient-to-br from-slate-50 to-white p-8 dark:border-slate-800 dark:from-slate-900 dark:to-slate-950">
          <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-50">{plan.headline}</h2>
          <p className="mt-3 max-w-2xl leading-relaxed text-slate-600 dark:text-slate-300">{plan.summary}</p>

          <div className="mt-8 grid gap-8 lg:grid-cols-[auto_1fr]">
            <PlateDiagram plan={plan} />
            <div>
              <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-400 dark:text-slate-500">
                Por qué estos nutrientes para tu nivel
              </h3>
              <ul className="mt-3 space-y-3">
                {plan.nutrientRules.map((r) => (
                  <li key={r.key} className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
                    <div className="flex items-center gap-2">
                      <span
                        className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${
                          r.direction === "prefer"
                            ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300"
                            : "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300"
                        }`}
                      >
                        {r.direction === "prefer" ? "Busca más" : "Manténlo bajo"}
                      </span>
                      <span className="font-semibold text-slate-800 dark:text-slate-100">{r.label}</span>
                    </div>
                    <p className="mt-2 text-sm leading-relaxed text-slate-600 dark:text-slate-400">{r.why}</p>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </Reveal>

      <div className="mt-10">
        <h3 className="text-lg font-bold text-slate-900 dark:text-slate-50">Alimentos recomendados</h3>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          De la Tabla de Composición de Alimentos de Ecuador (2021), tal como aparecen en tu plan semanal.
        </p>
        <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {recommended.map((f, i) => (
            <Reveal key={f.nombre} delay={0.04 * i}>
              <FoodCard food={f} />
            </Reveal>
          ))}
        </div>
      </div>

      <div className="mt-10">
        <h3 className="text-lg font-bold text-slate-900 dark:text-slate-50">Modera o evita</h3>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          Elevan la glucosa rápido o suman calorías sin fibra: {plan.avoidCategories.join(", ").toLowerCase()}.
        </p>
        <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {limit.map((f, i) => (
            <Reveal key={f.nombre} delay={0.04 * i}>
              <FoodCard food={f} />
            </Reveal>
          ))}
        </div>
      </div>
    </div>
  );
}

function PlateDiagram({ plan }: { plan: (typeof DIET_PLANS)[RiskLevel] }) {
  // Método del plato: 50% vegetales, 25% carbos, 25% proteína — círculo con 3 sectores.
  const veg = plan.platePctVeggies;
  const carb = plan.plateCarbs;
  const segments = [
    { pct: veg, color: "#059669", label: "Vegetales" },
    { pct: carb, color: "#2563eb", label: "Carbohidratos" },
    { pct: plan.plateProtein, color: "#d97706", label: "Proteína" },
  ];
  let acc = 0;
  const gradient = segments
    .map((s) => {
      const start = acc;
      acc += s.pct;
      return `${s.color} ${start}% ${acc}%`;
    })
    .join(", ");

  return (
    <div className="flex flex-col items-center">
      <div
        className="h-44 w-44 rounded-full shadow-inner ring-4 ring-white dark:ring-slate-800"
        style={{ background: `conic-gradient(${gradient})` }}
        role="img"
        aria-label={`Método del plato: ${veg}% vegetales, ${carb}% carbohidratos, ${plan.plateProtein}% proteína`}
      />
      <p className="mt-4 text-center text-sm font-semibold text-slate-700 dark:text-slate-300">
        {plan.fiberTargetG} g de fibra al día
      </p>
      <div className="mt-3 space-y-1.5">
        {segments.map((s) => (
          <div key={s.label} className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-400">
            <span className="h-3 w-3 rounded-sm" style={{ backgroundColor: s.color }} />
            {s.pct}% {s.label}
          </div>
        ))}
      </div>
    </div>
  );
}

function FoodCard({ food }: { food: FoodItem }) {
  const macros: { label: string; value: number | null; unit: string }[] = [
    { label: "Cal", value: food.kcal, unit: "" },
    { label: "Prot", value: food.prot, unit: "g" },
    { label: "Carbs", value: food.carb, unit: "g" },
    { label: "Fibra", value: food.fibra, unit: "g" },
  ];
  return (
    <div className="group relative h-full overflow-hidden rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] hover:-translate-y-1 hover:shadow-lg dark:border-slate-800 dark:bg-slate-900">
      <div
        className={`pointer-events-none absolute -right-8 -top-8 h-24 w-24 rounded-full blur-2xl transition-opacity duration-300 group-hover:opacity-100 ${
          food.avoid ? "bg-red-400/20 opacity-60" : "bg-emerald-400/20 opacity-60"
        }`}
      />
      <div className="relative flex items-start gap-3">
        <div className="transition-transform duration-300 group-hover:scale-110">
          <FoodIcon name={food.nombre} tone={food.avoid ? "bad" : "good"} />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold leading-snug text-slate-900 dark:text-slate-100">{displayFoodName(food.nombre)}</p>
          <p className="mt-0.5 text-xs text-slate-400 dark:text-slate-500">{food.categoria}</p>
        </div>
      </div>
      <div className="relative mt-4 grid grid-cols-4 gap-1.5">
        {macros.map((m) => (
          <div key={m.label} className="rounded-lg bg-slate-50 px-1.5 py-2 text-center dark:bg-slate-800/60">
            <p className="text-sm font-bold text-slate-800 dark:text-slate-100">
              {m.value ?? "—"}
              <span className="text-[10px] font-normal text-slate-400">{m.unit}</span>
            </p>
            <p className="text-[10px] uppercase tracking-wide text-slate-400 dark:text-slate-500">{m.label}</p>
          </div>
        ))}
      </div>
      {(food.sodio != null || food.potasio != null) && (
        <div className="relative mt-2 flex gap-3 text-[11px] text-slate-500 dark:text-slate-400">
          {food.sodio != null && <span>Sodio {food.sodio} mg</span>}
          {food.potasio != null && <span>Potasio {food.potasio} mg</span>}
        </div>
      )}
    </div>
  );
}
