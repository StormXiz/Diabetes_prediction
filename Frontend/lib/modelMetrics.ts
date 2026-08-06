// Métricas REALES de desempeño del modelo desplegado, medidas en el set de
// TEST (nunca visto durante entrenamiento, ajuste de umbral ni calibración)
// — no son estimaciones ni valores de ejemplo. Vienen de
// `Backend/api/models/metrics.json` (test_metrics_DEPLOYED). Cambian solo si
// se reentrena el modelo — ver ml/src/optimize_lifestyle.py para lifestyle.
//
// lifestyle se re-optimizó (RandomizedSearchCV + calibración isotonic +
// umbral elegido en validación con restricción recall>=80%) para subir
// precisión/F1 sin soltar el recall por debajo de ~80%: antes
// precision=28.9%/recall=89.0%/f1=43.6%, ahora precision=33.8%/recall=78.9%/
// f1=47.3% — ver ml/reports/metrics/lifestyle_reopt_06_final_test_comparison.json.
export type ModuleMetrics = {
  accuracy: number;
  precision: number;
  recall: number;
  f1: number;
  rocAuc: number;
};

export const MODEL_METRICS: Record<"lifestyle" | "clinical", ModuleMetrics> = {
  lifestyle: {
    accuracy: 0.6960,
    precision: 0.3380,
    recall: 0.7891,
    f1: 0.4733,
    rocAuc: 0.8120,
  },
  clinical: {
    accuracy: 0.913,
    precision: 0.5037,
    recall: 0.9112,
    f1: 0.6488,
    rocAuc: 0.9799,
  },
};

export const MODEL_METRICS_LABELS: { key: keyof ModuleMetrics; label: string; help: string }[] = [
  {
    key: "accuracy",
    label: "Exactitud",
    help: "% de predicciones correctas (positivas y negativas) sobre el total del set de prueba.",
  },
  {
    key: "precision",
    label: "Precisión",
    help: "De todos los casos que el modelo marcó como riesgo, qué % realmente lo eran.",
  },
  {
    key: "recall",
    label: "Sensibilidad (Recall)",
    help: "De todos los casos reales de riesgo en el set de prueba, qué % detectó el modelo. El umbral de decisión se eligió para mantenerlo en ~80% o más — es peor no detectar un riesgo real que dar una alerta de más — sin sacrificar la precisión más de lo necesario.",
  },
  {
    key: "f1",
    label: "F1-score",
    help: "Balance entre precisión y sensibilidad en un solo número.",
  },
  {
    key: "rocAuc",
    label: "ROC-AUC",
    help: "Qué tan bien distingue el modelo entre casos con y sin riesgo, en general (1.0 = perfecto, 0.5 = azar).",
  },
];
