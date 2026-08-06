# Re-optimización del módulo Lifestyle (XGBoost) — Resultados

> Generado a partir de `ml/reports/metrics/lifestyle_reopt_*.json` y
> `ml/reports/figures/lifestyle_reopt_*.png`. Reproducible con
> `ml/src/optimize_lifestyle.py` + `ml/src/deploy_lifestyle_reopt.py`.

## 0. Por qué se hizo esto

El modelo desplegado (antes de este trabajo) tenía Recall=89.0% pero
Precision=28.9% (F1=43.6%) — no por un problema del algoritmo, sino porque
`ml/src/finalize.py` elegía **a propósito** el umbral que maximizaba Recall
(`RECALL_TARGET = 0.90`, ver el comentario en ese archivo), sacrificando
precisión sin límite. Esta re-optimización busca un mejor equilibrio
Precision/F1 **sin bajar el Recall de ~80%**.

## 1. Verificación de datos

- 253,680 filas crudas, 0 nulos, 23,899 duplicados (ya eliminados en
  `prep_lifestyle.py`), 584 valores de BMI fisiológicamente imposibles
  imputados con la mediana.
- Desbalance real: **17.29% positivos** (~1:4.79), igual en train/val/test
  (estratificación correcta).
- Split 70/15/15 hecho **antes** de cualquier `fit_transform` → sin fuga de
  datos. Verificado además que el overlap de filas idénticas entre train y
  test es de 419/34,468 (1.2%) — esperable por la baja cardinalidad de las
  ~21 variables categóricas/ordinales de BRFSS (personas distintas con
  respuestas idénticas en todos los campos), **no** es una fuga del split.

## 2. Estrategias de desbalance comparadas (5-fold CV en TRAIN, umbral 0.5)

| Estrategia | F1 | PR-AUC | Precision | Recall | ROC-AUC |
|---|---|---|---|---|---|
| `scale_pos_weight` (ratio natural) | **0.4769 ± 0.0022** | 0.4498 | 0.3488 | 0.7534 | 0.8041 |
| `class_weight` (sample_weight balanceado) | 0.4766 ± 0.0021 | 0.4507 | 0.3484 | 0.7541 | 0.8045 |
| SMOTE (solo en fold de train) | 0.3181 ± 0.0073 | 0.4524 | 0.5603 | 0.2221 | 0.8062 |

**Ganadora: `scale_pos_weight`.** Para XGBoost, `scale_pos_weight` y
`class_weight` (vía `sample_weight` balanceado) son **matemáticamente
equivalentes** — ambos reescalan el gradiente de la clase positiva por el
mismo factor; la diferencia de 0.0003 en F1 es ruido de muestreo, no una
diferencia real de mecanismo. SMOTE da peor F1 a umbral fijo 0.5 (porque su
distribución de probabilidades se desplaza distinto y necesitaría su propio
umbral), pero su PR-AUC es comparable — se documenta como matiz honesto, no
se combinó SMOTE con `scale_pos_weight` a la vez porque duplicaría la
corrección de balance sin justificación.

## 3. Búsqueda de hiperparámetros

`RandomizedSearchCV` (80 iteraciones × `StratifiedKFold(5)`, refit por F1,
scoring simultáneo de F1/PR-AUC/ROC-AUC/Precision/Recall):

```
n_estimators=185, max_depth=3, learning_rate=0.1555, min_child_weight=3,
subsample=0.9654, colsample_bytree=0.5887, gamma=3.753,
reg_alpha=0.0308, reg_lambda=1.2754, scale_pos_weight=2.874
```

`scale_pos_weight` encontrado (2.87) está **muy por debajo** del ratio
natural (4.79) — esta es la palanca principal que mejora precisión sin
retirar toda la corrección de desbalance.

CV en el mejor punto: F1=0.4923±0.0033, PR-AUC=0.4594±0.0045,
Precision=0.4122±0.0026, Recall=0.6111±0.0055, ROC-AUC=0.8089±0.0028.

**Early stopping:** fit final sobre un split adicional de TRAIN (85/15,
nunca el val oficial ni test), `eval_metric=aucpr`,
`early_stopping_rounds=30`, techo de 800 árboles → mejor iteración: **128**.

## 4. Barrido de umbrales (VAL, restricción Recall ≥ 80%)

