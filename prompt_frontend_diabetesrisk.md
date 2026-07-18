Construye el frontend completo de **"DiabetesRisk"**, una plataforma web que estima el riesgo de diabetes tipo 2 mediante Machine Learning. El backend YA EXISTE y está en producción (FastAPI + Supabase Auth) — este no es un proyecto desde cero, es el frontend que debe conectarse a esa API sin fricción. Stack: Next.js (App Router) + TypeScript + Tailwind CSS v4.

IMPORTANTE: respeta exactamente el contrato de API descrito más abajo (rutas, campos, tipos, auth). No inventes endpoints ni cambies nombres de campos — el backend no se puede modificar para adaptarse al frontend.

DISEÑO Y ESTÉTICA:
- Paleta modo claro (default): fondo blanco / #f8fafc, acentos verde esmeralda (#059669, y #047857 más oscuro) y azul (#2563eb), texto slate-900.
- Paleta modo oscuro: fondo **negro puro** (#000000 o #0a0a0a) — nada de azul marino, navy, ni grises azulados tipo "slate-950 con tinte azul". Los mismos acentos verde/azul se mantienen sobre el negro como color de marca, con glow sutil permitido en botones y bordes.
- Toggle de tema (sol/luna) visible en el header en **todas** las páginas del sitio, no solo en una sección — se aplica vía clase `.dark` en `<html>`, arranca según `prefers-color-scheme` del sistema pero el usuario puede forzar manualmente y se guarda la preferencia.
- Tipografía sans-serif moderna, bold/extrabold en títulos, cuerpo legible y limpio.
- Tono visual: clínico pero cálido — evitar la sensación fría/corporativa. Gradientes suaves verde→azul reservados para CTAs y acentos puntuales, nunca en bloques largos de texto.
- Elementos 3D interactivos y con movimiento en scroll: formas flotantes relacionadas con salud/datos (molécula de glucosa, hélice de ADN, gotas, blobs orgánicos) hechas con Three.js / React Three Fiber o Spline. Deben reaccionar al scroll con parallax en profundidad y sutilmente al movimiento del mouse. Degradación elegante: reducir o desactivar el movimiento si el sistema tiene `prefers-reduced-motion` activo o en gama baja.
- Micro-animaciones de entrada (fade/slide) por sección al hacer scroll, transiciones fluidas (<300ms), sin que se sientan exageradas.

HERO SECTION:
- Headline directo: "Entiende tu riesgo de diabetes tipo 2 en minutos"
- Subline: estimación orientativa basada en Machine Learning, no un diagnóstico.
- Fondo con la escena 3D flotante descrita arriba, reactiva al scroll.
- CTAs: "Predecir mi riesgo" (gradiente verde→azul, principal) y "Saber más" (outline).
- Badges de confianza: "Basado en Machine Learning", "Orientación preventiva", "Datos verificados"

ELIGE TU MÓDULO (página /predict):
- Dos cards: "Estilo de vida" (sin exámenes médicos: IMC, presión, hábitos) y "Datos clínicos" (con laboratorio: HbA1c y glucosa, más preciso).
- Aclaración visible: "Ambos dan una estimación orientativa, no un diagnóstico."

FORMULARIO — MÓDULO ESTILO DE VIDA (/predict/lifestyle):
Sin datos de laboratorio, con tooltip de ayuda (ícono "i") en cada campo. Campos exactos que debe enviar el formulario (nombre → tipo/rango):
- BMI: decimal, 12–70
- Age: entero, bucket BRFSS 1–13 (1=18-24 años … 13=80+; mostrar como selector con rangos de edad legibles, no el número crudo)
- Sex: 0=mujer, 1=hombre
- GenHlth: entero 1–5 (1=excelente … 5=mala), selector con etiquetas
- MentHlth: entero 0–30 (días de mala salud mental, últimos 30)
- PhysHlth: entero 0–30 (días de mala salud física, últimos 30)
- HighBP, HighChol, CholCheck, Smoker, Stroke, HeartDiseaseorAttack, PhysActivity, Fruits, Veggies, HvyAlcoholConsump, AnyHealthcare, NoDocbcCost, DiffWalk: todos binarios (0/1), mostrar como toggle Sí/No con la pregunta en español natural
- Education: entero 1–6
- Income: entero 1–8
Organiza el formulario en secciones agrupadas (medidas básicas, salud percibida, hábitos, acceso a salud) con progreso visible.

FORMULARIO — MÓDULO DATOS CLÍNICOS (/predict/clinical):
- age: decimal 0–110
- bmi: decimal 10–80
- HbA1c_level: decimal 3.0–20.0 (hemoglobina glicosilada %)
- blood_glucose_level: entero 40–400 (mg/dL)
- hypertension: binario 0/1
- heart_disease: binario 0/1
- gender: "Female" | "Male" | "Other"
- smoking_history: "current" | "ever" | "former" | "never" | "not current" | "unknown"

PÁGINA DE RESULTADO (/result/[id]):
- Visualización animada tipo gauge/dona 3D del `risk_score` (0–1, mostrar como %) con color según `risk_category` ("low"=verde, "moderate"=ámbar, "high"=rojo).
- Lista de `top_factors` (feature + impacto + dirección "increases_risk"/"decreases_risk") como barras o chips, traducidos a lenguaje natural (ej. "Presión arterial alta" en vez de "HighBP").
- Disclaimer siempre visible: "Esta es una estimación orientativa generada por un modelo de Machine Learning, NO un diagnóstico médico. Consulta siempre a un profesional de salud."
- CTA hacia la sección de dietas según el nivel de riesgo obtenido.

DIETAS (/diets y /diets/[slug]):
- Tres planes según riesgo: alto ("Plan de acompañamiento de alto riesgo"), moderado ("Plan de control glucémico moderado"), bajo ("Plan de mantenimiento").
- Cada plan con dos columnas: "Recomendados" (alimento, ícono, porción, ejemplos) y "Evitar/Moderar" (alimento, ícono, razón).
- Nota final: "Orientación general, no un plan nutricional personalizado. Consulta a un nutricionista o médico."

AUTENTICACIÓN (/login, /register, /verify-email):
- Registro pide nombre, email y contraseña; verificación por código enviado al email.
- Login con email/contraseña.
- Los formularios de predicción (/predict/lifestyle y /predict/clinical) requieren sesión iniciada — si no hay sesión, redirigir a /login conservando la intención de volver al formulario.

INTEGRACIÓN CON EL BACKEND (respetar tal cual, ya está desplegado):
- Base URL configurable por variable de entorno (`NEXT_PUBLIC_API_URL`).
- `GET /health` → `{ "status": "ok" }`, útil para un indicador de estado del servicio.
- `POST /predict/lifestyle` → body = objeto con los campos exactos del formulario de estilo de vida descritos arriba.
- `POST /predict/clinical` → body = objeto con los campos exactos del formulario clínico descritos arriba.
- Ambos endpoints de predicción requieren header `Authorization: Bearer <access_token>` con el JWT de sesión de Supabase (mismo que usa el login) — sin este header responden 401.
- Respuesta de ambos endpoints (`PredictionOutput`):
  ```
  {
    "module": "lifestyle" | "clinical",
    "risk_score": number (0-1),
    "risk_category": "low" | "moderate" | "high",
    "top_factors": [{ "feature": string, "impact": number, "direction": "increases_risk" | "decreases_risk" }],
    "disclaimer": string
  }
  ```
- Manejo de errores: si el backend responde 500, mostrar mensaje genérico amable (el backend nunca expone detalles internos); si responde 401, redirigir a login.
- CORS ya está configurado en el backend para el/los orígenes del frontend — no asumas que necesitas un proxy intermedio.

ESTRUCTURA DE RUTAS A RESPETAR (Next.js App Router, ya definida):
`/`, `/predict`, `/predict/lifestyle`, `/predict/clinical`, `/result/[id]`, `/diets`, `/diets/[slug]`, `/login`, `/register`, `/verify-email`, `/admin/diets`, `/admin/diets/new`, `/admin/diets/[id]` (panel admin para gestionar los planes de dieta, protegido, no accesible desde la navegación pública).

NAVEGACIÓN Y HEADER:
- Logo "DiabetesRisk" (texto, sin necesidad de isotipo).
- Links: Inicio, Predecir, Dietas.
- Estado de sesión: "Iniciar sesión" si no hay usuario, avatar/menú si lo hay.
- Toggle de tema siempre visible junto al estado de sesión.
- Header sticky que se compacta al hacer scroll.

FOOTER:
- Fondo adaptado al tema activo (blanco en claro, negro puro en oscuro).
- Columnas: marca + misión breve, links rápidos, contacto, disclaimer legal/médico repetido brevemente.

MOBILE:
- Mobile-first, menú hamburguesa animado.
- Formularios largos (lifestyle) paginados por pasos en mobile, con barra de progreso.
- Escena 3D del hero simplificada/estática en mobile de gama baja para no afectar performance.

CARACTERÍSTICAS TÉCNICAS:
- Totalmente responsive.
- Modo oscuro real a nivel de toda la app (layout, auth, predict, dietas, admin), no solo una sección.
- Loading states y skeletons mientras se espera la respuesta de `/predict/*` (puede tardar por el cálculo de SHAP).
- Accesibilidad: contraste correcto en ambos temas, `prefers-reduced-motion` respetado en todas las animaciones y escenas 3D.
- El diseño debe transmitir claridad y confianza clínica, con un toque visual moderno gracias a los elementos 3D — nunca sacrificar legibilidad de datos médicos por estética.
