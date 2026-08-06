"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { FormSection, FormProgress, NumberField, SelectField, YesNoField } from "@/components/forms";
import { BmiCalculatorModal } from "@/components/BmiCalculatorModal";
import { bmiCategory } from "@/lib/bmi";
import { predictLifestyle, ApiError } from "@/lib/api";
import { saveLastPredictionResult } from "@/lib/predictionResult";

type Form = {
  BMI: number | "";
  MentHlth: number | "";
  PhysHlth: number | "";
  HighBP: 0 | 1 | "";
  HighChol: 0 | 1 | "";
  CholCheck: 0 | 1 | "";
  Smoker: 0 | 1 | "";
  Stroke: 0 | 1 | "";
  HeartDiseaseorAttack: 0 | 1 | "";
  PhysActivity: 0 | 1 | "";
  Fruits: 0 | 1 | "";
  Veggies: 0 | 1 | "";
  HvyAlcoholConsump: 0 | 1 | "";
  AnyHealthcare: 0 | 1 | "";
  NoDocbcCost: 0 | 1 | "";
  DiffWalk: 0 | 1 | "";
  Sex: 0 | 1 | "";
  GenHlth: number | "";
  Age: number | "";
  Education: number | "";
  Income: number | "";
};

const EMPTY: Form = {
  BMI: "", MentHlth: "", PhysHlth: "", HighBP: "", HighChol: "", CholCheck: "",
  Smoker: "", Stroke: "", HeartDiseaseorAttack: "", PhysActivity: "", Fruits: "",
  Veggies: "", HvyAlcoholConsump: "", AnyHealthcare: "", NoDocbcCost: "", DiffWalk: "",
  Sex: "", GenHlth: "", Age: "", Education: "", Income: "",
};

const AGE_BUCKETS = [
  { value: 1, label: "18–24" }, { value: 2, label: "25–29" }, { value: 3, label: "30–34" },
  { value: 4, label: "35–39" }, { value: 5, label: "40–44" }, { value: 6, label: "45–49" },
  { value: 7, label: "50–54" }, { value: 8, label: "55–59" }, { value: 9, label: "60–64" },
  { value: 10, label: "65–69" }, { value: 11, label: "70–74" }, { value: 12, label: "75–79" },
  { value: 13, label: "80+" },
];

// Categorías del cuestionario original (BRFSS 2015) en el que se entrenó el
// modelo — no son inventadas, hay que respetarlas para que la predicción
// tenga sentido. Fuente: CDC BRFSS 2015 Codebook (EDUCA / INCOME2).
const EDUCATION_OPTIONS = [
  { value: 1, label: "Nunca fui a la escuela / solo preescolar" },
  { value: 2, label: "Primaria (1° a 8° grado)" },
  { value: 3, label: "Algo de secundaria (9° a 11°, sin graduarme)" },
  { value: 4, label: "Secundaria completa (bachillerato o equivalente)" },
  { value: 5, label: "Estudios superiores incompletos (técnico o universidad sin terminar)" },
  { value: 6, label: "Universidad completa (4+ años)" },
];

const INCOME_OPTIONS = [
  { value: 1, label: "Menos de $10,000" },
  { value: 2, label: "$10,000 a $14,999" },
  { value: 3, label: "$15,000 a $19,999" },
  { value: 4, label: "$20,000 a $24,999" },
  { value: 5, label: "$25,000 a $34,999" },
  { value: 6, label: "$35,000 a $49,999" },
  { value: 7, label: "$50,000 a $74,999" },
  { value: 8, label: "$75,000 o más" },
];

// Para poder decir exactamente qué falta cuando el botón está deshabilitado
// — antes se quedaba en gris sin ninguna pista de qué campo revisar.
const FIELD_LABELS: Record<keyof Form, string> = {
  BMI: "IMC", MentHlth: "Días de estrés/tristeza", PhysHlth: "Días enfermo o con dolor",
  HighBP: "Presión arterial alta", HighChol: "Colesterol alto", CholCheck: "Revisión de colesterol",
  Smoker: "Historial de tabaquismo", Stroke: "Antecedente de ACV",
  HeartDiseaseorAttack: "Antecedente de enfermedad cardíaca", PhysActivity: "Actividad física",
  Fruits: "Consumo de fruta", Veggies: "Consumo de vegetales", HvyAlcoholConsump: "Consumo de alcohol",
  AnyHealthcare: "Seguro/cobertura de salud", NoDocbcCost: "No fuiste al médico por el costo",
  DiffWalk: "Dificultad para caminar", Sex: "Sexo", GenHlth: "Salud general", Age: "Edad",
  Education: "Nivel educativo", Income: "Rango de ingresos",
};