Tabla completa (91 umbrales, 0.05 a 0.95) en
`lifestyle_reopt_04_threshold_table_raw_optimized.csv`. Con la restricción de
Recall≥80%, el umbral que maximiza F1 **y** el que maximiza Precision
coinciden en el mismo punto (0.36): dentro de la región permitida, más
precisión sólo se consigue subiendo el umbral, y subirlo más allá de 0.36
rompe la restricción de recall — por eso ambos criterios convergen al mismo
umbral límite.

| Umbral | Precision | Recall | F1 | Specificity | FP | FN |
|---|---|---|---|---|---|---|
| 0.36 (max F1 y max Precision, recall≥80%) | 0.342 | 0.800 | 0.479 | 0.678 | 9170 | 1190 |

## 5. Calibración de probabilidades (VAL)

| Método | Brier Score | Umbral propio | F1 | Precision | Recall | PR-AUC |
|---|---|---|---|---|---|---|
| Sin calibrar | 0.14301 | 0.360 | 0.4793 | 0.3421 | 0.8003 | 0.4647 |
| Sigmoid (Platt) | 0.11486 | 0.130 | 0.4742 | 0.3342 | 0.8157 | 0.4647 |
| **Isotonic** | **0.11427** | 0.150 | 0.4774 | 0.3384 | 0.8100 | 0.4600 |

Isotonic gana en Brier Score (**20% mejor** que sin calibrar) con una caída
de F1 de apenas 0.0019 (0.19 puntos porcentuales) — se recomienda y despliega.
Verificado que el cálculo manual (`IsotonicRegression`/`LogisticRegression`
ajustados sobre las probabilidades del modelo) coincide con
`CalibratedClassifierCV(cv="prefit")`: diferencia máxima 0.00 para isotonic,
2.44e-3 para sigmoid (por la regularización L2 por defecto de
`LogisticRegression`, sin impacto porque isotonic es la opción desplegada).

El calibrador se guarda **aparte** del modelo XGBoost (no se envuelve con
`CalibratedClassifierCV` en producción) porque SHAP `TreeExplainer` necesita
el booster de XGBoost directo — un wrapper de calibración no expone
`get_booster()`.

## 6. Comparación final en TEST (una sola pasada)

| Modelo | Acc | Precision | Recall | Specificity | F1 | ROC-AUC | PR-AUC | Brier | TP/TN/FP/FN |
|---|---|---|---|---|---|---|---|---|---|
| A. XGBoost original @0.50 | 0.716 | 0.349 | 0.746 | 0.709 | 0.476 | 0.807 | 0.466 | 0.177 | 4444/20222/8287/1515 |
| B. XGBoost optimizado @0.50 | 0.785 | 0.416 | 0.605 | 0.822 | 0.493 | 0.812 | 0.474 | 0.142 | 3606/23445/5064/2353 |
| C. XGBoost optimizado @umbral (0.36) | 0.703 | 0.342 | 0.779 | 0.687 | 0.475 | 0.812 | 0.474 | 0.142 | 4643/19573/8936/1316 |
| **D. XGBoost calibrado @umbral (0.15) — DESPLEGADO** | 0.696 | **0.338** | **0.789** | 0.677 | **0.473** | 0.812 | 0.464 | **0.115** | 4702/19300/9209/1257 |
| E. Regresión logística base @0.50 | 0.722 | 0.354 | 0.740 | 0.718 | 0.479 | 0.806 | 0.458 | 0.181 | 4408/20467/8042/1551 |

**Antes vs. ahora (lo que corre en producción):**

| | Antes (thr=0.346) | Ahora (D, thr=0.15) | Cambio |
|---|---|---|---|
| Accuracy | 60.2% | 69.6% | +9.4 pp |
| Precision | 28.9% | 33.8% | **+4.9 pp (+17% relativo)** |
| Recall | 89.0% | 78.9% | −10.1 pp |
| F1 | 43.6% | 47.3% | **+3.7 pp (+8.5% relativo)** |
| ROC-AUC | 81.2% | 81.2% | igual (mismo techo del dataset) |
| Brier Score | no calculado antes | 0.115 | probabilidades ahora confiables |

