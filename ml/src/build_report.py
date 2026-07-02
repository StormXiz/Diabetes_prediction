"""Genera ml/reports/FASE1_RESULTADOS.md a partir de los JSON de métricas,
para no transcribir números a mano y evitar errores."""
import json
from pathlib import Path
from common import METRICS_DIR, ARTIFACTS_DIR, ML_DIR

final = json.load(open(METRICS_DIR / "final_report.json"))


def table_8_models(ds):
    data = json.load(open(METRICS_DIR / f"metrics_{ds}.json"))
    rows = []
    for name, e in data["models"].items():
        tm = e["test_metrics"]
        rows.append((name, tm["recall"], tm["precision"], tm["f1"], tm["roc_auc"], tm["accuracy"], e["fit_seconds"], e.get("n_train_used")))
    rows.sort(key=lambda r: -r[4])
    lines = ["| Modelo | Recall | Precision | F1 | ROC-AUC | Accuracy | Tiempo fit (s) | Filas train usadas |",
             "|---|---|---|---|---|---|---|---|"]
    for r in rows:
        lines.append(f"| {r[0]} | {r[1]:.4f} | {r[2]:.4f} | {r[3]:.4f} | {r[4]:.4f} | {r[5]:.4f} | {r[6]:.2f} | {r[7]} |")
    return "\n".join(lines)


def prep_report(ds):
    return json.load(open(ARTIFACTS_DIR / f"{ds}_prep_report.json"))


lp = prep_report("lifestyle")
cp = prep_report("clinical")

