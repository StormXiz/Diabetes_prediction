// Categorías estándar de IMC (OMS) para adultos. Mismos colores que las
// categorías de riesgo en lib/risk.ts, para que el vocabulario visual de la
// app sea consistente (verde=bien, ámbar=atención, rojo=riesgo).
export function bmiCategory(bmi: number): { label: string; color: string; bg: string } {
  if (bmi < 18.5) return { label: "Bajo peso", color: "#2563eb", bg: "#eff6ff" };
  if (bmi < 25) return { label: "Peso normal", color: "#059669", bg: "#ecfdf5" };
  if (bmi < 30) return { label: "Sobrepeso", color: "#d97706", bg: "#fffbeb" };
  if (bmi < 35) return { label: "Obesidad (grado I)", color: "#dc2626", bg: "#fef2f2" };
  if (bmi < 40) return { label: "Obesidad (grado II)", color: "#dc2626", bg: "#fef2f2" };
  return { label: "Obesidad (grado III)", color: "#991b1b", bg: "#fef2f2" };
}
