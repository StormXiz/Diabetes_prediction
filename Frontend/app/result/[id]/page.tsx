import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { RISK_META } from "@/lib/risk";

type TopFactor = { feature: string; impact: number; direction: "increases_risk" | "decreases_risk" };

export default async function ResultPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect(`/login?redirect=/result/${id}`);

  // RLS ya garantiza que solo veas tu propia predicción (o todas si eres admin).
  const { data: prediction, error } = await supabase
    .from("predictions")
    .select("*")
    .eq("id", id)
    .single();

  if (error || !prediction) notFound();

  const meta = RISK_META[prediction.risk_category as keyof typeof RISK_META];
  const percent = Math.round(prediction.risk_score * 100);
  const topFactors = (prediction.top_factors as TopFactor[] | null) ?? [];

  const { data: recommendation } = await supabase
    .from("recommendations")
    .select("diet_id, diets(slug, title)")
    .eq("risk_category", prediction.risk_category)
    .maybeSingle();

  const diet = recommendation?.diets as { slug: string; title: string } | null | undefined;

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
        </div>
      )}

      <div className="mt-8 rounded-2xl border border-emerald-100 bg-emerald-50 p-5 text-center text-sm text-emerald-900 dark:border-emerald-900/40 dark:bg-emerald-950/40 dark:text-emerald-200">
        Esta es una estimación orientativa generada por un modelo de Machine Learning,{" "}
        <strong>no un diagnóstico médico</strong>. Consulta siempre a un profesional de salud.
      </div>

      {diet && (
        <Link
          href={`/diets/${diet.slug}`}
          className="mt-6 block rounded-full bg-gradient-to-r from-emerald-600 to-blue-600 py-3.5 text-center font-semibold text-white shadow-md transition-transform duration-200 ease-[cubic-bezier(0.16,1,0.3,1)] hover:scale-[1.01] active:scale-[0.98]"
        >
          Ver dieta recomendada: {diet.title}
        </Link>
      )}

      <Link href="/predict" className="mt-4 block text-center text-sm font-medium text-blue-600 hover:underline dark:text-blue-400">
        Hacer otra predicción
      </Link>
    </main>
  );
}

function humanizeFeature(name: string): string {
  const map: Record<string, string> = {
    GenHlth: "Salud general", BMI: "IMC", Age: "Edad", HighBP: "Presión alta",
    HighChol: "Colesterol alto", HbA1c_level: "HbA1c", blood_glucose_level: "Glucosa en sangre",
    bmi: "IMC", age: "Edad", hypertension: "Hipertensión", heart_disease: "Enfermedad cardíaca",
    smoking_history_unknown: "Historial de tabaquismo desconocido", CholCheck: "Revisión de colesterol",
    Income: "Ingresos", Sex: "Sexo",
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
