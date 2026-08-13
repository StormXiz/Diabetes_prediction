# Guía rápida del proyecto — para el equipo

La versión sencilla, para quien no ha estado metido en el código día a día.

---

## 1. ¿Qué IA usamos y para qué?

Tres piezas, cada una con un trabajo distinto:

| Pieza | Qué hace | Qué tipo de IA es |
|---|---|---|
| **Modelo de estilo de vida** | Calcula el % de riesgo a partir de 21 preguntas de hábitos (sin análisis de sangre) | XGBoost (árboles de decisión potenciados) |
| **Modelo clínico** | Calcula el % de riesgo a partir de datos de laboratorio (glucosa, HbA1c) | XGBoost, entrenado con otro dataset |
| **Chatbot nutricional** | Responde preguntas y ajusta el plan de comida ("no como lácteos") | Modelo de lenguaje de OpenAI (GPT) |

**Importante: el chatbot nunca calcula el riesgo de nadie** — solo conversa y ayuda con la dieta.
El número siempre sale del modelo XGBoost, que es matemática entrenada con datos reales, no una
IA que "opina".

XGBoost no es una red neuronal ni IA generativa — es Machine Learning clásico que arma cientos de
árboles de decisión pequeños y combina sus votos. Se eligió porque en datos tabulares (tablas de
números, no imágenes ni texto) funciona igual o mejor que una red neuronal, es mucho más rápido, y
permite explicar qué factores influyeron en cada predicción individual (eso es lo que se ve en
pantalla como "factores que más influyen").

---

## 2. Cómo decide el modelo si algo es "riesgo" (explicado simple)

El modelo no dice "sí" o "no". Calcula una **probabilidad** — "esta persona tiene 32% de
probabilidad de tener prediabetes o diabetes según su perfil".

Para convertir eso en una categoría (bajo/moderado/alto) hace falta un **umbral**: una línea de
corte.

> Piénsalo como un detector de humo: muy sensible y salta con cualquier cosa (falsas alarmas);
> poco sensible y no salta ni con un incendio real (casos que se escapan). Elegir el umbral es
> buscar el punto donde avisa lo suficiente sin volverse molesto.

Probamos los ~90 umbrales posibles y elegimos el que **maximiza el equilibrio** entre:

- **Sensibilidad (recall)**: de todos los que SÍ tienen riesgo real, cuántos detecta.
- **Precisión**: de todas las veces que la app dice "riesgo", cuántas acierta.

Estos dos van siempre en contra. El punto elegido (umbral **22%**) es donde el balance de ambos
(el F1) es máximo. Todo esto se decidió con datos de **validación**; el set de prueba jamás se usó
para elegir nada — así los números finales son honestos.

---

## 3. Números actuales del modelo de estilo de vida

Medido en datos de prueba que el modelo nunca vio:

| Métrica | Valor | Qué significa en simple |
|---|---|---|
| Exactitud | 77% | De cada 100 personas, a 77 les acierta la categoría |
| Precisión | 40% | De cada 100 alertas de "riesgo", 40 son acierto real |
| Sensibilidad (Recall) | 65% | De cada 100 casos reales de riesgo, detecta 65 |
| F1-score | 50% | Balance entre las dos anteriores |
| ROC-AUC | 81% | Qué tan bien distingue "quién tiene más riesgo que quién" (1.0 = perfecto, 0.5 = azar) |

**Cómo fue mejorando** (mismo set de prueba en las tres versiones):

| Versión | Exactitud | Precisión | Recall | F1 |
|---|---|---|---|---|
| Original | 60% | 29% | 89% | 44% |
| v1 | 70% | 34% | 79% | 47% |
| **v2 (actual)** | **77%** | **40%** | 65% | **50%** |

La versión actual añade **12 variables derivadas** que calculamos a partir de las respuestas —
por ejemplo "cuántos factores de riesgo se acumulan a la vez" o "carga metabólica" (presión alta +
colesterol alto + obesidad juntos). Resultó que esas derivadas pesan más en las predicciones que
casi cualquier respuesta individual.

**Por qué el recall bajó y está bien**: antes detectaba 89 de cada 100 casos, pero 7 de cada 10
alertas eran falsas — una app que se equivoca tanto pierde credibilidad y nadie le hace caso.
Ahora acierta 4 de cada 10 y la exactitud general subió 17 puntos.

**Un límite honesto**: el ROC-AUC casi no se movió entre versiones (81%). Eso significa que el
techo lo pone el **dataset**, no el modelo — BRFSS es una encuesta autorreportada, y una encuesta
de hábitos por definición no puede predecir tan bien como un análisis de sangre. Por eso el módulo
clínico (que sí usa HbA1c y glucosa) llega a 91% de exactitud.

---

## 4. Los campos del formulario — qué es cada uno y por qué

El formulario de estilo de vida está basado en **BRFSS** (Behavioral Risk Factor Surveillance
System), una encuesta real y pública del CDC de EE.UU. — una de las encuestas de salud más grandes
y estudiadas del mundo. No inventamos las preguntas: son las mismas que usan los investigadores de
salud pública.