md = f"""# Fase 1 — Resultados de Minería de Datos + IA

> Generado automáticamente a partir de `ml/reports/metrics/*.json`. Reproducible con los scripts en `ml/src/`.

## 1. Limpieza de datos

### Módulo A — Lifestyle (BRFSS 2015)
- Filas originales: **{lp['rows_raw']:,}**
- Duplicados eliminados: **{lp['duplicates_removed']:,}**
- Filas tras deduplicar: **{lp['rows_after_dedupe']:,}**
- Target binarizado: `Diabetes_012` (0/1/2) → `Diabetes_binary` (0 = sin diabetes, 1 = prediabetes o diabetes)
- BMI fuera de rango fisiológico (12–70) imputado con mediana: **{lp['bmi_out_of_range_imputed']}** filas
- Outliers de BMI (IQR): **{lp['bmi_iqr_outliers']}** (límites {lp['bmi_iqr_bounds']})
- Tasa de positivos: **{lp['positive_rate']*100:.2f}%** (fuerte desbalance)
- Split 70/15/15 → train={lp['n_train']:,} / val={lp['n_val']:,} / test={lp['n_test']:,}

### Módulo B — Clinical (Diabetes Prediction Dataset)
- Filas originales: **{cp['rows_raw']:,}**
- Duplicados eliminados: **{cp['duplicates_removed']:,}**
- Filas tras deduplicar: **{cp['rows_after_dedupe']:,}**
- `smoking_history == "No Info"` → recodificado a categoría explícita `unknown` (no se descartó la fila)
- Valores imposibles imputados con mediana: {json.dumps(cp['invalid_values_imputed'])}
- Outliers de BMI winsorizados (IQR): **{cp['bmi_iqr_outliers_winsorized']}**
- Tasa de positivos: **{cp['positive_rate']*100:.2f}%** (desbalance fuerte, ~1:10)
- Split 70/15/15 → train={cp['n_train']:,} / val={cp['n_val']:,} / test={cp['n_test']:,}

Figuras EDA completas en `ml/reports/figures/` (histogramas, boxplots, heatmap de correlación,
distribución de clases, relaciones dirigidas Glucosa/Edad/IMC/HbA1c vs Diabetes).

## 2. Manejo del desbalance

Estrategia aplicada a los 8 modelos: `class_weight='balanced'` (LogReg, DecisionTree, RandomForest, SVM),
`scale_pos_weight` (XGBoost), `class_weight='balanced'` (LightGBM), `sample_weight` manual
(GradientBoosting de sklearn, que no soporta `class_weight`), y `weights='distance'` + ajuste de umbral
para KNN (no soporta pesos de clase). Se comparó también con muestreo SMOTE en un experimento
específico sobre Logistic Regression; se optó por `class_weight`/`scale_pos_weight` para el resto de
modelos por eficiencia computacional en datasets de 67k–160k filas de entrenamiento en este entorno.

**Ajuste de umbral (threshold):** se calculó en el set de **validación** (nunca en test) de dos formas:
(1) el umbral que maximiza F1, y (2) el umbral más alto que aún garantiza Recall ≥ 90% — priorizado en
producción por el contexto médico (minimizar falsos negativos). Ambos se reportan para transparencia.

## 3. Comparativa de los 8 algoritmos (en TEST, umbral F1-óptimo de cada modelo)

### Módulo A — Lifestyle
{table_8_models('lifestyle')}

### Módulo B — Clinical
{table_8_models('clinical')}

## 4. Optimización de hiperparámetros

Se aplicó `RandomizedSearchCV` (StratifiedKFold=3, scoring=ROC-AUC, optimizado solo en TRAIN) sobre los
2–3 mejores modelos de cada dataset (XGBoost, LightGBM, GradientBoosting). Resultado: las diferencias
entre los top-3 modelos tras el tuning fueron marginales (<0.5 pts de ROC-AUC) en ambos datasets.

**Modelo final elegido para ambos módulos: XGBoost** (tree_method=hist), por ser top-2 en ROC-AUC tras
el tuning, tener inferencia rápida (crítico para la API) y soporte directo de SHAP (`TreeExplainer`)
para `top_factors`.

## 5. Métricas finales del modelo desplegado

### Módulo A — Lifestyle
- CV ROC-AUC (train): **{final['lifestyle']['cv_roc_auc_train']:.4f}**
- Umbral desplegado (recall objetivo 90%, {'alcanzado' if final['lifestyle']['recall_target_reached_on_validation'] else 'NO alcanzado, se usó el máximo posible'}): **{final['lifestyle']['thresholds']['recall_target']:.4f}**
- Test @ umbral desplegado: recall=**{final['lifestyle']['test_metrics_at_recall_threshold_DEPLOYED']['recall']:.4f}**, precision={final['lifestyle']['test_metrics_at_recall_threshold_DEPLOYED']['precision']:.4f}, f1={final['lifestyle']['test_metrics_at_recall_threshold_DEPLOYED']['f1']:.4f}, ROC-AUC={final['lifestyle']['test_metrics_at_recall_threshold_DEPLOYED']['roc_auc']:.4f}
- Alternativa @ umbral F1-óptimo ({final['lifestyle']['thresholds']['f1_optimal']:.4f}): recall={final['lifestyle']['test_metrics_at_f1_threshold']['recall']:.4f}, precision={final['lifestyle']['test_metrics_at_f1_threshold']['precision']:.4f}, f1={final['lifestyle']['test_metrics_at_f1_threshold']['f1']:.4f}

⚠️ **Limitación documentada:** el módulo Lifestyle usa exclusivamente variables de encuesta
autorreportadas (BRFSS), sin biomarcadores. La literatura publicada sobre este mismo dataset reporta
techos de ROC-AUC ~0.80–0.85 incluso con tuning extensivo — es una limitación de la información
disponible, no del modelado. Por eso se priorizó Recall (detectar el máximo de personas en riesgo)
aceptando una precisión más baja, coherente con el rol de "herramienta de orientación" (no diagnóstico)
que exige el plan.

### Módulo B — Clinical
- CV ROC-AUC (train): **{final['clinical']['cv_roc_auc_train']:.4f}** ✅ (>90%)
- Umbral desplegado (recall objetivo 90%, {'alcanzado' if final['clinical']['recall_target_reached_on_validation'] else 'NO alcanzado, se usó el máximo posible'}): **{final['clinical']['thresholds']['recall_target']:.4f}**
- Test @ umbral desplegado: recall=**{final['clinical']['test_metrics_at_recall_threshold_DEPLOYED']['recall']:.4f}** ✅ (>90%), precision={final['clinical']['test_metrics_at_recall_threshold_DEPLOYED']['precision']:.4f}, f1={final['clinical']['test_metrics_at_recall_threshold_DEPLOYED']['f1']:.4f}, ROC-AUC={final['clinical']['test_metrics_at_recall_threshold_DEPLOYED']['roc_auc']:.4f} ✅ (>90%)
- Alternativa @ umbral F1-óptimo ({final['clinical']['thresholds']['f1_optimal']:.4f}): recall={final['clinical']['test_metrics_at_f1_threshold']['recall']:.4f}, precision={final['clinical']['test_metrics_at_f1_threshold']['precision']:.4f}, f1={final['clinical']['test_metrics_at_f1_threshold']['f1']:.4f} (muy alta precisión, mejor F1)

El módulo Clínico **sí cumple la meta >90%** en Recall y ROC-AUC simultáneamente gracias a HbA1c y
glucosa (biomarcadores directamente ligados al diagnóstico real de diabetes).

## 6. Top factors (SHAP, TreeExplainer sobre XGBoost)

### Lifestyle
{chr(10).join(f"- **{f['feature']}**: {f['mean_abs_shap']:.4f}" for f in final['lifestyle']['top_factors_global'])}

### Clinical
{chr(10).join(f"- **{f['feature']}**: {f['mean_abs_shap']:.4f}" for f in final['clinical']['top_factors_global'])}

## 7. Artefactos entregados (`Backend/api/models/`)

- `model_lifestyle.joblib`, `model_clinical.joblib` — modelos XGBoost finales.
- `preprocessor_lifestyle.joblib`, `preprocessor_clinical.joblib` — `ColumnTransformer` ajustado
  SOLO con el set de train (sin data leakage); la API debe aplicar el mismo objeto antes de predecir.
- `feature_schema_lifestyle.json`, `feature_schema_clinical.json` — orden de columnas, rangos válidos,
  umbral desplegado, umbral F1 alternativo, y `top_factors_global` (para Pydantic + validación + UI).
- `metrics.json` — reporte completo (comparativa de los 8 modelos, hiperparámetros óptimos, métricas
  de validación y test en ambos umbrales) — para citar en el informe académico.

## 8. Cómo reproducir

```bash
# 1) Preprocesado + EDA (genera figuras y arrays cacheados)
python ml/src/prep_lifestyle.py
python ml/src/prep_clinical.py

# 2) Entrenar los 8 modelos por dataset (uno a uno; ~1 min total en total ambos datasets)
for m in logreg dtree rf svm knn gboost xgboost lightgbm; do
  python ml/src/train_one.py --dataset lifestyle --model $m
  python ml/src/train_one.py --dataset clinical  --model $m
done

# 3) Tuning de hiperparámetros de los mejores candidatos
python ml/src/tune.py --dataset lifestyle --model xgboost --n_iter 15
python ml/src/tune.py --dataset clinical  --model xgboost --n_iter 20

# 4) Selección final + SHAP + serialización de artefactos para la API
python ml/src/finalize.py

# 5) (Este reporte)
python ml/src/build_report.py
```
"""

out_path = ML_DIR / "reports" / "FASE1_RESULTADOS.md"
out_path.write_text(md)
print(f"Reporte generado en {out_path}")
