"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { RISK_META } from "@/lib/risk";
import { MODEL_METRICS, MODEL_METRICS_LABELS } from "@/lib/modelMetrics";
import { readLastPredictionResult } from "@/lib/predictionResult";
import { createClient } from "@/lib/supabase/client";
import type { PredictionResult, TopFactor } from "@/lib/api";

type Diet = { slug: string; title: string };

export default function ResultPage() {
  const router = useRouter();
  const [prediction, setPrediction] = useState<PredictionResult | null>(null);
  const [diet, setDiet] = useState<Diet | null>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "missing">("loading");

  useEffect(() => {
    const result = readLastPredictionResult();
    if (!result) {
      setStatus("missing");
      return;
    }
    setPrediction(result);
    setStatus("ready");

    (async () => {
      const supabase = createClient();
      const { data } = await supabase
        .from("recommendations")
        .select("diet_id, diets(slug, title)")
        .eq("risk_category", result.risk_category)
        .maybeSingle();
      const d = data?.diets as Diet | Diet[] | null | undefined;
      setDiet(Array.isArray(d) ? (d[0] ?? null) : (d ?? null));
    })();
  }, []);

  if (status === "loading") return null;

  if (status === "missing" || !prediction) {
    return (
      <main className="mx-auto flex max-w-xl flex-col items-center px-6 py-20 text-center">
        <p className="text-slate-500 dark:text-slate-400">
          No hay ningún resultado reciente para mostrar — probablemente recargaste la página o
          llegaste aquí directamente.
        </p>
        <Link
          href="/predict"
          className="mt-6 rounded-full bg-gradient-to-r from-emerald-600 to-blue-600 px-6 py-3 text-sm font-semibold text-white shadow-md"
        >
          Calcular tu riesgo
        </Link>
      </main>
    );
  }

  const meta = RISK_META[prediction.risk_category];
  const percent = Math.round(prediction.risk_score * 100);
  const topFactors = prediction.top_factors as TopFactor[];
  const metrics = MODEL_METRICS[prediction.module];

  return (
    <main className="mx-auto max-w-xl px-6 py-16">
      <p className="text-center text-sm font-semibold uppercase tracking-widest text-slate-400 dark:text-slate-500">
        Tu estimación de riesgo
      </p>

      <div className="mt-6 flex flex-col items-center rounded-3xl border border-slate-200 bg-white p-10 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <Gauge percent={percent} color={meta.color} />
        <p className="mt-4 text-3xl font-bold" style={{ color: meta.color }}>
          {percent}%
        </p>
        <span
          className="mt-2 rounded-full px-4 py-1.5 text-sm font-semibold"
          style={{ color: meta.color, backgroundColor: meta.bg }}
        >
          {meta.label}
        </span>
        <p className="mt-4 max-w-sm text-center text-xs leading-relaxed text-slate-400 dark:text-slate-500">
          Es una probabilidad estadística de un modelo entrenado (XGBoost), no un cálculo con
          reglas fijas — por eso no cambia en proporción directa a cuántos factores de riesgo
          actives, y no siempre se mueve en números redondos.
        </p>
        <p className="mt-2 text-center text-[11px] text-slate-400 dark:text-slate-500">
          Categoría asignada con un umbral de {Math.round(prediction.threshold_used * 100)}% de
          probabilidad, elegido en datos de validación para equilibrar cuántos casos reales
          detecta con cuántas falsas alarmas genera.
        </p>
      </div>

      <div className="mt-6">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-400 dark:text-slate-500">
          Desempeño validado del modelo{" "}
          <span className="normal-case tracking-normal text-slate-400 dark:text-slate-500">
            ({prediction.module === "clinical" ? "módulo clínico" : "módulo estilo de vida"}, medido en datos de prueba)
          </span>
        </h2>
        <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-5">
          {MODEL_METRICS_LABELS.map(({ key, label, help }) => (
            <div
              key={key}
              title={help}
              className="rounded-xl border border-slate-200 bg-white p-3 text-center dark:border-slate-800 dark:bg-slate-900"
            >
              <p className="text-xl font-bold text-slate-900 dark:text-slate-50">
                {Math.round(metrics[key] * 100)}%
              </p>
              <p className="mt-0.5 text-[11px] leading-tight text-slate-500 dark:text-slate-400">{label}</p>
            </div>
          ))}
        </div>
      </div>

      {topFactors.length > 0 && (
        <div className="mt-8">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-400 dark:text-slate-500">
            Factores que más influyen en tu resultado
          </h2>
          <ul className="mt-3 space-y-2">
            {topFactors.map((f) => (
              <li
                key={f.feature}
                className="flex items-center justify-between rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm dark:border-slate-800 dark:bg-slate-900"
              >
                <span className="font-medium text-slate-700 dark:text-slate-300">{humanizeFeature(f.feature)}</span>
                <span
                  className={`font-semibold ${
                    f.direction === "increases_risk" ? "text-red-500 dark:text-red-400" : "text-emerald-600 dark:text-emerald-400"
                  }`}
                >
                  {f.direction === "increases_risk" ? "↑ Aumenta el riesgo" : "↓ Reduce el riesgo"}
                </span>
              </li>
            ))}
          </ul>
          <p className="mt-3 text-xs leading-relaxed text-slate-400 dark:text-slate-500">
            Estos factores muestran qué tanto influyó cada dato en <strong>esta predicción del
            modelo</strong> (técnica SHAP) — no significa que ese factor cause diabetes por sí
            solo, ni que corregirlo garantice un resultado distinto.
          </p>
        </div>
      )}

      <div className="mt-8 rounded-2xl border border-emerald-100 bg-emerald-50 p-5 text-center text-sm text-emerald-900 dark:border-emerald-900/40 dark:bg-emerald-950/40 dark:text-emerald-200">
        Esta es una estimación orientativa generada por un modelo de Machine Learning,{" "}
        <strong>no un diagnóstico médico</strong>. Consulta siempre a un profesional de salud.
      </div>

      {diet && (
        <Link
          href={`/diets/${diet.slug}`}
          className="mt-6 flex flex-col items-center gap-0.5 rounded-2xl bg-gradient-to-r from-emerald-600 to-blue-600 py-3.5 text-center font-semibold text-white shadow-md transition-transform duration-200 ease-[cubic-bezier(0.16,1,0.3,1)] hover:scale-[1.01] active:scale-[0.98]"
        >
          <span>Ver tu dieta recomendada</span>
          <span className="text-sm font-medium text-white/80">{diet.title}</span>
        </Link>
      )}

      <button
        onClick={() => router.push("/predict")}
        className="mt-4 block w-full cursor-pointer text-center text-sm font-medium text-blue-600 hover:underline dark:text-blue-400"
      >
        Hacer otra predicción
      </button>
    </main>
  );
}

