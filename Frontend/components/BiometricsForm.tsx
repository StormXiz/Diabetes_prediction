"use client";

import { useState } from "react";
import { NumberField, SelectField } from "@/components/forms";
import { ACTIVITY_LABELS, type ActivityLevel, type Sex } from "@/lib/tdee";
import { saveLocalProfile, type Biometrics } from "@/lib/localProfile";

export type { Biometrics };

const ACTIVITY_OPTIONS = (Object.keys(ACTIVITY_LABELS) as ActivityLevel[]).map((v) => ({
  value: v,
  label: ACTIVITY_LABELS[v],
}));

export function BiometricsForm({
  initial,
  onSaved,
}: {
  initial?: Partial<Biometrics>;
  onSaved: (b: Biometrics, restrictions: string[]) => void;
}) {
  const [weight, setWeight] = useState<number | "">(initial?.weight_kg ?? "");
  const [height, setHeight] = useState<number | "">(initial?.height_cm ?? "");
  const [age, setAge] = useState<number | "">(initial?.age ?? "");
  const [sex, setSex] = useState<Sex | "">(initial?.sex ?? "");
  const [activity, setActivity] = useState<ActivityLevel | "">(initial?.activity_level ?? "");

  const isComplete = weight !== "" && height !== "" && age !== "" && sex !== "" && activity !== "";

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!isComplete) return;

    const bio: Biometrics = { weight_kg: weight, height_cm: height, age, sex, activity_level: activity };
    saveLocalProfile(bio, []);
    onSaved(bio, []);
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div>
        <h3 className="text-lg font-bold text-slate-900 dark:text-slate-50">Completa tus datos</h3>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          Los usamos solo para calcular tus calorías de mantenimiento (fórmula Mifflin-St Jeor) y
          armar tu plan semanal con porciones reales.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <NumberField label="Peso (kg)" min={30} max={250} step={0.5} value={weight} onChange={setWeight} />
        <NumberField label="Estatura (cm)" min={100} max={230} value={height} onChange={setHeight} />
        <NumberField label="Edad (años)" min={13} max={100} value={age} onChange={setAge} />
        <SelectField
          label="Sexo"
          info="Se usa en la fórmula de gasto calórico (Mifflin-St Jeor), que difiere ligeramente entre hombres y mujeres."
          value={sex}
          onChange={setSex}
          options={[
            { value: "male", label: "Hombre" },
            { value: "female", label: "Mujer" },
          ]}
        />
      </div>

      <SelectField
        label="Nivel de actividad física"
        value={activity}
        onChange={setActivity}
        options={ACTIVITY_OPTIONS}
      />

      <button
        type="submit"
        disabled={!isComplete}
        className="w-full cursor-pointer rounded-xl bg-gradient-to-r from-emerald-600 to-blue-600 py-3 font-semibold text-white shadow-md transition-transform duration-200 ease-[cubic-bezier(0.16,1,0.3,1)] hover:scale-[1.01] active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:scale-100"
      >
        Guardar y continuar
      </button>
    </form>
  );
}
