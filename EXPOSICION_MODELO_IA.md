# Cómo funciona el sistema de IA — guía para la exposición

Este documento explica, en lenguaje claro y con el nivel de detalle técnico necesario para
defenderlo ante un profesor, **qué modelos de Inteligencia Artificial usa esta plataforma,
para qué se usa cada uno, y cómo funcionan por dentro**. Cubre los tres componentes de IA
del proyecto:

1. **Modelo de predicción — Módulo Estilo de Vida** (XGBoost)
2. **Modelo de predicción — Módulo Clínico** (XGBoost)
3. **Chatbot nutricional** (modelo de lenguaje de OpenAI)

---

## 1. Resumen ejecutivo (para la primera diapositiva)

| Componente | Qué hace | Algoritmo | Dónde vive |
|---|---|---|---|
| Predicción estilo de vida | Estima riesgo de diabetes tipo 2 a partir de 21 hábitos/factores de vida (sin análisis de sangre) | **XGBoost** (Gradient Boosted Trees) | `Backend/api/models/model_lifestyle.joblib` |
| Predicción clínica | Estima riesgo a partir de biomarcadores reales (HbA1c, glucosa, edad, IMC, etc.) | **XGBoost** (Gradient Boosted Trees) | `Backend/api/models/model_clinical.joblib` |
| Chatbot nutricional | Responde preguntas sobre el resultado y ajusta el plan de dieta según intolerancias | **GPT (OpenAI)**, modelo `gpt-5-mini` | `Frontend/app/api/chat/route.ts` |

Los dos modelos de predicción son **modelos de Machine Learning clásico** (no redes neuronales,
no deep learning) — específicamente **árboles de decisión potenciados por gradiente (Gradient
Boosting)**, entrenados sobre datos tabulares reales. El chatbot es el único componente que usa
un **modelo de lenguaje grande (LLM)** de terceros (OpenAI), y solo para conversación en lenguaje
natural, nunca para calcular el riesgo (el riesgo siempre lo calcula el modelo XGBoost propio).

---

## 2. ¿Por qué XGBoost y no una red neuronal?

Para ambos módulos de predicción se entrenaron y compararon **8 algoritmos distintos** sobre el
mismo dataset preprocesado, todos evaluados en el mismo set de test:

- Regresión Logística (`logreg`)
- Árbol de decisión (`dtree`)
- Random Forest (`rf`)
- Gradient Boosting de scikit-learn (`gboost`)
- **XGBoost** (`xgboost`)
- LightGBM (`lightgbm`)
- K-Nearest Neighbors (`knn`)
- Support Vector Machine (`svm`)

Se aplicó `RandomizedSearchCV` (búsqueda de hiperparámetros con validación cruzada
estratificada) sobre los 2-3 mejores candidatos de cada dataset. **XGBoost quedó en el top-2 de
ROC-AUC en ambos datasets** (las diferencias contra el primer lugar eran menores a 0.5 puntos), y
se eligió como modelo final por tres razones concretas:

1. **Inferencia rápida** — crítico porque el modelo corre en cada request de la API, no en batch.
2. **Soporte nativo para SHAP** (`TreeExplainer`) — permite calcular exactamente qué variables
   influyeron en CADA predicción individual (los "factores principales" que se muestran en el
   resultado), algo mucho más costoso/inestable con SVM o redes neuronales.
3. **Manejo nativo de desbalance de clases** (`scale_pos_weight`) — ambos datasets tienen muchos
   más casos negativos que positivos (17.3% positivos en Lifestyle, 8.8% en Clinical).

Una red neuronal (ANN) no se eligió para producción porque, en datos **tabulares** (filas y
columnas, no imágenes/texto/audio), los métodos de árboles con boosting sistemáticamente igualan
o superan a las redes neuronales simples, y son mucho más rápidos de entrenar/servir y más fáciles
de explicar. (Aparte de esta decisión de producción, en `ml/notebooks/ANN_vs_SVM_Clasificacion.ipynb`
existe una comparación específica ANN vs SVM con GridSearchCV, hecha como ejercicio comparativo
adicional — no es el modelo que corre en la API.)

