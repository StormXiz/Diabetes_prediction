"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { FormSection, NumberField, SelectField, YesNoField } from "@/components/forms";
import { predictClinical, ApiError } from "@/lib/api";
import { createClient } from "@/lib/supabase/client";

type Form = {
  age: number | "";
  bmi: number | "";
  HbA1c_level: number | "";
  blood_glucose_level: number | "";
  hypertension: 0 | 1 | "";
  heart_disease: 0 | 1 | "";
  gender: "Female" | "Male" | "Other" | "";
  smoking_history: "current" | "ever" | "former" | "never" | "not current" | "unknown" | "";
};

const EMPTY: Form = {
  age: "", bmi: "", HbA1c_level: "", blood_glucose_level: "",
  hypertension: "", heart_disease: "", gender: "", smoking_history: "",
};

const FIELD_LABELS: Record<keyof Form, string> = {
  age: "Edad", bmi: "IMC", HbA1c_level: "HbA1c", blood_glucose_level: "Glucosa en sangre",
  hypertension: "Hipertensión", heart_disease: "Enfermedad cardíaca", gender: "Sexo",
  smoking_history: "Historial de tabaquismo",
};

export default function ClinicalForm() {
  const router = useRouter();
  const [form, setForm] = useState<Form>(EMPTY);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const set = <K extends keyof Form>(key: K) => (v: Form[K]) => setForm((f) => ({ ...f, [key]: v }));
  const missingFields = (Object.keys(form) as (keyof Form)[]).filter((k) => form[k] === "");
  const isComplete = missingFields.length === 0;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!isComplete) return;
    setLoading(true);
    setError(null);

    try {
      const payload = form as Record<string, unknown>;
      const result = await predictClinical(payload);

      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      const { data, error: insertError } = await supabase
        .from("predictions")
        .insert({
          user_id: user!.id,
          module: "clinical",
          input_data: JSON.parse(JSON.stringify(payload)),
          risk_score: result.risk_score,
          risk_category: result.risk_category,
          top_factors: result.top_factors,
        })
        .select("id")
        .single();

      if (insertError) throw insertError;
      router.push(`/result/${data.id}`);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Algo salió mal. Intenta de nuevo.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="mx-auto max-w-2xl px-6 py-16">
      <p className="text-sm font-semibold uppercase tracking-widest text-blue-600 dark:text-blue-400">
        Módulo · Datos clínicos
      </p>
      <h1 className="mt-2 text-3xl font-bold text-slate-900 dark:text-slate-50">Tus datos de laboratorio</h1>
      <p className="mt-2 text-slate-500 dark:text-slate-400">
        HbA1c y glucosa suelen venir en tu último análisis de sangre de rutina.
      </p>

      <form onSubmit={handleSubmit} className="mt-10 space-y-10">
        <FormSection title="Datos básicos">
          <NumberField label="Edad (años)" info="Tu edad actual en años cumplidos." min={0} max={110} value={form.age} onChange={set("age")} />
          <SelectField label="Sexo" info="Sexo registrado en tu historia clínica, tal como lo maneja el dataset con el que se entrenó el modelo." value={form.gender} onChange={set("gender")} options={[
            { value: "Female", label: "Mujer" }, { value: "Male", label: "Hombre" }, { value: "Other", label: "Otro" },
          ]} />
          <NumberField label="IMC (índice de masa corporal)" info="Fórmula: IMC = peso en kilogramos ÷ (estatura en metros)². Por ejemplo, 70 kg y 1.70 m dan un IMC de 70 ÷ (1.70 × 1.70) ≈ 24.2." help="Peso(kg) / estatura(m)²" min={10} max={80} step={0.1} value={form.bmi} onChange={set("bmi")} />
        </FormSection>

        <FormSection title="Laboratorio">
          <NumberField label="HbA1c (%)" info="Hemoglobina glicosilada: refleja tu promedio de glucosa de los últimos 2-3 meses. Aparece en cualquier análisis de sangre de rutina. Valores de referencia: menos de 5.7% normal, 5.7-6.4% prediabetes, 6.5%+ diabetes." help="Hemoglobina glicosilada, de tu análisis de sangre" min={3} max={20} step={0.1} value={form.HbA1c_level} onChange={set("HbA1c_level")} />
          <NumberField label="Glucosa en sangre (mg/dL)" info="Nivel de azúcar en sangre de tu último análisis. En ayunas: menos de 100 es normal, 100-125 prediabetes, 126+ diabetes. Si tu análisis está en mmol/L, multiplica por 18 para convertir." min={40} max={400} value={form.blood_glucose_level} onChange={set("blood_glucose_level")} />
        </FormSection>

        <FormSection title="Antecedentes">
          <YesNoField label="Hipertensión (presión arterial alta)" info="Que un médico te haya diagnosticado presión arterial alta en algún momento." value={form.hypertension} onChange={set("hypertension")} />
          <YesNoField label="Enfermedad cardíaca" info="Cualquier enfermedad del corazón diagnosticada por un médico (coronaria, infarto previo, etc.). Se pregunta solo como antecedente para el cálculo." value={form.heart_disease} onChange={set("heart_disease")} />
          <SelectField label="Historial de tabaquismo" info="Las categorías son las del registro clínico original con el que se entrenó el modelo. Elige la que mejor te describa." value={form.smoking_history} onChange={set("smoking_history")} options={[
            { value: "never", label: "Nunca he fumado" },
            { value: "former", label: "Fumaba, ya no" },
            { value: "current", label: "Fumo actualmente" },
            { value: "not current", label: "No actualmente (fumé antes esporádicamente)" },
            { value: "ever", label: "Alguna vez" },
            { value: "unknown", label: "Prefiero no decirlo" },
          ]} />
        </FormSection>

        {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}

        {!isComplete && (
          <p className="rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800 dark:bg-amber-950/40 dark:text-amber-300">
            Falta completar: {missingFields.map((k) => FIELD_LABELS[k]).join(", ")}.
          </p>
        )}

        <button
          type="submit"
          disabled={loading || !isComplete}
          className="w-full rounded-full bg-gradient-to-r from-emerald-600 to-blue-600 py-3.5 font-semibold text-white shadow-md transition-transform duration-200 ease-[cubic-bezier(0.16,1,0.3,1)] hover:scale-[1.01] active:scale-[0.98] disabled:opacity-50 disabled:hover:scale-100"
        >
          {loading ? "Calculando..." : "Ver mi estimación de riesgo"}
        </button>
        <p className="text-center text-xs text-slate-400 dark:text-slate-500">
          Esta plataforma ofrece una estimación orientativa, no un diagnóstico médico.
        </p>
      </form>
    </main>
  );
}
