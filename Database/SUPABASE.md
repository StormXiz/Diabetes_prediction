# Supabase — Fase 3 (configurado)

Proyecto: **Diabetes_prediction** (`swgqlrbztvqikkyitqtx`, org `StormXiz's Org`, región us-west-2).

## 1. Credenciales para Frontend / API

```
NEXT_PUBLIC_SUPABASE_URL=https://swgqlrbztvqikkyitqtx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN3Z3FscmJ6dHZxaWtreWl0cXR4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODI5OTI3MTAsImV4cCI6MjA5ODU2ODcxMH0.MsZZtWDFKUoNNFIipiqAushqXyLDf64HC-4Cv5gGli0
# Alternativa moderna (recomendada para proyectos nuevos):
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_1xUGZgp41ev7hQoMfnWuRw_CaDS-Syy
```

⚠️ **`SUPABASE_SERVICE_ROLE_KEY` NO se incluye aquí a propósito** — es secreta, va SOLO en el
backend (FastAPI/servidor), nunca en el frontend ni commiteada. Sácala tú mismo de
Settings → API → Project API keys en el dashboard de Supabase, y ponla como variable de entorno
del servidor (Render/Railway), nunca en `NEXT_PUBLIC_*`.

## 2. Esquema creado

- **`profiles`** (`id` FK a `auth.users`, `full_name`, `role` user/admin, `created_at`).
  Se llena solo mediante un **trigger** (`on_auth_user_created`) al registrarse — no se inserta
  manualmente nunca.
- **`predictions`** (historial de predicciones: `module`, `input_data` jsonb, `risk_score`,
  `risk_category`, `top_factors` jsonb).
- **`diets`** / **`foods`** / **`recommendations`** (contenido de dietas gestionado por admin,
  con mapeo `risk_category -> diet_id`).
- Bucket de Storage **`diet-images`** (público de lectura por URL, escritura solo admin).

## 3. RLS — resumen verificado

| Tabla | SELECT | INSERT | UPDATE | DELETE |
|---|---|---|---|---|
| `profiles` | propia fila o admin | (solo vía trigger) | solo admin directo; el propio usuario usa RPC `update_my_profile(full_name)` que NO permite tocar `role` | — |
| `predictions` | propias o admin | propias (`user_id = auth.uid()`) | — (inmutables) | propias (el usuario puede borrar su historial) |
| `diets` | públicas si `is_published=true`, o admin | admin | admin | admin |
| `foods` | de dietas publicadas, o admin | admin | admin | admin |
| `recommendations` | pública (mapeo sin datos sensibles) | admin | admin | admin |
| `diet-images` (bucket) | pública por URL directa | admin | admin | admin |

Verificado con `pg_policies`/`pg_class.relrowsecurity`: **RLS activo en las 5 tablas**, políticas
presentes tal cual la tabla de arriba. Seed de prueba: 3 dietas publicadas, 9 alimentos, 3
recomendaciones (una por categoría de riesgo).

## 4. `is_admin()` — cómo funciona el control de rol

Función SQL `SECURITY DEFINER` que comprueba `profiles.role = 'admin'` para `auth.uid()`. Se usa
dentro de las políticas RLS de todas las tablas de contenido. **El rol se valida en la base de
datos, nunca en el frontend** (cumple sección 12 del plan).

## 5. Advisors de seguridad ejecutados

Se corrió `get_advisors(type=security)` dos veces:

1ª pasada encontró 2 problemas reales, ya corregidos:
- Bucket público con policy de SELECT que permitía **listar** todos los archivos → se eliminó
  (el bucket público ya sirve objetos por URL directa sin necesitar esa policy).
- `handle_new_user()` (función del trigger) era invocable manualmente vía RPC por cualquiera →
  se revocó `EXECUTE` de `public`/`anon`/`authenticated` (solo la usa el trigger internamente).

2ª pasada: quedan 3 WARN **aceptados y documentados** (no son fallos):
- `is_admin()` es invocable por `anon`/`authenticated` vía RPC — es intencional: las políticas de
  lectura pública de `diets`/`foods`/`recommendations` la llaman incluso sin sesión. Es de solo
  lectura, sin argumentos, no expone nada sensible (solo `true`/`false`).
- `update_my_profile(text)` es invocable por `authenticated` — es su propósito: permite que el
  usuario edite su propio nombre sin poder tocar `role` (la función solo actualiza `full_name`
  y solo la fila de `auth.uid()`).

## 6. Cómo crear tu cuenta admin (Angel)

No hay credenciales hardcodeadas en ningún sitio (cumple sección 12/14 del plan). Pasos:

1. Regístrate normalmente en la web (Fase 4) con tu email — esto crea tu fila en `profiles` con
   `role='user'` automáticamente vía el trigger.
2. Sube tu rol a admin ejecutando esto en el **SQL Editor de Supabase** (o pídemelo y lo hago yo
   por ti con las herramientas MCP una vez tengas tu usuario creado):

```sql
update public.profiles set role = 'admin' where id = (
  select id from auth.users where email = 'tu-email@ejemplo.com'
);
```

## 7. RPC `admin_dashboard_stats()` — Fase 7

Función SQL que devuelve TODO lo que necesita el dashboard admin en una sola llamada (evita que
el frontend haga media docena de queries sueltas). Protegida en base de datos: si quien llama no
tiene `role='admin'`, lanza excepción `not authorized` (verificado — probé la llamada sin sesión
de admin y falló como debía).

**Contrato (para quien construya el frontend):**
```ts
const { data, error } = await supabase.rpc('admin_dashboard_stats')
// data: {
//   total_users: number
//   total_predictions: number
//   predictions_by_module: { lifestyle?: number; clinical?: number }
//   risk_distribution: { low?: number; moderate?: number; high?: number }
//   predictions_last_14_days: { date: string; count: number }[]   // para un sparkline/gráfica de tendencia
//   diets_total: number
//   diets_published: number
//   foods_total: number
// }
```

CRUD de `diets`/`foods` (crear, editar, publicar/despublicar, borrar) NO necesita una función
especial: se hace con inserts/updates/deletes normales del cliente Supabase — la RLS ya solo deja
hacerlo si `role='admin'` (políticas `diets_write_admin_only` / `foods_write_admin_only`).

## 8. Pendiente / recomendado

- Cuando exista tu usuario real, avísame para ejecutar el `UPDATE` de admin y para reasignar
  `created_by` de las 3 dietas semilla a tu `user_id`.
- **Recomendado (2 min, dashboard):** el linter de seguridad marca "Leaked Password Protection
  Disabled" — en **Authentication → Sign In / Providers → Email**, activa la verificación contra
  HaveIBeenPwned para que no se puedan usar contraseñas ya filtradas. Es otro ajuste de Auth que
  no puedo tocar yo por API, igual que la plantilla de email.