### ¿Qué es un Gradient Boosted Tree (XGBoost), en una frase?

Es una **suma de muchos árboles de decisión pequeños y débiles**, entrenados uno tras otro, donde
cada árbol nuevo se enfoca en corregir los errores que cometieron los árboles anteriores. Ningún
árbol individual es muy bueno prediciendo por sí solo, pero la suma ponderada de cientos de ellos
(300 en este caso) sí lo es. Es el mismo principio de "wisdom of the crowd" que Random Forest,
pero en vez de que los árboles voten independientemente, se construyen secuencialmente y cada uno
aprende de los errores del anterior — por eso boosting suele superar a bagging (Random Forest) en
la práctica.

---

## 3. Módulo A — Predicción por Estilo de Vida

### Dataset
**BRFSS 2015** (Behavioral Risk Factor Surveillance System, CDC) — encuesta de salud de EE.UU.
- 253,680 filas originales → 229,781 tras eliminar duplicados exactos.
- Target original `Diabetes_012` (0=no, 1=prediabetes, 2=diabetes) binarizado a `Diabetes_binary`
  (0=no, 1=prediabetes o diabetes) para tratarlo como clasificación binaria.
- Tasa de positivos: 17.29% (desbalanceado).
- Split 70/15/15 (train / validación / test), sin fuga de datos entre conjuntos.

### Las 21 variables de entrada
Todas son autorreportadas por encuesta (nada de laboratorio): IMC, días de mala salud mental/física
(últimos 30 días), presión alta, colesterol alto, revisión de colesterol, tabaquismo, ACV,
enfermedad cardíaca, actividad física, consumo de frutas/vegetales, alcohol en exceso, cobertura de
salud, barrera de costo para ir al médico, dificultad para caminar, sexo, salud general percibida,
rango de edad (bucket BRFSS), educación e ingresos.

### Preprocesamiento
Un `ColumnTransformer` de scikit-learn (serializado en `preprocessor_lifestyle.joblib`), ajustado
**solo con el set de entrenamiento** para no filtrar información del test/validación al modelo:
escala las variables numéricas continuas (IMC, días de mala salud) y deja pasar las binarias/
ordinales tal cual (ya vienen codificadas 0/1 o en buckets desde el cuestionario original).

### Resultado del modelo
- ROC-AUC (validación cruzada en train): **0.8085**
- ROC-AUC en test: **0.8123**
- Umbral de decisión desplegado: **0.346** (no 0.5) — ver sección 5 para la razón.

⚠️ **Limitación honesta que hay que decir en la exposición:** un ROC-AUC de ~0.81 es el techo
esperado para este dataset específico — la literatura publicada sobre BRFSS 2015 reporta
techos similares (0.80-0.85) incluso con tuning extensivo, porque son solo variables
autorreportadas de encuesta, sin ningún biomarcador de sangre. No es una limitación del
modelado, es una limitación de la información disponible en el dataset.

---

## 4. Módulo B — Predicción Clínica

### Dataset
**Diabetes Prediction Dataset** (Kaggle) — 100,000 filas → 96,146 tras deduplicar.
- Variables: edad, sexo, IMC, HbA1c, glucosa en sangre, hipertensión, enfermedad cardíaca,
  historial de tabaquismo.
- Tasa de positivos: 8.82% (más desbalanceado aún que Lifestyle).
- Mismo split 70/15/15, mismo cuidado anti-fuga de datos.

### Preprocesamiento
`ColumnTransformer` (`preprocessor_clinical.joblib`): escala edad/IMC/HbA1c/glucosa con
`StandardScaler`, y codifica sexo e historial de tabaquismo con `OneHotEncoder`.

### Resultado del modelo
- ROC-AUC (validación cruzada en train): **0.9794** — mucho más alto que Lifestyle.
- ROC-AUC en test: **0.9799**
- Umbral de decisión desplegado: **0.524**