Nota honesta: el recall en TEST (78.9%) quedó levemente por debajo del 80%
objetivo (que sí se cumplió exactamente en VAL, 80.0%) — es la brecha normal
de generalización val→test en una muestra de ~34K filas; el umbral se
seleccionó **solo con VAL**, nunca con test, tal como se pidió.

## 7. Validación de estabilidad

`StratifiedKFold(10)` sobre TRAIN+VAL combinados (68,935 filas), a umbral
fijo 0.5, mismos hiperparámetros ganadores:

| Métrica | Media | Desv. estándar |
|---|---|---|
| Precision | 0.4137 | 0.0051 |
| Recall | 0.6138 | 0.0059 |
| F1 | 0.4943 | 0.0052 |
| ROC-AUC | 0.8102 | 0.0027 |
| PR-AUC | 0.4610 | 0.0063 |

Desviaciones estándar muy pequeñas frente a las medias (~1% relativo) — la
mejora es estable, no depende de una partición particular.

## 8. Limitación honesta del dataset

Los 8 algoritmos base (logreg, dtree, rf, svm, knn, gboost, xgboost,
lightgbm — ver `ml/reports/metrics/metrics_lifestyle.json`) convergen **todos**
a F1≈0.45-0.49 en su umbral F1-óptimo, sin importar el algoritmo. Esto es
evidencia fuerte de que el techo de separabilidad lo pone el **dataset**
(BRFSS es una encuesta autorreportada, con ruido inherente — "¿comes fruta al
menos una vez al día?" no captura toda la señal real de riesgo de diabetes),
no la elección o el ajuste del modelo. **No se puede prometer F1/Precision
por encima de ~50% con estas variables sin datos de laboratorio** (por eso el
módulo "clinical", que sí tiene HbA1c y glucosa, llega a F1=65%).

## 9. Cambios en la interfaz

- `risk_score` ahora es una probabilidad **calibrada** (isotonic) — el
  Brier Score confirma que se acerca más a la frecuencia real observada.
- Se agregó `threshold_used` a la respuesta de la API y se muestra en
  `/result`: "Categoría asignada con un umbral de 15% de probabilidad,
  elegido para detectar al menos 8 de cada 10 casos reales de riesgo."
- Se agregó una aclaración junto a los factores SHAP: influencia sobre
  **esta predicción del modelo**, no causalidad.
- Las 5 métricas mostradas en `/result` (`Frontend/lib/modelMetrics.ts`) se
  actualizaron con los números reales de la tabla de la sección 6 (fila D).

## 10. Cómo reproducir / re-entrenar

```bash
conda activate diabetes
cd ml/src

# 1. Re-corre todo el pipeline de optimización (verificación de datos,
#    comparación de desbalance, búsqueda de hiperparámetros, early stopping,
#    barrido de umbrales, calibración, evaluación final, estabilidad, gráficas)
python optimize_lifestyle.py       # ~2 minutos en un Mac de 12 núcleos

# 2. Copia los artefactos ganadores a Backend/api/models/
python deploy_lifestyle_reopt.py

# 3. Reconstruye el backend Docker para que la API sirva el modelo nuevo
cd ../..
docker compose build backend && docker compose up -d
```

Todo el proceso es determinista (`RANDOM_STATE = 42` en `ml/src/common.py`,
usado en el split, el CV y el fit final).

### Dependencias usadas (ya en `requirements.txt`)

`numpy`, `pandas`, `scikit-learn==1.7.2`, `xgboost==2.1.4`,
`imbalanced-learn`, `shap`, `matplotlib`, `joblib`.

### Archivos entregables

- Código: `ml/src/optimize_lifestyle.py`, `ml/src/deploy_lifestyle_reopt.py`
- Modelo final: `Backend/api/models/model_lifestyle.joblib` (XGBoost crudo,
  para SHAP) + `Backend/api/models/calibrator_lifestyle.joblib` (isotonic)
- Umbral: `Backend/api/models/feature_schema_lifestyle.json` →
  `deployed_threshold`
- Función de predicción integrada: `Backend/api/services/predict.py` →
  `predict_lifestyle()` (ya devuelve `risk_score` calibrado + `threshold_used`)
- Gráficas: `ml/reports/figures/lifestyle_reopt_*.png` (matriz de confusión,
  ROC, PR, curva de calibración)
- Métricas completas (JSON): `ml/reports/metrics/lifestyle_reopt_*.json`
