# Brief para Claude Code — Fase 7 (panel admin) y pulido visual

> Angel: a partir de aquí el frontend lo trabajas tú con Claude Code/Cursor en tu máquina (con las
> skills de diseño instaladas de verdad). Este documento es el traspaso: contexto, contrato de
> datos, y la dirección creativa que me pediste. Bórralo cuando ya no lo necesites, no es parte de
> la app.

## 1. Contexto — qué ya existe (no reinventar)

El proyecto sigue `PLAN_MAESTRO.md` (en la raíz del repo, o recupéralo del historial de git si ya
no está — `git log` → primer commit). Fases 1-6 completas y verificadas:

- **ML** (`ml/`): modelos XGBoost para los 2 módulos, artefactos en `Backend/api/models/`.
- **API FastAPI** (`Backend/api/`): `/predict/lifestyle`, `/predict/clinical`, JWT de Supabase.
- **Supabase** (`Database/SUPABASE.md`): tablas `profiles/predictions/diets/foods/recommendations`,
  RLS completo, RPC `admin_dashboard_stats()` (contrato abajo, sección 3).
- **Frontend ya construido**: auth completa (registro con código OTP por email, login, guard real
  en `proxy.ts`), landing narrativa de 6 secciones en `/`, formularios de predicción en
  `/predict/lifestyle` y `/predict/clinical`, página de resultado `/result/[id]` con gauge
  animado, galería de dietas `/diets` + `/diets/[slug]`. `/admin` existe como placeholder
  protegido (ya verifica `role='admin'` en servidor) — **eso es lo que falta construir de verdad**.

**Sistema de diseño ya establecido — sé consistente con esto, no arranques de cero:**
- Paleta: fondo blanco, acentos `emerald-600`/`#059669` y `blue-600`/`#2563eb` en gradiente,
  texto `slate-900`/`slate-600`. Nada de dark mode (Angel lo pidió explícitamente así).
- `components/Reveal.tsx`: scroll-reveal narrativo (~600ms, una vez por sección, respeta
  `prefers-reduced-motion` vía `useReducedMotion` de `motion/react`).
- `components/StickyPredictButton.tsx`: patrón de micro-interacción de UI (<300ms, easing
  `cubic-bezier(0.16,1,0.3,1)`, no `ease` por defecto).
- `components/forms.tsx`: inputs reutilizables (`NumberField`, `SelectField`, `YesNoField`,
  `FormSection`) ya usados en los formularios de predicción.
- Librería de animación: `motion` (no `framer-motion`, es el mismo proyecto renombrado — importa
  de `"motion/react"`).

## 2. Instalar las skills de diseño (esto sí es tuyo, en tu máquina)

Desde la raíz de `Frontend/`, en tu terminal con Claude Code/Cursor:

```bash
npx skills add emilkowalski/skill
npx impeccable install
# luego, dentro de Claude Code/Cursor:
/impeccable init
npx skills add https://github.com/Leonxlnx/taste-skill --skill "design-taste-frontend"
```

(Yo no pude instalarlas ni ejecutarlas — no están disponibles en mi entorno Cowork, son skills que
viven en tu instalación local de Claude Code/Cursor.)

Úsalas para: revisar cada pantalla nueva con `/impeccable audit` antes de darla por terminada,
aplicar el criterio de `taste-skill` en composición/spacing/jerarquía, y usar los principios de
Emil Kowalski para toda animación de UI (no solo el dashboard — repásalas también sobre lo que ya
construí, es una segunda pasada válida sobre Fases 4-6 si detectas algo mejorable).

## 3. Dirección creativa que pidió Angel: "que el dashboard cuente una historia"

Angel fue explícito: quiere que el panel admin **no se sienta como una tabla aburrida de admin
genérico** — que sea "súper visual", "entretenido", que **cuente una historia**, en la misma línea
narrativa que la landing (`app/page.tsx`, sección por sección con propósito). Algunas ideas
concretas para inspirarte (no son obligatorias al pie de la letra, es la dirección):

- Los números no aparecen fríos: usa **contadores animados** (count-up) al cargar, no solo texto
  estático.
- Enmarca las métricas como una narrativa, no una tabla: p. ej. en vez de "total_predictions: 128"
  a secas, algo como "128 personas ya se hicieron una pregunta sobre su salud esta semana" con el
  número como protagonista tipográfico.
- La distribución de riesgo (`risk_distribution`) es una oportunidad visual fuerte — un gráfico de
  dona o barras con los mismos colores de categoría que ya uso en `/result/[id]`
  (`low`=emerald `#059669`, `moderate`=amber `#d97706`, `high`=red `#dc2626`), no una tabla de
  números.
- `predictions_last_14_days` está pensado para un sparkline/gráfica de tendencia con animación de
  entrada (la línea "se dibuja" al aparecer) — cuenta la evolución, no solo el estado actual.
- Estados vacíos (0 dietas, 0 predicciones) también merecen diseño, no un "No data" gris plano.
- Micro-interacciones en las acciones de CRUD (guardar, publicar, borrar) con feedback claro y
  rápido (<300ms), coherente con `StickyPredictButton.tsx`.

La meta es que se sienta como una extensión de la misma app cuidada de la landing, no un panel de
WordPress. Sin caer en "AI slop": nada de gradientes genéricos porque sí, nada de iconos random sin
propósito — cada elemento visual debe explicar algo real de los datos.

## 4. Alcance funcional de la Fase 7

Rutas a construir dentro de `/admin`:

- `/admin` (ya existe, conviértela en el dashboard real): consume `supabase.rpc('admin_dashboard_stats')`.
- `/admin/diets`: listado + crear/editar/publicar-despublicar/borrar dietas. CRUD directo contra
  la tabla `diets` con el cliente de Supabase — la RLS ya solo lo permite si `role='admin'`, no
  hace falta ningún endpoint especial.
- Alimentos (`foods`) — puede ser una sub-sección dentro del editor de cada dieta (recomendado:
  formulario inline, categoría `recommended` / `avoid`).
- Subida de imágenes: bucket `diet-images` en Storage (público de lectura, escritura solo admin —
  ya configurado). Usa `supabase.storage.from('diet-images').upload(...)`.

### Contrato de la RPC de stats

```ts
const { data, error } = await supabase.rpc('admin_dashboard_stats')
// data: {
//   total_users: number
//   total_predictions: number
//   predictions_by_module: { lifestyle?: number; clinical?: number }
//   risk_distribution: { low?: number; moderate?: number; high?: number }
//   predictions_last_14_days: { date: string; count: number }[]
//   diets_total: number
//   diets_published: number
//   foods_total: number
// }
```

Si quien llama no es admin, `error` viene con `"not authorized"` (verificado en base de datos, no
confíes solo en esconder el link en el menú).

## 5. Checklist antes de dar la fase por terminada (PLAN_MAESTRO sec 12 y 13)

- [ ] Un usuario no-admin que fuerce `/admin` por URL es redirigido (ya lo hace `proxy.ts` +
      el check en `app/admin/page.tsx` — no lo quites al reescribir la página).
- [ ] CRUD de dietas/alimentos probado con un usuario admin real.
- [ ] Animaciones de UI <300ms con easing propio; scroll/narrativas más largas están bien si tienen
      propósito. `prefers-reduced-motion` respetado en todo lo nuevo.
- [ ] Responsive (el admin también se usa desde el cel, aunque sea Angel el único usuario).
- [ ] Pasa `/impeccable audit` sin señales de "AI slop".