La razón de que este módulo sea tan superior en desempeño es simple: **HbA1c y glucosa en
sangre son, literalmente, los dos biomarcadores que la medicina usa para diagnosticar diabetes**
(criterios de la ADA — American Diabetes Association). El modelo no está "adivinando" a partir
de proxies indirectos como en Lifestyle, está viendo casi la misma información que un médico
usaría para diagnosticar.

### Un hallazgo real que vale la pena mencionar en la exposición

Al auditar el modelo clínico probando valores en todo el rango de HbA1c/glucosa, se encontró que
el **dataset de entrenamiento** tiene una relación casi de "escalón" con la etiqueta: la tasa de
diabetes es ~0% por debajo de HbA1c 5.7% o glucosa 126 mg/dL, se mantiene **plana en ~8%** en
todo el rango de prediabetes (HbA1c 5.7%–6.6%, glucosa 126–200 mg/dL, sin gradiente), y solo
salta a 100% en HbA1c ≥6.8% o glucosa ≥220. El modelo aprendió fielmente esa forma (es lo
correcto: un modelo debe reflejar los datos con los que se entrenó), pero eso significaba que
alguien con, por ejemplo, HbA1c=6.5% (ya diagnóstico de diabetes según la ADA) podía recibir una
probabilidad casi nula del modelo. Se agregó un **piso de categoría clínico** (en
`Backend/api/services/predict.py`, función `_clinical_diagnostic_floor`) que usa los cortes
diagnósticos reales de la ADA para garantizar que la *categoría* mostrada (bajo/moderado/alto)
nunca subestime a alguien en rango diagnóstico, sin tocar el `risk_score` original del modelo
(que se deja intacto para que siga coincidiendo con las explicaciones SHAP).

Esto es un buen ejemplo para la exposición de **validación crítica de un modelo entrenado**: no
basta con mirar el ROC-AUC agregado, hay que probar el comportamiento del modelo en casos límite
reales antes de confiar en él para producción.

---

## 5. ¿Por qué el umbral de decisión no es 0.5?

Por defecto, un modelo de clasificación binaria dice "positivo" si la probabilidad supera 0.5.
Aquí se hizo algo distinto y más apropiado para un contexto de salud: se buscó, **en el set de
validación** (nunca en test, para no sesgar la métrica final), el umbral más alto que aún
garantizara **Recall ≥ 90%** — es decir, que el modelo detecte al menos el 90% de los casos
reales de riesgo, aceptando a cambio más falsos positivos (personas sin riesgo real marcadas como
"en riesgo").

Esto es una decisión de diseño deliberada, no un descuido: en una **herramienta de orientación**
(no un diagnóstico), es mucho peor decirle a alguien con riesgo real que está "bien" (falso
negativo) que decirle a alguien sano que revise su riesgo con un profesional (falso positivo). Por
eso:

| Módulo | Umbral 0.5 (default) | Umbral desplegado | Recall alcanzado |
|---|---|---|---|
| Lifestyle | — | **0.346** | 89.0% |
| Clinical | — | **0.524** | 91.1% |

También se calculó el umbral alternativo que maximiza F1 (mejor balance precision/recall) para
cada módulo, documentado en `Backend/api/models/feature_schema_*.json` como
`threshold_f1_optimal`, por transparencia — pero el que corre en producción es el de recall alto.

Las tres categorías de riesgo mostradas al usuario (bajo/moderado/alto) se calculan así:
- `probabilidad ≥ umbral` → **alto**
- `umbral/2 ≤ probabilidad < umbral` → **moderado**
- `probabilidad < umbral/2` → **bajo**

---

## 6. Explicabilidad: ¿por qué el modelo dice que TU riesgo sube o baja?

