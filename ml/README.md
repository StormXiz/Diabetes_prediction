# Entorno "diabetes" (conda) — para tu Mac

Yo ejecuté y verifiqué todo este pipeline en un sandbox Linux propio (no en tu Mac), así que
lo que necesitas aquí son los comandos exactos para recrear el mismo entorno localmente y
seguir trabajando (notebooks, próximas fases de API, etc.).

## 1. Crear el entorno

```bash
# Si no tienes Miniconda/Anaconda instalado: https://docs.conda.io/en/latest/miniconda.html
conda create -n diabetes python=3.10 -y
conda activate diabetes
```

## 2. Instalar dependencias (desde la raíz del proyecto)

```bash
cd /ruta/a/Diabetes_prediction
pip install -r requirements.txt
```

Esto instala numpy, pandas, scikit-learn, xgboost==2.1.4 (fijado por compatibilidad con SHAP,
ver nota en `requirements.txt`), lightgbm, imbalanced-learn, shap, optuna, matplotlib, seaborn,
joblib, fastapi/uvicorn/pydantic (para la Fase 2 - API) y el resto del `requirements.txt`.

## 3. Verificar

```bash
python -c "import numpy, pandas, sklearn, xgboost, lightgbm, imblearn, shap, optuna, fastapi; print('entorno diabetes OK')"
```

## 4. Cómo entrar cada vez que abras una terminal nueva

```bash
conda activate diabetes
cd /ruta/a/Diabetes_prediction
```

Para salir: `conda deactivate`.

## 5. Reproducir el pipeline de Fase 1 (ya ejecutado, resultados en `ml/reports/`)

Ver el paso a paso en `ml/reports/FASE1_RESULTADOS.md`, sección 8.

## 6. Nota sobre el frontend (Next.js) y las skills de diseño

El entorno conda `diabetes` es solo para la parte Python (ML + API FastAPI de las fases 1-2).
El frontend (Next.js/React) usa Node/npm y vive en su propio `package.json` dentro de `Frontend/`
— no depende de este entorno conda. Las skills de diseño (`emil-design-eng`, `impeccable`,
`taste-skill`) también se instalan vía `npx` en la raíz del proyecto Frontend, no en conda
(ver PLAN_MAESTRO.md sección 16). Esa parte te tocará instalarla a ti en tu terminal cuando
lleguemos a la Fase 4-5 (frontend), porque `npx` necesita ejecutarse en tu máquina real.