### Medidas básicas
- **IMC** — peso relativo a la altura. Uno de los factores de riesgo mejor documentados.
- **Rango de edad** — el riesgo sube con la edad, sobre todo después de los 45.
- **Sexo** — factores hormonales y de composición corporal varían.

### Salud percibida
- **Salud general autopercibida** — suena subjetivo, pero es un predictor sorprendentemente fuerte:
  cómo la gente SIENTE su salud correlaciona con su salud metabólica real.
- **Días de mala salud mental / física** — el estrés crónico afecta el control de glucosa.
- **Dificultad para caminar** — señal de condición física y posibles complicaciones en curso.

### Antecedentes médicos
- **Presión alta** y **Colesterol alto** — diabetes, hipertensión y colesterol suelen ir juntos
  (mismo síndrome metabólico de fondo).
- **Revisión de colesterol en 5 años** — indica acceso/hábito de chequeos regulares.
- **ACV o enfermedad cardíaca previa** — comparten factores de riesgo vasculares.

### Hábitos
- **Fumar, alcohol en exceso** — afectan cómo el cuerpo procesa el azúcar.
- **Actividad física** — el ejercicio mejora la sensibilidad a la insulina.
- **Fruta / vegetales a diario** — marcador de calidad general de la dieta.

### Acceso a salud y contexto (la sección que más dudas genera)
- **¿Seguro de salud?** y **¿Dejaste de ir al médico por costo?** — no es que la app juzgue a
  nadie. En los datos reales, quien no tiene acceso a chequeos regulares se detecta la diabetes
  más tarde, y el modelo aprende eso como señal. Refleja una desigualdad real del sistema de
  salud, no una opinión de la app.
- **Nivel educativo** e **Ingresos** — tampoco es "si ganas poco tienes más riesgo por pobre".
  Existe una correlación real y muy estudiada entre nivel socioeconómico y acceso a alimentación
  saludable, tiempo para ejercicio y atención preventiva. El modelo la usa como una señal más
  entre 21 — en las predicciones típicas, IMC, presión alta y salud general pesan mucho más.

### Módulo clínico (formulario más corto)
- **HbA1c** y **Glucosa en sangre** — son literalmente los valores que la medicina usa para
  diagnosticar diabetes (criterios oficiales de la ADA, no solo "factores de riesgo"). Por eso
  este módulo es bastante más certero.
- **Edad, IMC, hipertensión, enfermedad cardíaca, sexo, tabaquismo** — mismos conceptos que arriba.

---

## 5. Tres ejemplos reales del módulo clínico (para la exposición)

Corridos contra el modelo que está en producción:

| # | Perfil | Resultado |
|---|---|---|
| 1 | 28 años, IMC 22.5, HbA1c 5.2%, glucosa 90, sin antecedentes | **0.004% → Riesgo bajo** |
| 2 | 48 años, IMC 29, HbA1c 6.0%, glucosa 115, con hipertensión | **40% → Riesgo moderado** |
| 3 | 62 años, IMC 34, HbA1c 7.8%, glucosa 210, hipertensión + cardíaca | **99.96% → Riesgo alto** |

**Ejemplo 1** — todos los valores clínicos limpios (HbA1c normal es <5.7%, glucosa <100). El
modelo no tiene ninguna señal de alarma.

**Ejemplo 2 — el más interesante para explicar.** HbA1c de 6.0% ya cae en rango de **prediabetes
según la ADA** (5.7–6.4%). Pero el modelo por sí solo, en ese rango, da un número poco confiable:
el dataset de entrenamiento tiene una relación casi de "escalón" ahí. Por eso la app tiene una
**regla de seguridad clínica aparte**: si HbA1c o glucosa cruzan el umbral que usan los médicos de
verdad, la categoría sube sin importar lo que diga el modelo. Es la app diciendo *"aquí no confío
solo en la IA, uso también el criterio médico real"*.

**Ejemplo 3** — HbA1c 7.8% y glucosa 210 ya están en rango **diagnóstico de diabetes** (≥6.5% y
≥200). Aquí el modelo y la regla clínica coinciden; el factor que más pesa es HbA1c, por lejos.

**El patrón**: los ejemplos 1 y 3 muestran que el modelo solo ya acierta en los extremos claros.
El ejemplo 2 muestra por qué agregamos una capa de criterios médicos reales encima — para la zona
gris donde la IA sola no basta.

---

## 6. Preguntas que pueden caer en la exposición

- **¿Por qué dos módulos?** Porque no todos tienen un análisis de sangre reciente.
- **¿El modelo "sabe" que alguien tiene diabetes?** No. Da una probabilidad estadística basada en
  patrones de miles de personas parecidas, no un diagnóstico individual.
- **¿Por qué "riesgo alto" con un % que no parece tan alto?** Porque la categoría no se calcula
  como una nota escolar. Se usa el umbral de la sección 2, elegido para equilibrar detección y
  falsas alarmas.
- **¿Los factores mostrados "causan" diabetes?** No — son influencia sobre esa predicción
  específica (técnica SHAP), no causalidad probada. La app lo aclara en pantalla.
- **¿Por qué no usaron una red neuronal?** En datos tabulares, los árboles con boosting igualan o
  superan a las redes neuronales, entrenan más rápido y se explican mejor. Igual comparamos ambos
  (está el notebook ANN vs SVM).
