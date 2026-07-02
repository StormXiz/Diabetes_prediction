# PLAN MAESTRO — Plataforma web de estimación de riesgo de Diabetes Tipo 2

> Documento de arquitectura y especificación para que **Claude Sonnet** lo implemente.
> Proyecto académico conjunto de **Minería de Datos** + **Inteligencia Artificial**.
> Autor: Angel · Fecha: 2026-07-02 · Estado: listo para implementación.

---

## 0. Cómo usar este documento

Este NO es la app. Es la especificación completa. Sonnet debe leerlo entero antes de escribir código, seguir el orden de fases de la sección 15, y respetar los criterios de calidad (sección 13) y de seguridad (sección 12). Todo lo marcado **[Supuesto]** es una decisión razonable tomada por falta de dato; Angel puede cambiarla.

Decisiones ya confirmadas por Angel:
- **Frontend:** Next.js + React (App Router).
- **Servir el modelo IA:** microservicio **FastAPI** en Python con endpoint `/predict`.
- **Base de datos y auth:** **Supabase** (Postgres + Auth + RLS + Storage).
- **Despliegue:** web pública (nada atado a localhost). Frontend en Vercel, API en Render/Railway.
- **Skills de diseño/animación:** las instala Angel manualmente (comandos verificados en la sección 16).

---

## 1. Entendimiento del objetivo

**Qué se quiere conseguir:** una web muy visual, tipo "obra de arte", que (a) conciencie sobre la diabetes tipo 2 y sus factores de riesgo, y (b) permita a un usuario registrado estimar su riesgo con modelos de Machine Learning, ofreciéndole después recomendaciones de dieta.

**Resultado final esperado:** plataforma desplegada en internet, con landing narrativa animada, login/registro, dos módulos de predicción (sin datos clínicos / con datos clínicos), página de resultados con recomendación de dieta, sección visual de dietas, y un panel de administrador para gestionar contenidos. Todo el dato de usuario vive en Supabase.

**Quién la usa:** público general (personas curiosas sobre su riesgo, sin conocimientos médicos) + un administrador (Angel) que gestiona dietas/comidas. Contexto: proyecto académico que también debe demostrar rigor de minería de datos e IA.

**Restricciones clave:**
- Rendimiento del modelo **> 90%**, priorizando **Recall, F1-Score y ROC-AUC** (contexto médico: minimizar falsos negativos importa más que el Accuracy).
- Dataset de calidad, ≥ 10.000 registros (usaremos dos: 253.680 y 100.000).
- La web debe dejar SIEMPRE claro que **no es un diagnóstico médico** y recomendar acudir a un profesional.
- Estética premium, animaciones suaves, sin "AI slop", nada aburrido.

---

## 2. Módulos funcionales

| # | Módulo | Para quién | Entradas | Dataset |
|---|--------|-----------|----------|---------|
| A | Riesgo por estilo de vida | Personas sin exámenes médicos | IMC, presión alta, colesterol, actividad física, consumo frutas/verduras, tabaquismo, alcohol, edad, sexo, etc. | BRFSS 2015 (253.680) |
| B | Riesgo clínico | Personas con datos de laboratorio | Edad, sexo, IMC, hipertensión, enf. cardíaca, historial de tabaquismo, **HbA1c**, glucosa en sangre | Diabetes Prediction Dataset (100.000) |

El usuario elige el módulo según los datos que tenga. Ambos devuelven: probabilidad de riesgo, categoría (bajo/moderado/alto), factores que más pesan, y enlace a dietas recomendadas.

---

## 3. Datasets (verificados)

