"use client";

import { useState } from "react";
import { FoodIcon } from "@/components/FoodIcon";
import { displayFoodName } from "@/lib/foodDisplay";
import type { WeekPlan } from "@/lib/dietEngine";

export function WeekPlanView({ plan }: { plan: WeekPlan }) {
  const [dayIdx, setDayIdx] = useState(0);
  const day = plan.days[dayIdx];

  return (
    <div>
      <div className="flex flex-wrap gap-1.5">
        {plan.days.map((d, i) => (
          <button
            key={d.day}
            onClick={() => setDayIdx(i)}
            className={`cursor-pointer rounded-full px-3.5 py-1.5 text-xs font-semibold transition-colors duration-200 ${
              i === dayIdx
                ? "bg-gradient-to-r from-emerald-600 to-blue-600 text-white"
                : "bg-slate-100 text-slate-500 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:hover:bg-slate-700"
            }`}
          >
            {d.day}
          </button>
        ))}
      </div>

      <div className="mt-5 flex items-center justify-between rounded-xl bg-slate-50 px-4 py-3 dark:bg-slate-900">
        <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">{day.day}</span>
        <span className="text-sm text-slate-500 dark:text-slate-400">
          {Math.round(day.totalKcal)} kcal <span className="text-slate-400 dark:text-slate-500">/ {Math.round(plan.targetCalories)} objetivo</span>
        </span>
      </div>

      <div className="mt-4 space-y-4">
        {day.meals.map((meal) => (
          <div key={meal.name} className="rounded-2xl border border-slate-200 p-4 dark:border-slate-800">
            <div className="flex items-center justify-between">
              <h4 className="font-semibold text-slate-800 dark:text-slate-100">{meal.name}</h4>
              <span className="text-xs font-medium text-slate-400 dark:text-slate-500">{meal.totalKcal} kcal</span>
            </div>
            <div className="mt-3 grid gap-2 sm:grid-cols-2">
              {meal.items.map((it, i) => (
                <div key={i} className="flex items-center gap-3 rounded-xl bg-slate-50 px-3 py-2 dark:bg-slate-900/60">
                  <FoodIcon name={it.food.nombre} tone="good" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-slate-800 dark:text-slate-100">{displayFoodName(it.food.nombre)}</p>
                    <p className="text-xs text-slate-400 dark:text-slate-500">
                      {it.grams} g · {it.kcal} kcal
                      {it.substitutedFrom && (
                        <span className="ml-1.5 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold text-amber-700 dark:bg-amber-900/40 dark:text-amber-300">
                          sustituido de {it.substitutedFrom}
                        </span>
                      )}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
