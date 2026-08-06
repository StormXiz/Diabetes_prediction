"""Modelos Pydantic de entrada/salida. Los rangos vienen literalmente de
`models/feature_schema_*.json` (generados en la Fase 1 de ML) para que el
backend rechace valores imposibles ANTES de tocar el modelo
[PLAN_MAESTRO sec 7 y 14]. Si algún día se reentrena el modelo con otros
rangos, hay que actualizar estos Field(...) a mano para que sigan igualados.
"""
from __future__ import annotations

from typing import Literal

from pydantic import BaseModel, Field


class LifestyleInput(BaseModel):
    BMI: float = Field(..., ge=12, le=70, description="Índice de masa corporal")
    MentHlth: int = Field(..., ge=0, le=30, description="Días de mala salud mental (últimos 30)")
    PhysHlth: int = Field(..., ge=0, le=30, description="Días de mala salud física (últimos 30)")
    HighBP: Literal[0, 1]
    HighChol: Literal[0, 1]
    CholCheck: Literal[0, 1] = Field(..., description="¿Se ha revisado el colesterol en los últimos 5 años?")
    Smoker: Literal[0, 1]
    Stroke: Literal[0, 1]
    HeartDiseaseorAttack: Literal[0, 1]
    PhysActivity: Literal[0, 1]
    Fruits: Literal[0, 1]
    Veggies: Literal[0, 1]
    HvyAlcoholConsump: Literal[0, 1]
    AnyHealthcare: Literal[0, 1]
    NoDocbcCost: Literal[0, 1] = Field(..., description="¿No fue al médico por costo en el último año?")
    DiffWalk: Literal[0, 1] = Field(..., description="¿Dificultad seria para caminar/subir escaleras?")
    Sex: Literal[0, 1] = Field(..., description="0 = mujer, 1 = hombre (codificación BRFSS)")
    GenHlth: int = Field(..., ge=1, le=5, description="Salud general autopercibida (1=excelente..5=mala)")
    Age: int = Field(..., ge=1, le=13, description="Bucket de edad BRFSS (1=18-24 ... 13=80+)")
    Education: int = Field(..., ge=1, le=6)
    Income: int = Field(..., ge=1, le=8)


class ClinicalInput(BaseModel):
    age: float = Field(..., ge=0, le=110)
    bmi: float = Field(..., ge=10, le=80)
    HbA1c_level: float = Field(..., ge=3.0, le=20.0, description="Hemoglobina glicosilada (%)")
    blood_glucose_level: int = Field(..., ge=40, le=400, description="Glucosa en sangre (mg/dL)")
    hypertension: Literal[0, 1]
    heart_disease: Literal[0, 1]
    gender: Literal["Female", "Male", "Other"]
    smoking_history: Literal["current", "ever", "former", "never", "not current", "unknown"]


class TopFactor(BaseModel):
    feature: str
    impact: float
    direction: Literal["increases_risk", "decreases_risk"]


class PredictionOutput(BaseModel):
    module: Literal["lifestyle", "clinical"]
    risk_score: float = Field(..., ge=0, le=1, description="Probabilidad calibrada de riesgo (0-1)")
    risk_category: Literal["low", "moderate", "high"]
    threshold_used: float = Field(
        ..., ge=0, le=1,
        description="Umbral de decisión usado para asignar risk_category, elegido en el set de "
                     "validación (nunca en test) maximizando F1 con una restricción de recall >= 80%.",
    )
    top_factors: list[TopFactor]
    disclaimer: str = (
        "Esta es una estimación orientativa generada por un modelo de Machine Learning, "
        "NO un diagnóstico médico. Consulta siempre a un profesional de salud."
    )