export default function LifestyleForm() {
  const router = useRouter();
  const [form, setForm] = useState<Form>(EMPTY);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [bmiModalOpen, setBmiModalOpen] = useState(false);

  const set = <K extends keyof Form>(key: K) => (v: Form[K]) => setForm((f) => ({ ...f, [key]: v }));

  const missingFields = (Object.keys(form) as (keyof Form)[]).filter((k) => form[k] === "");
  const isComplete = missingFields.length === 0;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!isComplete) return;
    setLoading(true);
    setError(null);

    try {
      const payload = form as Record<string, number>;
      const result = await predictLifestyle(payload);
      saveLastPredictionResult(result);
      router.push("/result");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Algo salió mal. Intenta de nuevo.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="mx-auto max-w-2xl px-6 py-16">
      <p className="text-sm font-semibold uppercase tracking-widest text-emerald-600 dark:text-emerald-400">
        Módulo · Estilo de vida
      </p>
      <h1 className="mt-2 text-3xl font-bold text-slate-900 dark:text-slate-50">Cuéntanos sobre ti</h1>
      <p className="mt-2 text-slate-500 dark:text-slate-400">
        Ningún dato de laboratorio necesario. Todo tiene una estimación razonable si no lo sabes
        con exactitud. Si un campo no queda claro, toca el círculo con la "i" junto a la pregunta.
      </p>

      <FormProgress done={Object.keys(EMPTY).length - missingFields.length} total={Object.keys(EMPTY).length} />

      <form onSubmit={handleSubmit} className="mt-10 space-y-6">
        <FormSection title="Medidas básicas">
          <NumberField
            label="IMC (índice de masa corporal)"
            info="Fórmula: IMC = peso en kilogramos ÷ (estatura en metros)². Por ejemplo, 70 kg y 1.70 m dan un IMC de 70 ÷ (1.70 × 1.70) ≈ 24.2."
            min={12}
            max={70}
            step={0.1}
            value={form.BMI}
            onChange={set("BMI")}
          >
            {form.BMI !== "" && (
              <span
                className="mt-1.5 inline-block rounded-full px-2.5 py-0.5 text-xs font-semibold"
                style={{ color: bmiCategory(form.BMI).color, backgroundColor: bmiCategory(form.BMI).bg }}
              >
                {bmiCategory(form.BMI).label}
              </span>
            )}
            <button
              type="button"
              onClick={() => setBmiModalOpen(true)}
              className="mt-1.5 block cursor-pointer text-xs font-semibold text-blue-600 hover:underline dark:text-blue-400"
            >
              ¿No sabes tu IMC? Calcúlalo aquí →
            </button>
          </NumberField>
          <SelectField
            label="¿En qué rango de edad estás?"
            info="Rango de edad en grupos de 5 años, tal como lo pide el cuestionario original en el que se entrenó el modelo."
            value={form.Age}
            onChange={set("Age")}
            options={AGE_BUCKETS}
          />
          <SelectField
            label="¿Cuál es tu sexo?"
            info="Sexo registrado al nacer, tal como lo pide el cuestionario original."
            value={form.Sex}
            onChange={set("Sex")}
            options={[{ value: 1, label: "Hombre" }, { value: 0, label: "Mujer" }]}
          />
        </FormSection>

        <FormSection title="Salud percibida">
          <SelectField
            label="¿Cómo describirías tu salud general?"
            info="Tu propia percepción general, no un diagnóstico médico concreto."
            value={form.GenHlth}
            onChange={set("GenHlth")}
            options={[
              { value: 1, label: "Excelente" }, { value: 2, label: "Muy buena" },
              { value: 3, label: "Buena" }, { value: 4, label: "Regular" }, { value: 5, label: "Mala" },
            ]}
          />
          <NumberField
            label="En el último mes, ¿cuántos días te sentiste estresado, triste o ansioso?"
            info="Piensa en los últimos 30 días: cuenta los días en que te sentiste mal de ánimo, con estrés, ansiedad o angustia — aunque haya sido solo un rato ese día. Si no recuerdas ninguno, pon 0."
            min={0}
            max={30}
            value={form.MentHlth}
            onChange={set("MentHlth")}
          />
          <NumberField
            label="En el último mes, ¿cuántos días te sentiste enfermo o con dolor físico?"
            info="Piensa en los últimos 30 días: cuenta los días en que tuviste algún malestar del cuerpo — dolor, gripe, lesión, cansancio fuera de lo normal, etc. No cuentes lo que ya respondiste sobre tu ánimo. Si no recuerdas ninguno, pon 0."
            min={0}
            max={30}
            value={form.PhysHlth}
            onChange={set("PhysHlth")}
          />
          <YesNoField
            label="¿Tienes dificultad seria para caminar o subir escaleras?"
            info="Una dificultad sostenida en el tiempo, no un tropiezo puntual."
            value={form.DiffWalk}
            onChange={set("DiffWalk")}
          />
        </FormSection>

        <FormSection title="Antecedentes médicos">
          <YesNoField
            label="¿Un profesional de salud te ha dicho que tienes la presión arterial alta?"
            info="También conocida como hipertensión."
            value={form.HighBP}
            onChange={set("HighBP")}
          />
          <YesNoField
            label="¿Un profesional de salud te ha dicho que tienes el colesterol alto?"
            value={form.HighChol}
            onChange={set("HighChol")}
          />
          <YesNoField
            label="¿Te han revisado el colesterol en los últimos 5 años?"
            info="Un análisis de sangre para medir el colesterol en ese período, sin importar el resultado."
            value={form.CholCheck}
            onChange={set("CholCheck")}
          />
          <YesNoField
            label="¿Alguna vez un médico te diagnosticó un ACV (accidente cerebrovascular)?"
            info="Es una condición de la que muchas personas se recuperan y viven con normalidad — se pregunta solo como antecedente para el cálculo, no implica nada sobre tu estado actual."
            value={form.Stroke}
            onChange={set("Stroke")}
          />
          <YesNoField
            label="¿Alguna vez tuviste un ataque cardíaco o enfermedad coronaria diagnosticada?"
            info="Es una condición tratable de la que mucha gente vive bien después — se pregunta solo como antecedente para el cálculo."
            value={form.HeartDiseaseorAttack}
            onChange={set("HeartDiseaseorAttack")}
          />
        </FormSection>

        <FormSection title="Hábitos">
          <YesNoField
            label="¿Has fumado al menos 100 cigarrillos en toda tu vida?"
            info="Es la definición estándar de 'fumador' en encuestas de salud (100 cigarrillos ≈ 5 cajetillas). No importa si fumas actualmente o lo dejaste hace tiempo."
            value={form.Smoker}
            onChange={set("Smoker")}
          />
          <YesNoField
            label="¿Consumes alcohol en exceso?"
            info="Definición estándar: más de 14 tragos por semana en hombres, o más de 7 tragos por semana en mujeres."
            value={form.HvyAlcoholConsump}
            onChange={set("HvyAlcoholConsump")}
          />
          <YesNoField
            label="¿Hiciste actividad física en los últimos 30 días?"
            info="Cualquier ejercicio o actividad física fuera de tu trabajo habitual (caminar, deporte, gimnasio, etc.)."
            value={form.PhysActivity}
            onChange={set("PhysActivity")}
          />
          <YesNoField
            label="¿Comes fruta al menos una vez al día?"
            info="Pensando en un día típico, no solo en hoy."
            value={form.Fruits}
            onChange={set("Fruits")}
          />
          <YesNoField
            label="¿Comes vegetales al menos una vez al día?"
            info="Pensando en un día típico, no solo en hoy."
            value={form.Veggies}
            onChange={set("Veggies")}
          />
        </FormSection>

        <FormSection title="Acceso a salud y contexto">
          <YesNoField
            label="¿Tienes algún seguro o cobertura de salud?"
            info="Cualquier tipo de seguro médico, público o privado, o cobertura equivalente."
            value={form.AnyHealthcare}
            onChange={set("AnyHealthcare")}
          />
          <YesNoField
            label="¿En el último año dejaste de ir al médico por el costo?"
            info="Si en los últimos 12 meses necesitaste ver a un médico pero no fuiste por el dinero que costaba."
            value={form.NoDocbcCost}
            onChange={set("NoDocbcCost")}
          />
          <SelectField
            label="¿Cuál es el nivel educativo más alto que completaste?"
            info="En las categorías del cuestionario original en el que se entrenó el modelo."
            value={form.Education}
            onChange={set("Education")}
            options={EDUCATION_OPTIONS}
          />
          <SelectField
            label="¿En qué rango están tus ingresos anuales?"
            info="Ingreso anual total del hogar, en dólares estadounidenses (así lo define el cuestionario original de EE. UU.). Si no vives en EE. UU., elige el rango que más se acerque a tu situación económica relativa. Esto ayuda al modelo porque el acceso a alimentación y atención médica varía con el ingreso — no se usa para nada más."
            value={form.Income}
            onChange={set("Income")}
            options={INCOME_OPTIONS}
          />
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
          className="w-full cursor-pointer rounded-full bg-gradient-to-r from-emerald-600 to-blue-600 py-3.5 font-semibold text-white shadow-md transition-transform duration-200 ease-[cubic-bezier(0.16,1,0.3,1)] hover:scale-[1.01] active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:scale-100"
        >
          {loading ? "Calculando…" : "Ver mi estimación de riesgo"}
        </button>
        <p className="text-center text-xs text-slate-400 dark:text-slate-500">
          Esta plataforma ofrece una estimación orientativa, no un diagnóstico médico.
        </p>
      </form>

      <BmiCalculatorModal
        open={bmiModalOpen}
        onClose={() => setBmiModalOpen(false)}
        onApply={(bmi) => set("BMI")(bmi)}
      />
    </main>
  );
}
