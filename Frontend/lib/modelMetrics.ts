// Métricas REALES de desempeño del modelo desplegado, medidas en el set de
// TEST (nunca visto durante entrenamiento, ajuste de umbral ni calibración)
// — no son estimaciones ni valores de ejemplo. Vienen de
// `Backend/api/models/metrics.json` (test_metrics_DEPLOYED). Cambian solo si
// se reentrena el modelo — ver ml/src/optimize_lifestyle.py para lifestyle.
//
// lifestyle va por su segunda re-optimización (v2): ingeniería de 12 features
// derivadas de dominio dentro del preprocesador, búsqueda de 200 iteraciones
// optimizando PR-AUC, calibración isotonic, y umbral elegido en validación por
// F1 máximo (empate resuelto por mayor recall). Evolución en test:
//   original  -> P=28.9% R=89.0% F1=43.6% acc=60.2%
//   v1        -> P=33.8% R=78.9% F1=47.3% acc=69.6%
//   v2 (hoy)  -> P=40.1% R=65.2% F1=49.7% acc=77.1%
// Ver ml/reports/metrics/lifestyle_v2_results.json.
export type ModuleMetrics = {
  accuracy: number;
  precision: number;
  recall: number;
  f1: number;
  rocAuc: number;
};

export const MODEL_METRICS: Record<"lifestyle" | "clinical", ModuleMetrics> = {
  lifestyle: {
    accuracy: 0.7714,
    precision: 0.4010,
    recall: 0.6523,
    f1: 0.4967,
    rocAuc: 0.8132,
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
    help: "De todos los casos reales de riesgo en el set de prueba, qué % detectó el modelo. El umbral de decisión se eligió buscando el mejor equilibrio con la precisión: detectar la mayoría de los casos reales sin llenar de falsas alarmas a quien no las necesita.",
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
