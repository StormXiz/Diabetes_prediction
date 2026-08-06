"""Carga los modelos/preprocesadores UNA SOLA VEZ al arrancar la API
[PLAN_MAESTRO sec 7] y expone `predict_lifestyle` / `predict_clinical`.

Usa el MISMO preprocesador serializado en la Fase 1 de ML (ajustado solo con
train) — nunca se reajusta aquí, así se evita cualquier fuga de datos y se
garantiza que training y producción transforman los datos idéntico.
"""
from __future__ import annotations

import json
from pathlib import Path

import joblib
import numpy as np
import pandas as pd
import shap

from config import MODELS_DIR

_CACHE: dict = {}


def _fix_xgboost_shap_compat(model):
    """Ver ml/src/finalize.py: workaround para el bug de compatibilidad
    shap<->xgboost donde `base_score` se serializa como '[5E-1]' y shap
    falla al hacer float() directo. Defensivo por si la versión de xgboost
    del entorno de despliegue difiere de la usada en entrenamiento (2.1.4)."""
    try:
        booster = model.get_booster()
        cfg = json.loads(booster.save_config())
        bs = cfg["learner"]["learner_model_param"]["base_score"]
        if isinstance(bs, str) and bs.startswith("["):
            cfg["learner"]["learner_model_param"]["base_score"] = bs.strip("[]")
            booster.load_config(json.dumps(cfg))
    except Exception:
        pass
    return model


def _load_module(module: str) -> dict:
    if module in _CACHE:
        return _CACHE[module]

    model = joblib.load(MODELS_DIR / f"model_{module}.joblib")
    model = _fix_xgboost_shap_compat(model)
    preprocessor = joblib.load(MODELS_DIR / f"preprocessor_{module}.joblib")
    with open(MODELS_DIR / f"feature_schema_{module}.json") as f:
        schema = json.load(f)

    # Calibrador de probabilidades (IsotonicRegression fit en VAL, ver
    # ml/src/optimize_lifestyle.py) — se aplica DESPUÉS de
    # model.predict_proba(), nunca se le pasa al TreeExplainer de SHAP (que
    # necesita el booster de XGBoost crudo, no una probabilidad recalibrada).
    calibrator_path = MODELS_DIR / f"calibrator_{module}.joblib"
    calibrator = joblib.load(calibrator_path) if schema.get("calibrated") and calibrator_path.exists() else None

    explainer = shap.TreeExplainer(model)

    entry = {
        "model": model, "preprocessor": preprocessor, "schema": schema,
        "explainer": explainer, "calibrator": calibrator,
    }
    _CACHE[module] = entry
    return entry


def _calibrated_proba(entry: dict, X_t) -> float:
    raw_proba = float(entry["model"].predict_proba(X_t)[:, 1][0])
    calibrator = entry["calibrator"]
    if calibrator is None:
        return raw_proba
    # IsotonicRegression.predict espera un array 1D de scores crudos.
    return float(calibrator.predict(np.array([raw_proba]))[0])


def warm_up():
    """Llamado en el startup de FastAPI para cargar todo antes del primer request."""
    _load_module("lifestyle")
    _load_module("clinical")


def _risk_category(proba: float, threshold: float) -> str:
    # Ver config.py: bandas relativas al umbral desplegado (recall-first) de Fase 1.
    if proba >= threshold:
        return "high"
    if proba >= threshold / 2:
        return "moderate"
    return "low"


_CATEGORY_SEVERITY = {"low": 0, "moderate": 1, "high": 2}

# Cuando el piso diagnóstico sube la categoría, el risk_score mostrado se
# ajusta a un valor de referencia dentro de esa banda (no es "la probabilidad
# real del modelo", que ya se descartó al aplicar el piso) — nada más que un
# número al que mostrar junto a la categoría sea coherente. Valores elegidos
# cómodamente dentro de cada banda (no pegados a los bordes), sin depender
# del umbral desplegado exacto de ningún módulo en particular.
_FLOOR_DISPLAY_SCORE = {"moderate": 0.40, "high": 0.78}


