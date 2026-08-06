"use client";

import { useEffect, useState, useCallback } from "react";
import { BiometricsForm } from "@/components/BiometricsForm";
import { WeekPlanView } from "@/components/WeekPlanView";
import { GuideChatbot } from "@/components/GuideChatbot";
import { calculateTDEE } from "@/lib/tdee";
import { generateWeeklyPlan, type WeekPlan } from "@/lib/dietEngine";
import { readLocalProfile, saveLocalRestrictions, type Biometrics } from "@/lib/localProfile";
import type { RiskLevel } from "@/lib/data/diet_guidance";
import { readLastPredictionResult } from "@/lib/predictionResult";
import { generateDietPlanPdf } from "@/lib/pdfExport";
import { isRiskCategory, RISK_META } from "@/lib/risk";

type Status = "loading" | "needs_profile" | "ready";

export function WeeklyDietPlanner({ riskLevel, dietTitle }: { riskLevel: RiskLevel; dietTitle?: string }) {
  const [status, setStatus] = useState<Status>("loading");
  const [biometrics, setBiometrics] = useState<Biometrics | null>(null);
  const [restrictions, setRestrictions] = useState<string[]>([]);
  const [plan, setPlan] = useState<WeekPlan | null>(null);
  const [generating, setGenerating] = useState(false);
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    const local = readLocalProfile();
    if (!local) {
      setStatus("needs_profile");
      return;
    }
    setBiometrics(local.biometrics);
    setRestrictions(local.restrictions ?? []);
    setStatus("ready");
  }, []);

  const runGenerate = useCallback(
    (bio: Biometrics, restr: string[]) => {
      setGenerating(true);
      const tdee = calculateTDEE(bio.weight_kg, bio.height_cm, bio.age, bio.sex, bio.activity_level);
      const newPlan = generateWeeklyPlan(tdee, riskLevel, restr);
      setPlan(newPlan);
      setGenerating(false);
    },
    [riskLevel],
  );

  function handleRestrictionsChange(newRestrictions: string[]) {
    setRestrictions(newRestrictions);
    saveLocalRestrictions(newRestrictions);
    if (biometrics) runGenerate(biometrics, newRestrictions);
  }

  function handleExportPdf() {
    if (!plan || exporting) return;
    setExporting(true);
    try {
      // Se lee al momento del click (no en el render) para tomar siempre la
      // predicción más reciente guardada en sessionStorage — el usuario pudo
      // haber llegado a esta dieta desde la galería, no solo desde /result.
      const prediction = readLastPredictionResult();
      const category = prediction && isRiskCategory(prediction.risk_category) ? prediction.risk_category : riskLevel;
      generateDietPlanPdf({
        prediction,
        plan,
        dietTitle: dietTitle ?? RISK_META[riskLevel].label,
        riskCategory: category,
      });
    } finally {
      setExporting(false);
    }
  }

  // Los datos físicos ya se piden una sola vez por navegador (localStorage)
  // — si ya están guardados, el plan se calcula solo, sin pedirle nada más
  // al usuario ni exigir un click.
  useEffect(() => {
    if (status === "ready" && biometrics && !plan && !generating) {
      runGenerate(biometrics, restrictions);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, biometrics]);

  if (status === "loading") return null;

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
      <div className="rounded-2xl border border-slate-200 bg-gradient-to-br from-emerald-50 to-blue-50 p-10 text-center dark:border-slate-800 dark:from-emerald-950/30 dark:to-blue-950/30">
        <div className="mx-auto h-8 w-8 animate-spin rounded-full border-2 border-emerald-600 border-t-transparent" />
        <p className="mt-4 text-slate-700 dark:text-slate-200">
          Calculando tu plan de lunes a domingo con tus calorías de mantenimiento…
        </p>
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
          <div className="flex items-center gap-2">
            <button
              onClick={() => biometrics && runGenerate(biometrics, restrictions)}
              disabled={generating}
              className="cursor-pointer rounded-full border border-slate-300 px-4 py-2 text-xs font-semibold text-slate-600 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
            >
              {generating ? "Regenerando…" : "Regenerar"}
            </button>
            <button
              onClick={handleExportPdf}
              disabled={exporting}
              className="flex cursor-pointer items-center gap-1.5 rounded-full bg-gradient-to-r from-emerald-600 to-blue-600 px-4 py-2 text-xs font-semibold text-white transition-transform hover:scale-105 active:scale-95 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                <path d="M12 15V3m0 12-4-4m4 4 4-4" />
                <path d="M3 15v4a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-4" />
              </svg>
              {exporting ? "Generando…" : "Descargar PDF"}
            </button>
          </div>
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
