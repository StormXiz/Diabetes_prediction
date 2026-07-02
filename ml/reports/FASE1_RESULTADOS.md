# Fase 1 — Resultados de Minería de Datos + IA

> Generado automáticamente a partir de `ml/reports/metrics/*.json`. Reproducible con los scripts en `ml/src/`.

## 1. Limpieza de datos

### Módulo A — Lifestyle (BRFSS 2015)
- Filas originales: **253,680**
- Duplicados eliminados: **23,899**
- Filas tras deduplicar: **229,781**
- Target binarizado: `Diabetes_012` (0/1/2) → `Diabetes_binary` (0 = sin diabetes, 1 = prediabetes o diabetes)
- BMI fuera de rango fisiológico (12–70) imputado con mediana: **584** filas
- Outliers de BMI (IQR): **5054** (límites [12.0, 44.0])
- Tasa de positivos: **17.29%** (fuerte desbalance)
- Split 70/15/15 → train=160,846 / val=34,467 / test=34,468

### Módulo B — Clinical (Diabetes Prediction Dataset)
- Filas originales: **100,000**
- Duplicados eliminados: **3,854**
- Filas tras deduplicar: **96,146**
- `smoking_history == "No Info"` → recodificado a categoría explícita `unknown` (no se descartó la fila)
- Valores imposibles imputados con mediana: {"bmi": 9, "HbA1c_level": 0, "blood_glucose_level": 0, "age": 0}
- Outliers de BMI winsorizados (IQR): **5354**
- Tasa de positivos: **8.82%** (desbalance fuerte, ~1:10)
- Split 70/15/15 → train=67,302 / val=14,422 / test=14,422

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
| Modelo | Recall | Precision | F1 | ROC-AUC | Accuracy | Tiempo fit (s) | Filas train usadas |
|---|---|---|---|---|---|---|---|
| gboost | 0.6144 | 0.4124 | 0.4935 | 0.8123 | 0.7820 | 10.51 | 160846 |
| lightgbm | 0.6152 | 0.4029 | 0.4869 | 0.8074 | 0.7758 | 0.64 | 160846 |
| xgboost | 0.6174 | 0.4050 | 0.4891 | 0.8073 | 0.7770 | 0.49 | 160846 |
| logreg | 0.6075 | 0.4066 | 0.4871 | 0.8061 | 0.7789 | 0.14 | 160846 |
| rf | 0.5863 | 0.4075 | 0.4808 | 0.8046 | 0.7811 | 4.14 | 160846 |
| dtree | 0.6558 | 0.3790 | 0.4804 | 0.7924 | 0.7548 | 0.21 | 160846 |
| svm | 0.6598 | 0.3640 | 0.4692 | 0.7850 | 0.7418 | 2.24 | 6000 |
| knn | 0.5907 | 0.3590 | 0.4466 | 0.7551 | 0.7469 | 0.00 | 30000 |

### Módulo B — Clinical
| Modelo | Recall | Precision | F1 | ROC-AUC | Accuracy | Tiempo fit (s) | Filas train usadas |
|---|---|---|---|---|---|---|---|
| gboost | 0.7170 | 0.9470 | 0.8161 | 0.9799 | 0.9715 | 4.32 | 67302 |
| xgboost | 0.7068 | 0.9688 | 0.8173 | 0.9776 | 0.9721 | 0.20 | 67302 |
| rf | 0.7138 | 0.9498 | 0.8151 | 0.9763 | 0.9714 | 1.55 | 67302 |
| dtree | 0.7005 | 0.9878 | 0.8197 | 0.9746 | 0.9728 | 0.06 | 67302 |
| lightgbm | 0.6942 | 0.9966 | 0.8184 | 0.9744 | 0.9728 | 0.28 | 67302 |
| logreg | 0.6745 | 0.8346 | 0.7461 | 0.9636 | 0.9595 | 0.10 | 67302 |
| svm | 0.7248 | 0.6276 | 0.6727 | 0.9522 | 0.9378 | 0.81 | 6000 |
| knn | 0.6478 | 0.8757 | 0.7447 | 0.9448 | 0.9608 | 0.01 | 30000 |

## 4. Optimización de hiperparámetros

Se aplicó `RandomizedSearchCV` (StratifiedKFold=3, scoring=ROC-AUC, optimizado solo en TRAIN) sobre los
2–3 mejores modelos de cada dataset (XGBoost, LightGBM, GradientBoosting). Resultado: las diferencias
entre los top-3 modelos tras el tuning fueron marginales (<0.5 pts de ROC-AUC) en ambos datasets.

**Modelo final elegido para ambos módulos: XGBoost** (tree_method=hist), por ser top-2 en ROC-AUC tras
el tuning, tener inferencia rápida (crítico para la API) y soporte directo de SHAP (`TreeExplainer`)
para `top_factors`.

## 5. Métricas finales del modelo desplegado

### Módulo A — Lifestyle
- CV ROC-AUC (train): **0.8085**
- Umbral desplegado (recall objetivo 90%, alcanzado): **0.3459**
- Test @ umbral desplegado: recall=**0.8904**, precision=0.2890, f1=0.4363, ROC-AUC=0.8123
- Alternativa @ umbral F1-óptimo (0.5972): recall=0.6462, precision=0.3991, f1=0.4934

⚠️ **Limitación documentada:** el módulo Lifestyle usa exclusivamente variables de encuesta
autorreportadas (BRFSS), sin biomarcadores. La literatura publicada sobre este mismo dataset reporta
techos de ROC-AUC ~0.80–0.85 incluso con tuning extensivo — es una limitación de la información
disponible, no del modelado. Por eso se priorizó Recall (detectar el máximo de personas en riesgo)
aceptando una precisión más baja, coherente con el rol de "herramienta de orientación" (no diagnóstico)
que exige el plan.

### Módulo B — Clinical
- CV ROC-AUC (train): **0.9794** ✅ (>90%)
- Umbral desplegado (recall objetivo 90%, alcanzado): **0.5238**
- Test @ umbral desplegado: recall=**0.9112** ✅ (>90%), precision=0.5037, f1=0.6488, ROC-AUC=0.9799 ✅ (>90%)
- Alternativa @ umbral F1-óptimo (0.8408): recall=0.7327, precision=0.9040, f1=0.8094 (muy alta precisión, mejor F1)

El módulo Clínico **sí cumple la meta >90%** en Recall y ROC-AUC simultáneamente gracias a HbA1c y
glucosa (biomarcadores directamente ligados al diagnóstico real de diabetes).

## 6. Top factors (SHAP, TreeExplainer sobre XGBoost)

### Lifestyle
- **GenHlth**: 0.5284
- **BMI**: 0.4015
- **Age**: 0.3972
- **HighBP**: 0.3647
- **HighChol**: 0.2963
- **Income**: 0.1254
- **Sex**: 0.1129
- **CholCheck**: 0.0741

### Clinical
- **HbA1c_level**: 2.5553
- **blood_glucose_level**: 2.0653
- **age**: 0.7699
- **bmi**: 0.3737
- **smoking_history_unknown**: 0.1318
- **hypertension**: 0.1012
- **gender_Male**: 0.0718
- **heart_disease**: 0.0657

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