### 3.1 Módulo A — Diabetes Health Indicators (BRFSS 2015)
- **Fuente:** Kaggle — `alexteboul/diabetes-health-indicators-dataset` (datos limpios de la encuesta CDC BRFSS 2015).
- **Registros:** 253.680 respuestas. **22 columnas** (21 features + variable objetivo `Diabetes_binary`, donde 1 = prediabetes/diabetes, 0 = no).
- **Features:** `HighBP`, `HighChol`, `CholCheck`, `BMI`, `Smoker`, `Stroke`, `HeartDiseaseorAttack`, `PhysActivity`, `Fruits`, `Veggies`, `HvyAlcoholConsump`, `AnyHealthcare`, `NoDocbcCost`, `GenHlth`, `MentHlth`, `PhysHlth`, `DiffWalk`, `Sex`, `Age`, `Education`, `Income`. Solo `BMI` es numérica continua; el resto son categóricas/ordinales.
- **⚠ Desbalance:** la versión de 253.680 está **desbalanceada** (~14% positivos). Existe también una versión balanceada 50/50 de 70.692 registros (`diabetes_binary_5050split_health_indicators_BRFSS2015.csv`). **[Decisión]** entrenar sobre la versión completa desbalanceada y tratar el desbalance con técnicas (sección 4), porque preserva la distribución real y da mejor generalización.

### 3.2 Módulo B — Diabetes Prediction Dataset
- **Fuente:** Kaggle — `iammustafatz/diabetes-prediction-dataset`.
- **Registros:** 100.000. **8 features + 1 objetivo** (`diabetes`).
- **Features:** `gender`, `age`, `hypertension`, `heart_disease`, `smoking_history`, `bmi`, `HbA1c_level`, `blood_glucose_level`.
- **⚠ Desbalance fuerte:** ~8.500 positivos (8,5%) vs 91.500 negativos. **Obligatorio** manejar el desbalance o el Recall será pésimo.
- **⚠ Limpieza conocida:** contiene registros duplicados y la categoría `smoking_history = "No Info"` (valor faltante encubierto) que hay que tratar. `bmi`, `blood_glucose_level` y `HbA1c_level` en 0 son imposibles → tratar como inválidos.

---

## 4. Pipeline de Minería de Datos + IA (el corazón académico)

Debe implementarse en notebooks reproducibles (`/ml/notebooks/`) y en scripts (`/ml/src/`). Un pipeline por módulo (A y B), misma estructura.

### 4.1 Preprocesamiento
1. Eliminar **duplicados**.
2. Corregir **datos incorrectos** y tipos.
3. **Valores faltantes**: imputación (mediana para numéricas, moda/categoría "desconocido" para categóricas). En dataset B, tratar `"No Info"` como faltante.
4. **Valores imposibles**: glucosa, presión, IMC o HbA1c = 0 (o fuera de rango fisiológico) → marcar como inválidos e imputar o descartar.
5. **Outliers**: detectar con IQR / z-score en `BMI`, `blood_glucose_level`, `HbA1c_level`; winsorizar o recortar los extremos no fisiológicos.

### 4.2 Análisis Exploratorio de Datos (EDA)
- Histogramas y **boxplots** de variables clave.
- **Mapa de correlación** (heatmap).
- **Distribución de clases** (visualizar el desbalance).
- Detección de **outliers**.
- Relaciones dirigidas: **Glucosa vs Diabetes**, **Edad vs Diabetes**, **IMC vs Diabetes**, HbA1c vs Diabetes.
- Guardar todas las figuras en `/ml/reports/figures/` (se reutilizan en la web y en el informe académico).

### 4.3 Selección de características (Feature Selection)
- Importancia por modelos de árbol (Random Forest / XGBoost `feature_importances_`).
- Correlación con la variable objetivo + eliminación de redundantes.
- Opcional: `SelectKBest` (chi²/ANOVA) y análisis con **SHAP** para explicabilidad (además sirve para mostrar "qué factores pesan" en la UI de resultados).