Cada predicción va acompañada de una lista de "factores principales" (ej. "IMC ↑ aumenta el
riesgo"). Esto se calcula con **SHAP** (SHapley Additive exPlanations, `TreeExplainer`), una
técnica de teoría de juegos adaptada a modelos de árboles: para cada predicción individual,
calcula cuánto "empujó" cada variable la probabilidad final hacia arriba o hacia abajo,
comparado con la predicción promedio del modelo. No es una explicación genérica de qué variables
importan "en general" — es específica a los datos de ESA persona.

`top_factors_global` en los `feature_schema_*.json` sí muestra la importancia agregada
(promedio de |SHAP| sobre todo el dataset), útil para la sección "qué pesa más para el modelo" en
la página de inicio:

- **Lifestyle:** salud general percibida > IMC > edad > presión alta > colesterol alto
- **Clinical:** HbA1c > glucosa en sangre > edad > IMC > tabaquismo

---

## 7. El pipeline técnico completo (de la petición HTTP a la respuesta)

```
Usuario llena el formulario (Frontend, React)
        │
        ▼
POST /predict/lifestyle o /predict/clinical  (FastAPI, Backend/api/main.py)
        │
        ▼
Verificación de sesión (JWT de Supabase, auth.py) — rechaza si no hay login
        │
        ▼
services/predict.py:
  1. Carga el modelo .joblib y el preprocessor .joblib (cacheados en memoria tras el primer request)
  2. Ordena las columnas del payload según feature_schema_*.json (mismo orden que en entrenamiento)
  3. preprocessor.transform(df)  →  escala/codifica igual que en entrenamiento
  4. model.predict_proba(X)[:, 1]  →  probabilidad de riesgo (0 a 1)
  5. _risk_category(proba, threshold)  →  bajo/moderado/alto
  6. (solo módulo clínico) _clinical_diagnostic_floor(...)  →  corrige la categoría si hay
     valores en rango diagnóstico ADA que el modelo subestimó
  7. SHAP TreeExplainer.shap_values(X)  →  top 5 factores de ESTA predicción
        │
        ▼
Respuesta JSON: { risk_score, risk_category, top_factors, disclaimer }
        │
        ▼
Frontend guarda el resultado en Supabase (tabla `predictions`) y muestra /result/[id]
```

**Importante:** el modelo NUNCA se reentrena en producción. Los archivos `.joblib` son una foto
fija del modelo ya entrenado y evaluado offline — la API solo lo carga y lo usa para predecir
(inferencia), nunca aprende de las predicciones que hace en vivo.

### Versión exacta de las librerías (por qué importa)

`scikit-learn==1.7.2` y `xgboost==2.1.4` están **fijados exactos** (no `>=`) en
`requirements.txt`, tanto en el entorno local como en el Dockerfile. La razón: los archivos
`.joblib` son serializaciones binarias específicas de la versión de la librería con la que se
entrenaron — cargar un modelo entrenado con scikit-learn 1.7.2 usando una versión distinta puede
dar `InconsistentVersionWarning` y, en el peor caso, predicciones ligeramente distintas a las
reportadas en las métricas de este documento.

---

## 8. El chatbot nutricional (el único componente con un LLM)

- **Modelo:** OpenAI, configurable por variable de entorno `OPENAI_MODEL` (actualmente
  `gpt-5-mini`), llamado vía la API de Chat Completions.
- **Qué SÍ hace:** conversa en lenguaje natural sobre el resultado del usuario, explica qué
  significa su nivel de riesgo, y detecta cuando el usuario menciona una restricción alimentaria
  (ej. "soy intolerante a la lactosa") usando **function calling** — el modelo puede invocar una
  función `update_dietary_restrictions` que el backend interpreta para regenerar el plan de
  dieta sin esos alimentos.
- **Qué NO hace:** el chatbot NUNCA calcula el riesgo de diabetes. Ese número siempre viene del
  modelo XGBoost. El chatbot solo recibe como contexto (grounding) el resultado YA calculado, el
  plan de alimentación recomendado, y una selección de alimentos reales de la Tabla de
  Composición de Alimentos de Ecuador 2021 (`food_nutrition.json`, ~1000 alimentos) — se le
  instruye explícitamente en el system prompt a no inventar alimentos ni cifras que no estén en
  ese contexto.
- **Fallback:** si la llamada a OpenAI falla (red, límite de tokens, etc.), hay un motor de
  respuestas basado en reglas (`lib/chatbot.ts`, función `answer()`) que responde con plantillas
  fijas usando los mismos datos de contexto, para que el chat nunca se quede sin responder del
  todo.

---

## 9. Motor de generación de dietas (no es IA, es un sistema basado en reglas + datos reales)

Vale la pena aclarar esto en la exposición porque es fácil confundirlo con "otro modelo de IA":
**no lo es**. El plan semanal de comidas se arma con:

1. Cálculo de calorías de mantenimiento (TDEE) con la fórmula de **Mifflin-St Jeor** (fórmula
   médica estándar, no una predicción de ML), a partir de peso/estatura/edad/sexo/actividad.
2. Una biblioteca curada a mano de ~50 platos reales (`lib/data/mealTemplates.ts`), cada uno con
   ingredientes y macros reales de la tabla de Ecuador 2021 — no valores inventados.
3. Un algoritmo determinístico que elige un plato por franja horaria/día según el nivel de riesgo,
   ajusta las porciones (dentro de un rango de escala realista, 0.6x–1.9x) para acercarse al
   presupuesto calórico de cada comida, y excluye platos que choquen con restricciones
   alimentarias activas del usuario.

No hay entrenamiento, no hay probabilidades, no hay red neuronal aquí — es lógica de reglas sobre
datos reales, y es importante decirlo así de claro si preguntan.

---

## 10. Preguntas frecuentes que podrían hacerte en la defensa

**¿Por qué no una sola red neuronal para todo?**
Los datos son tabulares (filas/columnas), no imágenes ni texto — en ese dominio, los métodos de
árboles con boosting (XGBoost, LightGBM) sistemáticamente igualan o superan a redes neuronales
simples, con menos datos necesarios, menos tiempo de entrenamiiento, y explicabilidad nativa vía
SHAP. Una red neuronal se justificaría con datos no estructurados (imágenes, texto libre, audio).

**¿El modelo "sabe" que estás enfermo?**
No. Estima una **probabilidad relativa de riesgo** basada en patrones estadísticos aprendidos de
decenas de miles de casos históricos. Nunca es un diagnóstico — el disclaimer aparece en cada
respuesta de la API (`PredictionOutput.disclaimer`) y en la UI.

**¿Qué pasa si cambio una sola variable, cambia mucho el resultado?**
Depende de qué tan "cerca" esté esa variable de un split importante en los árboles del modelo —
por diseño, SHAP te dice exactamente cuánto pesó cada variable en tu caso particular, así que esa
pregunta se puede responder en vivo mirando `top_factors` de cualquier predicción.

**¿Cómo se validó que el modelo generaliza y no solo memorizó?**
Split 70/15/15 con el set de test completamente aislado (nunca visto durante entrenamiento ni
ajuste de umbral), y las métricas reportadas en este documento son todas sobre ese test set.

---

## 11. Dónde está cada pieza (referencia rápida)

| Qué | Dónde |
|---|---|
| Modelos entrenados finales | `Backend/api/models/*.joblib` |
| Métricas de los 8 algoritmos comparados | `Backend/api/models/metrics.json` |
| Reporte completo de Fase 1 (limpieza, EDA, tuning) | `ml/reports/FASE1_RESULTADOS.md` |
| Código que sirve las predicciones | `Backend/api/services/predict.py` |
| Validación de sesión / JWT | `Backend/api/auth.py` |
| Esquemas de entrada (rangos válidos por variable) | `Backend/api/schemas.py` |
| Motor de dietas (reglas, no IA) | `Frontend/lib/dietEngine.ts`, `Frontend/lib/data/mealTemplates.ts` |
| Chatbot — lógica y prompt | `Frontend/lib/chatbot.ts`, `Frontend/app/api/chat/route.ts` |
| Notebook comparativo ANN vs SVM (exploratorio) | `ml/notebooks/ANN_vs_SVM_Clasificacion.ipynb` |
