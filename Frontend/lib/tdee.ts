// Cálculo de gasto calórico con la fórmula de Mifflin-St Jeor (1990), el
// estándar más usado y validado para estimar BMR en población general —
// más preciso que Harris-Benedict para la mayoría de personas.
// Referencia: Mifflin MD et al., Am J Clin Nutr. 1990.

export type Sex = "male" | "female";
export type ActivityLevel = "sedentary" | "light" | "moderate" | "active" | "very_active";

export const ACTIVITY_LABELS: Record<ActivityLevel, string> = {
  sedentary: "Sedentario (poco o nada de ejercicio)",
  light: "Ligero (ejercicio 1-3 días/semana)",
  moderate: "Moderado (ejercicio 3-5 días/semana)",
  active: "Activo (ejercicio 6-7 días/semana)",
  very_active: "Muy activo (ejercicio intenso diario o trabajo físico)",
};

const ACTIVITY_FACTOR: Record<ActivityLevel, number> = {
  sedentary: 1.2,
  light: 1.375,
  moderate: 1.55,
  active: 1.725,
  very_active: 1.9,
};

export function calculateBMR(weightKg: number, heightCm: number, age: number, sex: Sex): number {
  const base = 10 * weightKg + 6.25 * heightCm - 5 * age;
  return sex === "male" ? base + 5 : base - 161;
}

export function calculateTDEE(
  weightKg: number,
  heightCm: number,
  age: number,
  sex: Sex,
  activityLevel: ActivityLevel,
): number {
  const bmr = calculateBMR(weightKg, heightCm, age, sex);
  return Math.round((bmr * ACTIVITY_FACTOR[activityLevel]) / 10) * 10;
}