function humanizeFeature(name: string): string {
  const map: Record<string, string> = {
    GenHlth: "Salud general", BMI: "IMC", Age: "Edad", HighBP: "Presión alta",
    HighChol: "Colesterol alto", HbA1c_level: "HbA1c", blood_glucose_level: "Glucosa en sangre",
    bmi: "IMC", age: "Edad", hypertension: "Hipertensión", heart_disease: "Enfermedad cardíaca",
    smoking_history_unknown: "Historial de tabaquismo desconocido", CholCheck: "Revisión de colesterol",
    Income: "Ingresos", Sex: "Sexo", Education: "Nivel educativo",
    MentHlth: "Días de mala salud mental", PhysHlth: "Días de mala salud física",
    Smoker: "Fumador", Stroke: "ACV previo", HeartDiseaseorAttack: "Enfermedad cardíaca",
    PhysActivity: "Actividad física", Fruits: "Consumo de fruta", Veggies: "Consumo de vegetales",
    HvyAlcoholConsump: "Consumo alto de alcohol", AnyHealthcare: "Cobertura de salud",
    NoDocbcCost: "No fue al médico por costo", DiffWalk: "Dificultad para caminar",
    // Variables derivadas que calcula el modelo v2 (ver ml/src/features_lifestyle.py)
    BMI_cat: "Categoría de IMC", obese: "Obesidad",
    metabolic_burden: "Carga metabólica (presión + colesterol + obesidad)",
    cardio_history: "Antecedentes cardiovasculares",
    healthy_habits: "Balance de hábitos saludables",
    poor_health_days: "Días de mala salud al mes",
    functional_limitation: "Limitación funcional",
    ses_index: "Nivel socioeconómico", healthcare_access: "Acceso a atención médica",
    age_x_bmi: "Edad combinada con IMC",
    genhlth_x_diffwalk: "Salud general con dificultad para caminar",
    risk_factor_count: "Cantidad de factores de riesgo acumulados",
  };
  return map[name] ?? name;
}

function Gauge({ percent, color }: { percent: number; color: string }) {
  const r = 70;
  const c = 2 * Math.PI * r;
  const offset = c - (Math.min(percent, 100) / 100) * c;
  return (
    <svg width="180" height="180" viewBox="0 0 180 180" className="-rotate-90">
      <circle cx="90" cy="90" r={r} fill="none" className="stroke-slate-200 dark:stroke-slate-700" strokeWidth="14" />
      <circle
        cx="90"
        cy="90"
        r={r}
        fill="none"
        stroke={color}
        strokeWidth="14"
        strokeLinecap="round"
        strokeDasharray={c}
        strokeDashoffset={offset}
        style={{ transition: "stroke-dashoffset 0.8s cubic-bezier(0.16,1,0.3,1)" }}
      />
    </svg>
  );
}
