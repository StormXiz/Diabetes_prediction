# Despliegue en Railway — diabetesrisk.shop

Dos servicios separados en el mismo proyecto de Railway, cada uno con su
propio `Dockerfile` (ya probados localmente con `docker compose up`):
`Backend/api` (FastAPI) y `Frontend` (Next.js). No hay login/cuentas — el
backend no verifica sesión, así que no hace falta ninguna variable de
Supabase Auth.

Dominio ya comprado: `diabetesrisk.shop`. Este documento asume:

- `https://diabetesrisk.shop` → frontend
- `https://api.diabetesrisk.shop` → backend

## 1. Backend (`Backend/api`)

1. Railway → **New Project** → **Deploy from GitHub repo**.
2. **Settings → Root Directory**: `Backend/api`. Railway detecta el
   `Dockerfile` solo (Builder = Dockerfile); no hace falta Start Command.
3. **Variables**:
   - `FRONTEND_ORIGINS=https://diabetesrisk.shop` (única variable que lee
     `config.py` — sin ella el CORS bloquea al frontend).
4. **Settings → Networking → Custom Domain** → añade `api.diabetesrisk.shop`
   y crea el registro CNAME que te indique Railway en tu proveedor de DNS del
   dominio.
5. Verificar: `https://api.diabetesrisk.shop/health` → `{"status":"ok"}`.

## 2. Frontend (`Frontend`)

1. En el mismo proyecto: **New Service** → mismo repo.
2. **Settings → Root Directory**: `Frontend`.
3. Las variables `NEXT_PUBLIC_*` quedan horneadas en el bundle en **build
   time**, así que van como **Build Arguments** (Settings → Build → Docker
   Build Arguments), no solo como variables de runtime:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `NEXT_PUBLIC_API_URL=https://api.diabetesrisk.shop`
4. **Variables** de runtime (Settings → Variables) — repetir las mismas
   `NEXT_PUBLIC_*` de arriba, más:
   - `OPENAI_API_KEY`
   - `OPENAI_MODEL=gpt-5-mini`
5. **Settings → Networking → Custom Domain** → añade `diabetesrisk.shop` (y
   `www.diabetesrisk.shop` si quieres redirigir el www) y crea los registros
   DNS que indique Railway.

## 3. Verificación final

- `https://diabetesrisk.shop` carga sin error.
- `/predecir` (lifestyle y clínico) hace la predicción real: en la pestaña
  Network del navegador la llamada debe ir a `https://api.diabetesrisk.shop`,
  nunca a `localhost` ni a un nombre de servicio interno de Docker.
- El botón "Descargar PDF" en una dieta genera el archivo sin errores de
  consola.
- El chatbot flotante responde (usa `OPENAI_API_KEY` del backend de Next.js,
  no del navegador).

## Notas

- No commitear nunca un `.env` real — usar `.env.example` (raíz) como
  referencia y cargar los valores reales directo en el dashboard de Railway.
- `NEXT_PUBLIC_SUPABASE_URL`/`ANON_KEY` solo se usan para leer contenido
  público (dietas, tabla de alimentos) — no hay sesiones ni cuentas de
  usuario, por eso no hace falta tocar nada de Auth en el dashboard de
  Supabase.
- La versión fijada `scikit-learn==1.7.2` en `Backend/api/requirements.txt`
  es intencional (coincide con la versión usada al entrenar los `.joblib`);
  no actualizarla sin volver a entrenar/serializar los modelos.
