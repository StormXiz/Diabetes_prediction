"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { BiometricsForm, type Biometrics } from "@/components/BiometricsForm";
import { WeekPlanView } from "@/components/WeekPlanView";
import { GuideChatbot } from "@/components/GuideChatbot";
import { calculateTDEE } from "@/lib/tdee";
import { generateWeeklyPlan, type WeekPlan } from "@/lib/dietEngine";
import type { RiskLevel } from "@/lib/data/diet_guidance";

type Status = "loading" | "anon" | "needs_profile" | "ready";

export function WeeklyDietPlanner({ riskLevel }: { riskLevel: RiskLevel }) {
  const pathname = usePathname();
  const supabase = createClient();

  const [status, setStatus] = useState<Status>("loading");
  const [biometrics, setBiometrics] = useState<Biometrics | null>(null);
  const [restrictions, setRestrictions] = useState<string[]>([]);
  const [plan, setPlan] = useState<WeekPlan | null>(null);
  const [generating, setGenerating] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        if (!cancelled) setStatus("anon");
        return;
      }
      const { data: profile } = await supabase
        .from("profiles")
        .select("weight_kg, height_cm, age, sex, activity_level, dietary_restrictions")
        .eq("id", user.id)
        .single();

      if (cancelled) return;

      if (
        profile?.weight_kg == null ||
        profile?.height_cm == null ||
        profile?.age == null ||
        !profile?.sex ||
        !profile?.activity_level
      ) {
        setStatus("needs_profile");
        return;
      }

      setBiometrics({
        weight_kg: profile.weight_kg,
        height_cm: profile.height_cm,
        age: profile.age,
        sex: profile.sex as Biometrics["sex"],
        activity_level: profile.activity_level as Biometrics["activity_level"],
      });
      setRestrictions(profile.dietary_restrictions ?? []);
      setStatus("ready");
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const runGenerate = useCallback(
    async (bio: Biometrics, restr: string[]) => {
      setGenerating(true);
      const tdee = calculateTDEE(bio.weight_kg, bio.height_cm, bio.age, bio.sex, bio.activity_level);
      const newPlan = generateWeeklyPlan(tdee, riskLevel, restr);
      setPlan(newPlan);

      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (user) {
        await supabase.from("generated_meal_plans").insert({
          user_id: user.id,
          risk_category: riskLevel,
          tdee,
          target_calories: tdee,
          dietary_restrictions: restr,
          plan: newPlan as unknown as never,
        });
      }
      setGenerating(false);
    },
    [riskLevel, supabase],
  );

  async function handleRestrictionsChange(newRestrictions: string[]) {
    setRestrictions(newRestrictions);
    if (biometrics) await runGenerate(biometrics, newRestrictions);
  }

  if (status === "loading") return null;

  if (status === "anon") {
    return (
      <div className="rounded-2xl border border-dashed border-slate-300 p-8 text-center dark:border-slate-700">
        <p className="text-slate-600 dark:text-slate-300">
          Inicia sesión para generar tu plan alimenticio semanal personalizado con tus calorías de
          mantenimiento reales.
        </p>
        <Link
          href={`/login?redirect=${encodeURIComponent(pathname)}`}
          className="mt-4 inline-block cursor-pointer rounded-full bg-gradient-to-r from-emerald-600 to-blue-600 px-6 py-2.5 text-sm font-semibold text-white shadow-md transition-transform duration-200 hover:scale-[1.02]"
        >
          Iniciar sesión
        </Link>
      </div>
    );
  }

  if (status === "needs_profile") {
    return (
      <div className="rounded-2xl border border-slate-200 p-6 dark:border-slate-800">
        <BiometricsForm
          onSaved={(bio, restr) => {
            setBiometrics(bio);
            setRestrictions(restr);
            setStatus("ready");
          }}
        />
      </div>
    );
  }

  if (!plan) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-gradient-to-br from-emerald-50 to-blue-50 p-8 text-center dark:border-slate-800 dark:from-emerald-950/30 dark:to-blue-950/30">
        <p className="text-slate-700 dark:text-slate-200">
          Ya tenemos tus datos. Genera tu plan de lunes a domingo con comidas y gramos reales,
          basado en tus calorías de mantenimiento.
        </p>
        <button
          onClick={() => biometrics && runGenerate(biometrics, restrictions)}
          disabled={generating}
          className="mt-4 cursor-pointer rounded-full bg-gradient-to-r from-emerald-600 to-blue-600 px-6 py-2.5 text-sm font-semibold text-white shadow-md transition-transform duration-200 hover:scale-[1.02] disabled:opacity-50"
        >
          {generating ? "Generando…" : "Recomendar dieta"}
        </button>
      </div>
    );
  }

  return (
    <div className="grid gap-8 lg:grid-cols-[1.3fr_1fr]">
      <div>
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h3 className="text-lg font-bold text-slate-900 dark:text-slate-50">Tu plan semanal</h3>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              {Math.round(plan.targetCalories)} kcal/día de mantenimiento
              {restrictions.length > 0 && ` · sin ${restrictions.join(", ").toLowerCase()}`}
            </p>
          </div>
          <button
            onClick={() => biometrics && runGenerate(biometrics, restrictions)}
            disabled={generating}
            className="cursor-pointer rounded-full border border-slate-300 px-4 py-2 text-xs font-semibold text-slate-600 transition-colors hover:bg-slate-50 disabled:opacity-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
          >
            {generating ? "Regenerando…" : "Regenerar"}
          </button>
        </div>
        <WeekPlanView plan={plan} />
      </div>

      <div>
        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400 dark:text-slate-500">
          Pregúntale al bot (ej. intolerancias, sustituciones)
        </p>
        <GuideChatbot
          compact
          ctx={{ level: riskLevel, percent: 0, topFactors: [], restrictions }}
          onRestrictionsChange={handleRestrictionsChange}
        />
      </div>
    </div>
  );
}
