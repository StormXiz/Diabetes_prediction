# API FastAPI — Fase 2 (lista y verificada)

## Ejecutar en local

```bash
conda activate diabetes          # entorno creado en Fase 1 (ver ml/README.md)
cd Backend/api
pip install -r requirements.txt  # subset liviano solo para servir el modelo
cp .env.example .env             # y pega tu SUPABASE_JWT_SECRET si ya lo tienes
uvicorn main:app --reload --port 8000
```

Documentación interactiva: `http://localhost:8000/docs`.

## Endpoints

- `GET /health` — sin auth, para healthchecks del hosting.
- `POST /predict/lifestyle` — requiere `Authorization: Bearer <access_token de Supabase>`.
- `POST /predict/clinical` — igual.

Los dos devuelven `{ module, risk_score, risk_category, top_factors, disclaimer }`.
`top_factors` es SHAP **local** (de esa predicción concreta, no el promedio global) — cada
factor trae `direction: increases_risk | decreases_risk`.

## Verificado en esta fase (sin tener aún un usuario real registrado)

- `GET /health` → 200.
- `POST /predict/lifestyle` **sin token** → 401 (el guard real bloquea, no solo el del frontend).
- Payload con `BMI=200` (imposible) → 422 de Pydantic, nunca llega al modelo.
- Con token simulado válido → 200, predicción coherente (probé con SHAP local, factores con
  sentido médico: HbA1c/glucosa arriba en clínico, GenHlth/HighBP/BMI arriba en lifestyle).
- Verificación JWT real (HS256) probada de forma aislada: token firmado con el secreto correcto
  se acepta; firmado con secreto incorrecto se rechaza; token expirado se rechaza.
- Mismo preprocesador de Fase 1 (sin reajustar) → sin fuga de datos entre training y producción.

Lo único que falta para probar con un usuario 100% real es tener `SUPABASE_JWT_SECRET`
configurado y un usuario registrado y verificado por email (Fase 3 ya lo soporta) — eso llega con
el frontend en la Fase 4.

## Desplegar en Railway (decisión de Angel: todo en un solo sitio, de pago)

Railway ya no tiene trial gratis para esta cuenta — desde el plan **Hobby (~$5/mes** de crédito
de uso, se cobra lo que consumas) puedes desplegar. Como es un monorepo con Frontend y Backend en
carpetas separadas, creas **dos servicios** dentro del mismo proyecto de Railway, cada uno
apuntando a una carpeta distinta del mismo repo:

1. [railway.app](https://railway.app) → **New Project** → **Deploy from GitHub repo** → elige el
   repo `Diabetes_prediction`.
2. En el servicio que crea automáticamente (o creando uno nuevo con **+ New → GitHub Repo** otra
   vez sobre el mismo repo): abre **Settings → Root Directory** y pon `Backend/api`.
3. Railway detecta Python solo (Nixpacks) por el `requirements.txt`. En **Settings → Deploy**:
   - Start Command: `uvicorn main:app --host 0.0.0.0 --port $PORT`
4. En **Variables** de ese servicio, añade: `SUPABASE_URL`, `SUPABASE_ANON_KEY`,
   `SUPABASE_JWT_SECRET` (la misma que ya pusiste en tu `.env` local), `FRONTEND_ORIGINS` (la
   rellenas cuando tengas la URL del servicio de frontend, ver `Frontend/README.md`).
5. **Settings → Networking → Generate Domain** para obtener la URL pública
   (`https://tu-api.up.railway.app`). Prueba: `curl https://tu-api.up.railway.app/health`.

Los archivos `.joblib`/`.json` de `models/` viajan dentro del repo (son el modelo entrenado en
Fase 1); no hace falta reentrenar en el servidor.

Si en algún momento prefieres no pagar, Render tiene un free tier real (1GB RAM, sin tarjeta) — te
dejé `render.yaml` en la raíz del repo listo para ese camino sin tocar nada más.
