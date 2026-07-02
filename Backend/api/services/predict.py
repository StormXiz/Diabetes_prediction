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

    explainer = shap.TreeExplainer(model)

    entry = {"model": model, "preprocessor": preprocessor, "schema": schema, "explainer": explainer}
    _CACHE[module] = entry
    return entry


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

    proba = float(entry["model"].predict_proba(X_t)[:, 1][0])
    threshold = schema["deployed_threshold"]

    return {
        "module": "lifestyle",
        "risk_score": proba,
        "risk_category": _risk_category(proba, threshold),
        "top_factors": _top_factors_local(entry, X_t),
    }


def predict_clinical(payload: dict) -> dict:
    entry = _load_module("clinical")
    schema = entry["schema"]
    df = pd.DataFrame([payload])[schema["feature_order_raw"]]
    X_t = entry["preprocessor"].transform(df)

    proba = float(entry["model"].predict_proba(X_t)[:, 1][0])
    threshold = schema["deployed_threshold"]

    return {
        "module": "clinical",
        "risk_score": proba,
        "risk_category": _risk_category(proba, threshold),
        "top_factors": _top_factors_local(entry, X_t),
    }
