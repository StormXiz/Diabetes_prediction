// Paleta de categorías de riesgo compartida por /result/[id] y el panel admin.
// Una sola fuente para que nunca diverjan los colores entre ambas pantallas.
export const RISK_META = {
  low: { label: "Riesgo bajo", color: "#059669", bg: "#ecfdf5" },
  moderate: { label: "Riesgo moderado", color: "#d97706", bg: "#fffbeb" },
  high: { label: "Riesgo alto", color: "#dc2626", bg: "#fef2f2" },
} as const;

export type RiskCategory = keyof typeof RISK_META;

export function isRiskCategory(value: string): value is RiskCategory {
  return value === "low" || value === "moderate" || value === "high";
}