### 4.4 Codificación
- Categóricas nominales → **One-Hot Encoding** (p. ej. `gender`, `smoking_history`).
- Ordinales → **Label/Ordinal Encoding** (p. ej. `GenHlth`, `Age` en BRFSS ya viene en buckets).
- Escalado (`StandardScaler`) para modelos sensibles a la escala (SVM, KNN, Logistic Regression).
- **Guardar el preprocesador** (`ColumnTransformer`/`Pipeline` de scikit-learn) serializado junto al modelo, para aplicar EXACTAMENTE la misma transformación en la API.

### 4.5 Manejo del desbalance (crítico para Recall)
- Probar: **class_weight='balanced'**, **SMOTE** (imblearn), y ajuste de **threshold** de decisión.
- Elegir la técnica por su efecto en Recall/F1/ROC-AUC en validación, no en Accuracy.

### 4.6 Modelos a entrenar y comparar
Logistic Regression, Decision Tree, Random Forest, **SVM**, **KNN**, Gradient Boosting, **XGBoost**, **LightGBM**.

- **Split**: train/validation/test estratificado (p. ej. 70/15/15) + **validación cruzada estratificada** (StratifiedKFold).
- **Métricas** (todas, reportadas en tabla comparativa): Accuracy, Precision, **Recall**, **F1**, **ROC-AUC**, matriz de confusión, curva ROC y curva Precision-Recall.
- **Criterio de selección**: mayor F1/Recall/ROC-AUC con buena robustez, superando el 90% en la métrica objetivo priorizada (documentar cuál).
- **Optimización de hiperparámetros**: `GridSearchCV`/`RandomizedSearchCV` u **Optuna** sobre los 2-3 mejores modelos.
- **Explicabilidad**: SHAP para el modelo final (alimenta la UI de "factores que más influyen").

### 4.7 Artefactos de salida (los consume la API)
- `model_lifestyle.pkl` (o `.joblib`) + `preprocessor_lifestyle.pkl` (módulo A).
- `model_clinical.pkl` + `preprocessor_clinical.pkl` (módulo B).
- `metrics.json` con las métricas finales de cada modelo (para mostrar transparencia en la web y en el informe).
- `feature_schema.json` con nombres, tipos y rangos válidos de cada input (para validar en API y frontend).

> **Nota académica:** documentar en el informe la comparativa completa de los 8 algoritmos con sus tablas de métricas y justificar el modelo elegido. Esto es lo que evalúan Minería de Datos e IA.

---

## 5. Arquitectura del sistema

```
┌─────────────────────┐      HTTPS      ┌──────────────────────┐
│  Frontend Next.js   │ ───────────────▶│  Supabase            │
│  (Vercel)           │  auth + datos   │  Postgres + Auth +   │
│  - Landing animada  │◀─────────────── │  RLS + Storage       │
│  - Login/Register   │                 └──────────────────────┘
│  - Predicción       │
│  - Dietas           │      HTTPS       ┌──────────────────────┐
│  - Dashboard admin  │ ───────────────▶│  API FastAPI (Python)│
└─────────────────────┘   POST /predict │  carga modelos .pkl  │
                                         │  (Render / Railway)  │
                                         └──────────────────────┘
```

**Flujo de predicción:** el frontend valida sesión con Supabase → envía features a FastAPI `/predict` → FastAPI aplica preprocesador + modelo → devuelve probabilidad y categoría → el frontend guarda el resultado en Supabase (tabla `predictions`) y lo muestra.

**[Supuesto]** La API FastAPI valida un JWT de Supabase en cada request para que solo usuarios logueados puedan predecir (además del guard en el frontend).

---

## 6. Base de datos Supabase (esquema)

Usar Supabase Auth para usuarios. Tablas de dominio con **Row Level Security (RLS)** activado en todas.