def _clinical_diagnostic_floor(hba1c: float, glucose: float) -> str:
    """Piso de categoría basado en criterios diagnósticos ADA reales (no en el
    modelo). El dataset de entrenamiento (Kaggle diabetes_prediction_dataset)
    tiene una relación casi de escalón entre HbA1c/glucosa y la etiqueta: es
    ~0% por debajo de 5.7%/126, se mantiene plana en ~8% en todo el rango
    5.7-6.6% / 126-200 mg/dL (banda de prediabetes), y salta a 100% recién en
    6.8%/220+. El modelo aprende esa forma fielmente, así que alguien con
    HbA1c=6.5 (ya diagnóstico de diabetes por ADA) puede recibir una
    probabilidad casi nula y quedar en "low". Este piso corrige la categoría
    mostrada (y, si la sube, también el risk_score mostrado — ver
    _FLOOR_DISPLAY_SCORE, porque "0%" junto a "Riesgo moderado" se ve roto)
    usando los cortes clínicos reales:
    - HbA1c >= 6.5% o glucosa >= 200 mg/dL: rango diagnóstico de diabetes -> "high"
    - HbA1c >= 5.7% o glucosa >= 126 mg/dL: rango de prediabetes -> "moderate"
    """
    if hba1c >= 6.5 or glucose >= 200:
        return "high"
    if hba1c >= 5.7 or glucose >= 126:
        return "moderate"
    return "low"


def _top_factors_local(entry: dict, X_row_transformed: np.ndarray, top_n: int = 5) -> list[dict]:
    explainer = entry["explainer"]
    feature_names = entry["schema"].get("feature_order_encoded") or entry["schema"]["feature_order"]

    shap_values = explainer.shap_values(X_row_transformed)
    if isinstance(shap_values, list):
        shap_values = shap_values[-1]
    row = np.asarray(shap_values)[0]

    order = np.argsort(np.abs(row))[::-1][:top_n]
    return [
        {
            "feature": feature_names[i],
            "impact": float(row[i]),
            "direction": "increases_risk" if row[i] > 0 else "decreases_risk",
        }
        for i in order
    ]


def predict_lifestyle(payload: dict) -> dict:
    entry = _load_module("lifestyle")
    schema = entry["schema"]
    df = pd.DataFrame([payload])[schema["feature_order"]]
    X_t = entry["preprocessor"].transform(df)

    proba = _calibrated_proba(entry, X_t)
    threshold = schema["deployed_threshold"]

    return {
        "module": "lifestyle",
        "risk_score": proba,
        "risk_category": _risk_category(proba, threshold),
        "threshold_used": threshold,
        "top_factors": _top_factors_local(entry, X_t),
    }


def predict_clinical(payload: dict) -> dict:
    entry = _load_module("clinical")
    schema = entry["schema"]
    df = pd.DataFrame([payload])[schema["feature_order_raw"]]
    X_t = entry["preprocessor"].transform(df)

    proba = float(entry["model"].predict_proba(X_t)[:, 1][0])
    threshold = schema["deployed_threshold"]

    model_category = _risk_category(proba, threshold)
    floor_category = _clinical_diagnostic_floor(payload["HbA1c_level"], payload["blood_glucose_level"])
    risk_category = max(model_category, floor_category, key=lambda c: _CATEGORY_SEVERITY[c])

    # Si el piso diagnóstico subió la categoría por encima de lo que el
    # modelo por sí solo daba (ej. glucosa=130 con HbA1c normal: el modelo da
    # ~0% porque esos otros factores pesan poco frente a HbA1c/glucosa, pero
    # la categoría correctamente sube a "moderate" por criterio ADA) el
    # NÚMERO mostrado también se ajusta — mostrar "0%" junto a "Riesgo
    # moderado" se ve roto/contradictorio aunque cada dato sea "correcto" por
    # separado. Son valores de referencia fijos dentro de cada banda, no la
    # probabilidad real del modelo (que ya se perdió al aplicar el piso).
    display_score = proba
    if _CATEGORY_SEVERITY[floor_category] > _CATEGORY_SEVERITY[model_category]:
        display_score = max(proba, _FLOOR_DISPLAY_SCORE[floor_category])

    return {
        "module": "clinical",
        "risk_score": display_score,
        "risk_category": risk_category,
        "threshold_used": threshold,
        "top_factors": _top_factors_local(entry, X_t),
    }
