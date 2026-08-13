# DiabetesRisk — Pitch

## La idea en una frase

**DiabetesRisk** es una plataforma web gratuita que estima tu riesgo de diabetes tipo 2 en menos
de 5 minutos usando Machine Learning, y te da un plan de alimentación real y personalizado según
ese riesgo — sin necesidad de crear una cuenta ni dar datos de laboratorio si no los tienes.

## El problema

Más de 537 millones de personas en el mundo viven con diabetes, y el 90% de los casos son tipo 2
— es decir, prevenibles o detectables a tiempo. El problema es que la mayoría de la gente no se
entera de que está en riesgo hasta que ya tiene síntomas, porque hacerse un análisis requiere ir
al médico, sacar cita, y muchas veces plata que no todos tienen a la mano.

## La solución

Dos caminos, según lo que la persona tenga disponible:

- **Módulo de estilo de vida**: 21 preguntas sobre hábitos (peso, actividad física, alimentación,
  antecedentes) — cero análisis de laboratorio necesarios.
- **Módulo clínico**: si la persona sí tiene datos de un examen reciente (HbA1c, glucosa), da una
  estimación bastante más precisa.

Ambos corren sobre modelos XGBoost entrenados con datasets reales de salud pública, y en segundos
devuelven: un porcentaje de riesgo, la categoría (bajo/moderado/alto), y **por qué** — qué
factores específicos influyeron más en ese resultado.

De ahí la persona recibe un plan de alimentación de 7 días armado con datos nutricionales reales
de la Tabla de Composición de Alimentos de Ecuador (2021) — comidas normales tipo "arroz con pollo
y brócoli", no una lista de ingredientes sueltos — descargable en PDF, más un chatbot que responde
dudas y ajusta el plan si la persona tiene alguna intolerancia.

## Cómo fuimos construyendo esto

No salió perfecto a la primera. El proceso fue iterativo, y cada iteración salió de un problema
concreto que encontramos:

1. **Que el modelo funcionara.** Entrenamos y comparamos 8 algoritmos distintos por cada módulo.
   Ganó XGBoost por precisión, velocidad, y porque permite explicar cada predicción individual.
2. **Que fuera fácil de usar.** Quitamos por completo el login y registro — nadie debería
   necesitar crear una cuenta para saber si está en riesgo. Todo corre en el navegador.
3. **Que las dietas tuvieran sentido real.** La primera versión recomendaba cosas como "lenteja
   cruda" porque elegía el ingrediente con más fibra de cada categoría. La rediseñamos con
   combinaciones de comida real, distintas cada día de la semana.
4. **Que el resultado fuera creíble.** El modelo original detectaba casi todos los casos de riesgo
   (89%) pero se equivocaba muchísimo: de cada 10 alertas de "riesgo alto", 7 eran falsas. Y el
   porcentaje mostrado contradecía la etiqueta. Lo reoptimizamos dos veces — la última añadiendo
   variables derivadas (como "cuántos factores de riesgo se acumulan a la vez") — hasta llegar a un
   punto donde **4 de cada 10 alertas aciertan** y un perfil de riesgo alto real muestra 71%, no un
   número bajo que no cuadraba con lo que decía la app.

## Dónde está ahora

En producción, con dominio propio: **[diabetesrisk.shop](https://diabetesrisk.shop)**. Backend y
frontend en contenedores Docker desplegados en Railway, con HTTPS y dominio custom configurados de
punta a punta.

## Lo que no prometemos

DiabetesRisk es una herramienta de orientación, **no un diagnóstico médico**. Y somos explícitos
con sus límites: el módulo de estilo de vida acierta 4 de cada 10 alertas porque una encuesta de
hábitos, por buena que sea, no puede reemplazar un análisis de sangre — eso está en la naturaleza
del dato, no en el modelo. Por eso el módulo clínico existe, y por eso en cada resultado se
recomienda consultar a un profesional.