- **`profiles`** — `id (uuid, FK auth.users)`, `full_name`, `role` (`'user' | 'admin'`, default `'user'`), `created_at`. Se llena con un trigger al registrarse.
- **`predictions`** — `id`, `user_id (FK)`, `module` (`'lifestyle' | 'clinical'`), `input_data (jsonb)`, `risk_score (float)`, `risk_category (text)`, `top_factors (jsonb)`, `created_at`. Historial de predicciones del usuario.
- **`diets`** — `id`, `title`, `slug`, `description`, `target_risk` (`'low'|'moderate'|'high'`), `image_url`, `created_by (FK)`, `is_published (bool)`, `created_at`. Gestionadas por admin.
- **`foods`** — `id`, `diet_id (FK)`, `name`, `category` (recomendado / evitar), `portion`, `notes`, `image_url`.
- **`recommendations`** — regla que mapea `risk_category` → `diet_id` (para que la página de resultados sugiera la dieta correcta).

**Políticas RLS (resumen):**
- `profiles`: cada usuario lee/edita solo su fila; admin lee todas.
- `predictions`: el usuario solo ve las suyas (`user_id = auth.uid()`); admin ve todas (para dashboard/estadísticas).
- `diets` / `foods`: **lectura pública** de las publicadas; **escritura solo admin** (`role = 'admin'`).
- El rol admin se comprueba con una función `is_admin()` en SQL o con custom claims; **nunca** confiar solo en el frontend.

**Storage:** bucket `diet-images` (público de lectura, escritura solo admin) para fotos de dietas/alimentos y los productos "malos" (tabaco/alcohol) de la landing.

---

## 7. Backend — API FastAPI

Estructura `/api/`:
```
api/
  main.py            # app FastAPI, CORS, routers
  auth.py            # verificación de JWT de Supabase
  schemas.py         # Pydantic: LifestyleInput, ClinicalInput, PredictionOutput
  models/            # model_lifestyle.pkl, model_clinical.pkl, preprocessors, feature_schema.json
  services/predict.py# carga modelos (una vez al arrancar) y ejecuta predicción
  requirements.txt
```

**Endpoints:**
- `GET /health` → estado.
- `POST /predict/lifestyle` → recibe `LifestyleInput`, devuelve `{risk_score, risk_category, top_factors}`.
- `POST /predict/clinical` → igual para módulo clínico.
- (Ambos exigen JWT válido de Supabase.)

**Reglas:**
- Validar tipos y rangos con Pydantic contra `feature_schema.json` (rechazar valores imposibles: IMC/glucosa/HbA1c fuera de rango).
- Cargar modelos **una sola vez** al iniciar (no por request).
- CORS restringido al dominio del frontend.
- `top_factors` se calcula con SHAP o con las importancias del modelo para explicar el resultado.
- Nunca devolver un diagnóstico; devolver *estimación de riesgo* + recordatorio de acudir a un médico (lo renderiza el frontend).

---

## 8. Frontend — Next.js (App Router)

### 8.1 Rutas
```
/                      Landing narrativa animada (pública)
/login                 Inicio de sesión
/register              Registro
/predict               Selector de módulo (protegida)
/predict/lifestyle     Formulario estilo de vida (protegida)
/predict/clinical      Formulario clínico (protegida)
/result/[id]           Resultado + recomendación (protegida)
/diets                 Galería visual de dietas (pública o protegida)
/diets/[slug]          Detalle de una dieta
/admin                 Dashboard admin (solo role=admin)
/admin/diets           CRUD de dietas y alimentos
```

### 8.2 Guardas de acceso
- Middleware Next.js + Supabase: si un usuario no logueado pulsa **"Predecir"** → redirige a `/login?redirect=/predict`. Tras loguearse, vuelve a `/predict`.
- `/admin/*` verifica `role = 'admin'` en servidor (no basta el frontend).

