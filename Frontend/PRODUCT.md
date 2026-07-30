# Product

## Register

product

## Users
Personas preocupadas por su riesgo de diabetes tipo 2 (o ya diagnosticadas con prediabetes) que
buscan una estimación de riesgo rápida y, sobre todo, una guía de qué comer que se sienta
alcanzable — no un panfleto médico aburrido. Usan la app en el celular o el navegador, casi
siempre solos, a veces justo después de recibir un resultado de laboratorio o simplemente por
curiosidad/prevención. El "trabajo a realizar" central: entender su riesgo y salir con un plan de
comidas concreto (qué comer hoy, cuánto, por qué) sin sentirse regañados ni abrumados.

## Product Purpose
Plataforma de orientación (no diagnóstico) sobre riesgo de diabetes tipo 2: predicción con
Machine Learning (dos modelos, estilo de vida y clínico), guía nutricional personalizada por
nivel de riesgo con datos reales de composición de alimentos, generación de plan semanal según
calorías de mantenimiento, y un asistente conversacional que acompaña la decisión. Éxito = la
persona entiende su riesgo Y sale con acciones concretas que sí va a poder seguir.

## Brand Personality
**Vibrante, motivacional, cercana** — como un coach de salud moderno, no un panfleto de
hospital. Prioriza energía visual y sensación de progreso/logro sobre sobriedad clínica; el color
y el movimiento comunican "esto es alcanzable y hasta se ve bien", no "esto es serio y triste".
Aun así nunca sacrifica la confianza médica de fondo (las cifras y datos siguen siendo reales y
verificables) — la energía es de tono, no de contenido.

## Anti-references
- Software de hospital/EHR gris, denso, sin personalidad — sensación de trámite.
- Apps de "salud IA" genéricas: gradiente morado/azul sobre blanco, iconos de línea idénticos,
  tarjetas clonadas sin jerarquía.
- Gamificación infantil (mascotas, confetti excesivo, tono aniñado) — el usuario es adulto
  gestionando una condición de salud real, la energía va en el diseño, no en el tono.

## Design Principles
1. **Comida real, no iconografía genérica** — los alimentos que se muestran son datos reales de la
   Tabla de Composición de Ecuador 2021; el 3D/las ilustraciones deben sentirse igual de
   específicas y reales, no clip-art de "manzana genérica".
2. **El riesgo nunca se siente como un castigo** — incluso el contenido de "qué evitar" se
   presenta con la misma calidad visual que "qué comer", sin tono de regaño.
3. **Energía con propósito** — el movimiento y el color celebran el progreso (elegir tu nivel,
   generar tu plan, ver tus macros) en vez de decorar porque sí.
4. **Cifras siempre reales** — toda cifra nutricional visible debe trazarse a un dato real del
   proyecto (dataset de alimentos, modelo entrenado); nunca se inventa un número para que se vea
   mejor.

## Accessibility & Inclusion
WCAG AA como mínimo (contraste ≥4.5:1 en texto de cuerpo, ≥3:1 en texto grande). Todo movimiento
(incluyendo 3D) debe respetar `prefers-reduced-motion` — patrón ya establecido en el proyecto
(`useReducedMotion` en las escenas Three.js existentes). Sin dependencia exclusiva del color para
comunicar estado (ej. "recomendado" vs "evitar" ya usa ícono + texto, no solo color).
