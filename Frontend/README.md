# Frontend Next.js — Fase 4 (auth + guards, listo y verificado)

## Ejecutar en local

```bash
cd Frontend
cp .env.local.example .env.local   # ya trae la URL/anon key de tu Supabase
npm install
npm run dev
```

Abre `http://localhost:3000`.

## Qué hay ya

- **Registro** (`/register`) → dispara automáticamente el correo con código de 6 dígitos
  (la plantilla bonita que configuraste en Supabase).
- **Verificación** (`/verify-email`) → input de 6 dígitos, `supabase.auth.verifyOtp(...)`, botón
  de reenviar código.
- **Login** (`/login`) → si el email aún no está confirmado, manda directo a verificar.
- **Guard real en servidor** (`proxy.ts`, antes "middleware" — Next.js 16 renombró el archivo):
  entrar a `/predict` o `/admin` sin sesión redirige a `/login?redirect=...` y, tras loguearte,
  vuelve exactamente a donde ibas. `/admin` además verifica `role='admin'` consultando la tabla
  `profiles` (protegida por RLS) — un usuario normal que fuerce la URL es redirigido a inicio.
- Paleta: fondo blanco, acentos verde/azul (a juego con el correo de verificación), como pediste.

## Verificado

```
npm install   -> 62 paquetes, sin errores
npm run build -> build de producción sin errores (Next 16.2.10 + Turbopack)
```

Rutas generadas: `/` y `/login`/`/register`/`/verify-email` estáticas; `/predict` y `/admin`
dinámicas (necesitan leer la sesión en cada request, correcto para contenido protegido).

## Fase 5 — landing (ya construida)

`/` ahora es la landing narrativa completa de 6 secciones del plan: hero a pantalla completa,
"¿qué es la diabetes?", "¿cómo se desarrolla?" (con un diagrama propio en SVG de glucosa/insulina),
concientización de tabaco/alcohol + otros factores de riesgo, afectaciones (visión/riñón/corazón/
nervios) y disclaimer + CTA final. CTA sticky "Predecir mi riesgo" aparece al pasar el hero.

**Sobre Higgsfield:** revisé tu cuenta — el plan más barato ahora es **PLUS a $49/mes** (no hay
plan de $19; ver nota completa en mi respuesta). Como pediste hacerlo sin Higgsfield si superaba
los $19, construí la landing con diseño 100% propio: gradientes, tipografía, e ilustraciones en
SVG hechas a mano (el diagrama de glucosa, los íconos de cigarro/botella tachados) en vez de
imágenes generadas. Si más adelante compras créditos, esos huecos son fáciles de reemplazar por
imágenes reales sin tocar la estructura.

**Sobre impeccable / taste-skill / emil-design-eng:** son skills de **Claude Code/Cursor que se
instalan en tu propia máquina** (así lo dice el propio PLAN_MAESTRO sec 16) — no están disponibles
para mí aquí en Cowork, no aparecen en mi lista de skills. Apliqué sus principios de memoria
directamente en el código (jerarquía tipográfica fuerte, spacing consistente, animaciones de UI
<300ms con easing propio vía `motion`, `prefers-reduced-motion` respetado en `components/Reveal.tsx`
y `StickyPredictButton.tsx`). Si más adelante abres este proyecto en Claude Code/Cursor con esas
skills instaladas, puedes correr `/impeccable audit` sobre lo que ya hice como una segunda pasada.

Animaciones: scroll-reveal narrativo (~600ms, una vez por sección) en `Reveal.tsx`, y
micro-interacciones de botones/CTA (<300ms, easing personalizado) en los `<Link>`/`<button>`.

## Fase 6 — predicción y dietas (ya construida)

- `/predict` → selector de módulo (estilo de vida / clínico).
- `/predict/lifestyle` y `/predict/clinical` → formularios reales con los campos exactos que
  espera la API, agrupados por sección, validación de rangos, feedback de error legible.
- Al enviar: llama a la API con el `access_token` de la sesión (`lib/api.ts`), guarda el resultado
  en `predictions` (RLS: solo tú lo ves) y redirige a `/result/[id]`.
- `/result/[id]` → gauge animado con el % de riesgo, categoría con color, factores que más
  influyeron (SHAP local, con flechas de sube/baja riesgo), disclaimer, y botón a la dieta
  recomendada según tu categoría (tabla `recommendations`).
- `/diets` y `/diets/[slug]` → galería pública de dietas (lectura sin login, por RLS) con
  alimentos recomendados/a evitar.

Verificado: `npm run build` sin errores con las 11 rutas (antes eran 7); tuve que corregir un tipo
(`input_data` no aceptaba `Record<string, unknown>` directo contra el tipo `Json` generado por
Supabase — ahora se serializa con `JSON.parse(JSON.stringify(...))` antes de insertar).

## Fase 7 (pendiente)

CRUD real del panel admin (`/admin/diets`) + estadísticas (usuarios, predicciones, distribución de
riesgo).

## Desplegar en Railway (decisión de Angel)

1. En el mismo proyecto de Railway del backend: **+ New → GitHub Repo** (mismo repo otra vez) →
   **Settings → Root Directory** = `Frontend`.
2. Nixpacks detecta Next.js solo. Start Command por defecto (`npm run build` + `npm start`) ya
   funciona, no hace falta tocarlo.
3. **Variables**: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`,
   `NEXT_PUBLIC_API_URL` = la URL pública que le generaste al servicio de la API (Backend/README.md).
4. **Settings → Networking → Generate Domain** para la URL pública del frontend.
5. Vuelve al servicio de la API y pon `FRONTEND_ORIGINS` = esa URL del frontend (para que el CORS
   la acepte).

(Vercel sigue siendo gratis para el frontend si en algún punto prefieres separarlo de Railway —
mismos pasos de variables, solo cambia dónde lo conectas.)