### 8.3 Landing (la "obra de arte") — estructura de secciones con scroll animado
1. **Hero:** título grande **"Diabetes"** a pantalla completa, tipografía potente, animación de entrada suave, indicador de scroll. Nada médico todavía, solo impacto.
2. **¿Qué es la diabetes?** al hacer scroll aparece con animación la explicación en lenguaje simple (qué es, cómo se da).
3. **¿Cómo se desarrolla?** narrativa animada de resistencia a la insulina / glucosa, con ilustraciones o animaciones generadas con Higgsfield.
4. **Factores de riesgo / concientización:** el tabaco y el alcohol aparecen como "productos malos" con animación (p. ej. un cigarro/botella que entra y se tacha), mensajes de concientización. Sedentarismo, mala dieta, obesidad.
5. **Afectaciones:** consecuencias (visión, riñón, corazón, etc.) presentadas de forma visual, no alarmista.
6. **Disclaimer + CTA:** mensaje claro "**No somos un diagnóstico. Somos una herramienta de orientación. Consulta siempre a un médico.**" y un botón **"Predecir mi riesgo"** (también flotante/sticky durante todo el scroll). Al pulsarlo → `/predict` (o `/login` si no hay sesión).

**[Decisión sobre el botón]** Un CTA sticky "Predecir" visible en toda la landing + un CTA grande al final. Da mejor conversión que un solo botón.

### 8.4 Formularios de predicción
- Inputs claros con ayuda contextual (qué es IMC, dónde ver su HbA1c…), validación en cliente contra rangos de `feature_schema.json`.
- Al enviar: spinner animado → llamada a FastAPI → navegar a `/result/[id]`.

### 8.5 Página de resultados
- Medidor/gauge animado con la probabilidad, categoría de riesgo con color.
- "Factores que más influyen en tu resultado" (de `top_factors`).
- Recordatorio médico visible.
- Botón "Ver dieta recomendada" → `/diets/[slug]` según `risk_category`.

### 8.6 Sección de dietas
- Galería visual con imágenes (Storage), filtrable por categoría de riesgo. Detalle con alimentos recomendados / a evitar, porciones y notas. Contenido servido desde Supabase (editable por admin).

### 8.7 Dashboard admin
- Layout distinto (no la landing). CRUD de `diets` y `foods`, subida de imágenes al bucket, publicar/despublicar, y estadísticas básicas (nº de usuarios, predicciones, distribución de riesgo) leídas de Supabase.

---

## 9. Diseño visual y animaciones (evitar "AI slop")

Sistema de diseño y motion apoyado en las skills que instalará Angel (sección 16):
- **Impeccable** + **taste-skill**: definen el lenguaje visual (paleta, tipografía, spacing, densidad) y evitan estética genérica. Ejecutar sus auditorías (`/impeccable audit`) sobre las páginas clave.
- **Emil Kowalski (emil-design-eng)**: micro-animaciones de UI (botones, hovers, transiciones, entrada de secciones). Reglas: animaciones **< 300ms**, curvas de easing personalizadas (no `ease` por defecto), no animar acciones de alta frecuencia. Implementar con **Motion / Framer Motion**.
- **Higgsfield**: generar los activos visuales pesados — imágenes/animaciones/vídeo de la landing (concepto de glucosa, productos de tabaco/alcohol para concientización, ilustraciones de afectaciones). Ver sección 10.

**Principios:** jerarquía tipográfica fuerte en el hero, scroll-reveal escalonado, movimiento con propósito (no decorativo), rendimiento (lazy-load de vídeos/imágenes, `prefers-reduced-motion` respetado por accesibilidad).

**[Supuesto] Paleta:** base médica confiable pero moderna — azules/verdes profundos + un acento cálido para los CTA; modo oscuro en la landing para dar el efecto "premium". Ajustable con las skills de taste.

---

## 10. Activos generados con Higgsfield

Usar la herramienta conectada de Higgsfield para producir:
- Imagen/animación **hero** abstracta (concepto de glucosa/insulina).
- Secuencia animada "cómo se desarrolla la diabetes".
- Imágenes de **concientización** de tabaco y alcohol (para la sección 4 de la landing) con estilo coherente.
- Ilustraciones de afectaciones y de alimentos saludables para dietas.

