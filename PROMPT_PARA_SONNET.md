# Prompt optimizado para Claude Sonnet (implementación)

> Pega esto a Sonnet junto con el archivo `PLAN_MAESTRO.md`. Trabaja por fases; no intentes todo de una vez.

---

## CONTEXTO Y ROL
Eres un ingeniero full-stack + científico de datos senior. Implementas una plataforma web académica (proyecto de Minería de Datos + Inteligencia Artificial) que estima el riesgo de **diabetes tipo 2** con Machine Learning y conciencia sobre la enfermedad. La especificación completa está en `PLAN_MAESTRO.md`: léela entera antes de escribir código y respétala.

**Stack confirmado:** Frontend **Next.js + React (App Router)**, backend **FastAPI** (Python) que sirve el modelo, **Supabase** (Postgres + Auth + RLS + Storage) para todos los datos, despliegue **web público** (Vercel + Render/Railway). Nada atado a localhost salvo pruebas.

## TAREA CONCRETA
Implementa el proyecto siguiendo el roadmap por fases de la sección 15 del plan:
1. **IA/Minería:** EDA, preprocesado (duplicados, valores imposibles como glucosa/IMC/HbA1c=0, faltantes, outliers), feature selection, encoding, manejo de desbalance (SMOTE/class_weight/threshold), entrena y compara los 8 algoritmos (LogReg, DecisionTree, RandomForest, SVM, KNN, GradientBoosting, XGBoost, LightGBM) con optimización de hiperparámetros. Serializa modelo + preprocesador + `feature_schema.json` + `metrics.json`.
2. **API FastAPI** con `/predict/lifestyle` y `/predict/clinical`, validación Pydantic, verificación de JWT de Supabase, CORS.
3. **Supabase:** tablas (`profiles`, `predictions`, `diets`, `foods`, `recommendations`), RLS en todas, trigger de perfil, bucket de imágenes, cuenta admin.
4. **Frontend:** auth (login/register + guard que manda a login antes de predecir y regresa), landing narrativa animada de 6 secciones con CTA sticky "Predecir", formularios de los dos módulos, página de resultados con recomendación de dieta, galería de dietas, dashboard admin (CRUD dietas/alimentos + stats).

## ESPECIFICACIONES
- Dos datasets: BRFSS 2015 (253.680 filas, módulo estilo de vida) y Diabetes Prediction Dataset (100.000 filas, módulo clínico con HbA1c y glucosa). Ambos **desbalanceados** → tratarlo obligatoriamente.
- Meta de modelo: **>90%** priorizando **Recall, F1 y ROC-AUC** (minimizar falsos negativos). Reporta tabla comparativa de los 8 modelos.
- Diseño premium, sin "AI slop": aplica las skills **impeccable**, **taste-skill** y **emil-design-eng** (animaciones de UI <300ms, easing custom, `prefers-reduced-motion`). Usa activos generados con **Higgsfield** para la landing (hero, concientización tabaco/alcohol, afectaciones).
- Seguridad: RLS real, rol admin validado en BD, secretos solo en servidor, validación de inputs en front y back.
- La web NUNCA da diagnóstico: disclaimer visible + recomendación de acudir a un médico en toda pantalla de predicción/resultado.

## CRITERIOS DE CALIDAD
- Métrica objetivo >90% documentada con matriz de confusión y curvas ROC/PR.
- Mismo preprocesador en entrenamiento y en la API (sin data leakage).
- Guard de predicción, RLS y control de rol admin verificados (un usuario no ve datos de otro; no-admin no entra a `/admin`).
- Responsive, animaciones suaves, landing completa, todo desplegado y accesible por URL.

## FORMATO DE TRABAJO
- Entrega por fases; al terminar cada fase, resume qué hiciste y cómo probarlo.
- Incluye instrucciones de ejecución/despliegue y cómo verificar (tests, capturas o pasos manuales).
- Marca cualquier decisión relevante y cualquier supuesto que tomes.

## VERIFICACIÓN FINAL
Antes de dar por terminada cada fase, revisa contra la sección 13 (criterios de calidad) y 12 (seguridad) del plan. Si algo no cumple, corrígelo antes de continuar.
