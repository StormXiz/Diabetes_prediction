"""API FastAPI que sirve el modelo de riesgo de diabetes [PLAN_MAESTRO sec 7].

Ejecutar en local:
    cd Backend/api
    uvicorn main:app --reload --port 8000

Documentación interactiva en /docs (Swagger) una vez levantada.
"""
from __future__ import annotations

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware

from config import FRONTEND_ORIGINS
from schemas import ClinicalInput, LifestyleInput, PredictionOutput
from services import predict as predict_service

app = FastAPI(
    title="Diabetes Risk API",
    description=(
        "Estima el riesgo de diabetes tipo 2 a partir de datos de estilo de vida o "
        "clínicos. Esto NO es un diagnóstico médico."
    ),
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=FRONTEND_ORIGINS,
    allow_credentials=True,
    allow_methods=["GET", "POST"],
    allow_headers=["Authorization", "Content-Type"],
)


@app.on_event("startup")
def _startup():
    # Carga modelos + preprocesadores + SHAP explainers una sola vez (no por request).
    predict_service.warm_up()


@app.get("/health")
def health():
    return {"status": "ok"}


@app.post("/predict/lifestyle", response_model=PredictionOutput)
def predict_lifestyle(payload: LifestyleInput):
    try:
        result = predict_service.predict_lifestyle(payload.model_dump())
    except Exception as exc:  # nunca devolver detalles internos del modelo al cliente
        raise HTTPException(status_code=500, detail="Error al calcular la predicción.") from exc
    return result


@app.post("/predict/clinical", response_model=PredictionOutput)
def predict_clinical(payload: ClinicalInput):
    try:
        result = predict_service.predict_clinical(payload.model_dump())
    except Exception as exc:
        raise HTTPException(status_code=500, detail="Error al calcular la predicción.") from exc
    return result