Guardar todo en `/public/media/` (frontend) o en el bucket de Storage. Optimizar (WebP/MP4 comprimido) para no penalizar el rendimiento.

---

## 11. Contenido de concientización (médicamente correcto y prudente)

Factores de riesgo de diabetes tipo 2 (bien establecidos, usar como base del copy): sobrepeso/obesidad (IMC elevado), inactividad física, dieta poco saludable, tabaquismo, consumo excesivo de alcohol, hipertensión, colesterol alto, edad avanzada y antecedentes familiares. Umbral diagnóstico de referencia: **HbA1c ≥ 6,5%** (esto lo decide un médico, no la web).

**Regla de contenido:** el copy educa y concientiza, pero NUNCA afirma diagnóstico. Toda página de predicción/resultado incluye el disclaimer de "consulta a un profesional de salud".

---

## 12. Seguridad (obligatorio)

- **Auth**: Supabase Auth (email+password; opcional OAuth). Contraseñas nunca en claro (lo gestiona Supabase).
- **RLS activado en TODAS las tablas**; el rol admin se valida en base de datos, no en el cliente.
- **Secretos**: `SUPABASE_SERVICE_ROLE_KEY` y claves de la API solo en el backend / variables de entorno del servidor; en el frontend solo la **anon key** pública. Nunca commitear `.env`.
- **API FastAPI**: verifica JWT de Supabase, CORS restringido al dominio del frontend, rate limiting básico, validación estricta de inputs (Pydantic).
- **Datos de salud**: son sensibles. Mostrar aviso de privacidad, guardar solo lo necesario, permitir al usuario borrar su historial. No exponer predicciones de otros usuarios (RLS).
- **HTTPS** en todo (Vercel y Render lo dan por defecto).
- No registrar datos sensibles en logs.

---

## 13. Criterios de calidad (definición de "terminado")

**Modelo/IA:**
- Métrica objetivo priorizada (Recall/F1/ROC-AUC) **> 90%** documentada, con tabla comparativa de los 8 algoritmos y matriz de confusión.
- Preprocesador y modelo serializados y cargables por la API; misma transformación en entrenamiento y en producción.

**Producto web:**
- Landing con las 6 secciones animadas y CTA sticky funcional.
- Login/registro funcionando; guard que envía a login antes de predecir y vuelve tras autenticar.
- Ambos módulos de predicción devuelven resultado correcto y lo guardan en Supabase.
- Resultado enlaza a la dieta recomendada según categoría.
- Dashboard admin con CRUD real de dietas/alimentos y control de acceso por rol.
- Todo desplegado y accesible por URL pública (no localhost).

**Calidad transversal:**
- RLS y seguridad verificados (un usuario no puede ver datos de otro; un no-admin no entra a `/admin`).
- Animaciones suaves (<300ms UI), `prefers-reduced-motion` respetado, sin "AI slop" (pasar auditoría impeccable/taste).
- Responsive (móvil y escritorio).
- Disclaimer médico presente en todas las pantallas de predicción/resultado.

---

## 14. Riesgos y casos límite

- **Desbalance de clases** → si no se trata, Recall bajísimo. Mitigar con SMOTE/class_weight/threshold (sección 4.5).
- **Fuga de datos (data leakage)** → ajustar el preprocesador SOLO con train y aplicarlo a test/producción.
- **Inputs imposibles del usuario** (IMC 0, HbA1c 99) → validar en frontend y backend.
- **Sobreajuste** → validación cruzada estratificada + conjunto de test intacto.
- **Latencia de la API en frío** (Render free tier "duerme") → considerar plan que no se suspenda o un health-check periódico.
- **Coste/límites de Higgsfield** → generar activos una vez y cachearlos, no en runtime.
- **Consentimiento de datos de salud** → aviso de privacidad y opción de borrado.
- **Cuenta admin** → crearla de forma segura (no hardcodear credenciales; asignar `role='admin'` vía SQL en Supabase).

---

## 15. Roadmap de implementación (orden para Sonnet)

**Fase 1 — Datos e IA (Minería + IA):**
1. Descargar los dos datasets. EDA + preprocesamiento (notebooks).
2. Feature selection, encoding, manejo de desbalance.
3. Entrenar y comparar los 8 modelos, optimizar hiperparámetros, elegir el mejor (>90% en métrica objetivo).
4. Serializar modelos + preprocesadores + `feature_schema.json` + `metrics.json`.

**Fase 2 — Backend API:**
5. FastAPI con `/predict/lifestyle` y `/predict/clinical`, validación, verificación de JWT, CORS.

**Fase 3 — Supabase:**
6. Crear proyecto, tablas, RLS, triggers de `profiles`, bucket de Storage, seed de dietas de ejemplo, cuenta admin.

**Fase 4 — Frontend base:**
7. Next.js + Supabase auth (login/register/guards). Estructura de rutas.

**Fase 5 — Landing y diseño:**
8. Generar activos con Higgsfield. Construir la landing animada (6 secciones + CTA). Aplicar impeccable/taste/emil-design-eng.

**Fase 6 — Predicción y dietas:**
9. Formularios → API → resultados. Galería de dietas + recomendación por riesgo.

**Fase 7 — Admin:**
10. Dashboard admin (CRUD dietas/alimentos, stats).

**Fase 8 — Seguridad, pruebas y despliegue:**
11. Auditorías de diseño, pruebas de RLS/roles, responsive, `prefers-reduced-motion`.
12. Deploy frontend (Vercel) + API (Render/Railway) + Supabase. Verificar todo en producción.

---

## 16. Setup de skills externas (comandos verificados)

> Angel las instala en su entorno de Claude Code / Cursor, en la raíz del proyecto frontend.

**1. Emil Kowalski (animaciones de UI).** ⚠ El comando que tenías no era exacto. El oficial es:
```bash
npx skills add emilkowalski/skill
```
(instala la skill `emil-design-eng`). Alternativa comunitaria basada en su curso: `npx skills add https://github.com/delphi-ai/animate-skill --skill animate`.

**2. Impeccable (lenguaje de diseño anti-slop).** Tu comando es correcto:
```bash
npx impeccable install
# luego, dentro de Claude Code / Cursor:
/impeccable init
```

**3. taste-skill (buen gusto de diseño).** ⚠ Le faltaba el flag `--skill`. Comando correcto:
```bash
npx skills add https://github.com/Leonxlnx/taste-skill --skill "design-taste-frontend"
```

Requisito común: tener **Node.js** instalado para poder usar `npx`.

---

## 17. Verificación final (revisión superpowers)

**Contra la especificación:** cubre los dos módulos, los dos datasets con sus tamaños reales, el pipeline completo de minería (preprocesado, EDA, feature selection, encoding, 8 modelos, hiperparámetros, métricas priorizadas), login/register con guard a predicción, landing narrativa animada con concientización (tabaco/alcohol) y disclaimer + CTA, resultados con recomendación de dieta, sección de dietas, dashboard admin, Supabase para todo el dato, seguridad, y despliegue web. ✔

**Calidad:** decisiones marcadas, riesgos identificados con mitigación, orden de fases claro, comandos de skills verificados y corregidos.

**Supuestos que Angel debe confirmar:** (1) nombre real de la "app conectada del front" si no es Next.js puro; (2) las dietas concretas y su mapeo a categorías de riesgo; (3) paleta/estilo visual final; (4) proveedor de deploy de la API (Render vs Railway).

**Datos verificados por búsqueda web:** tamaños y features de ambos datasets, desbalance de clases, y los comandos de instalación de las tres skills. Nada inventado.
