"""
Despliegue del módulo LIFESTYLE v2 (ver optimize_lifestyle_v2.py) a
Backend/api/models/.

Selección del umbral — regla fijada ANTES de mirar test:
  "el umbral que maximiza F1 en VALIDACIÓN; si varios empatan en F1 (hay una
   meseta de 0.22 a 0.30), se rompe el empate quedándose con el de mayor
   recall, porque en un cribado de salud dejar pasar un caso real es peor que
   una falsa alarma."
Eso da **0.22**, frente al 0.15 de la primera pasada. Sube exactitud y
precisión de forma visible sin caer al ~0.60 de recall de la cola de la meseta.

Copia a Backend/api/models/:
  - model_lifestyle.joblib        <- XGBoost crudo (predict_proba + SHAP)
  - calibrator_lifestyle.joblib   <- IsotonicRegression ajustado en validación
  - preprocessor_lifestyle.joblib <- Pipeline con ingeniería de features dentro
  - feature_schema_lifestyle.json <- umbral nuevo + metadata
y también `features_lifestyle.py` a Backend/api/, porque el preprocesador
serializado referencia esa función por módulo: sin el archivo ahí, joblib.load
falla al arrancar la API.

Uso:
    conda activate diabetes && cd ml/src && python deploy_lifestyle_v2.py
"""
from __future__ import annotations

import json
import shutil

import numpy as np
import pandas as pd
import joblib

from common import ARTIFACTS_DIR, API_MODELS_DIR, METRICS_DIR, RANDOM_STATE, save_json, load_json
from features_lifestyle import MODEL_FEATURES
from optimize_lifestyle_v2 import PREFIX, load_split, full_eval

DEPLOY_THRESHOLD = 0.22


def main():
    prep = joblib.load(ARTIFACTS_DIR / f"{PREFIX}_preprocessor.joblib")
    xgb = joblib.load(ARTIFACTS_DIR / f"{PREFIX}_xgb.joblib")
    iso = joblib.load(ARTIFACTS_DIR / f"{PREFIX}_calibrator.joblib")

    X_train, y_train, X_val, y_val, X_test, y_test = load_split()
    Xt_train = prep.transform(X_train)
    Xt_test = prep.transform(X_test)

    proba_test = iso.predict(xgb.predict_proba(Xt_test)[:, 1])
    metrics = full_eval(y_test, proba_test, DEPLOY_THRESHOLD)

    # SHAP global sobre una muestra de train (mismos nombres que ve la API)
    import shap
    booster = xgb.get_booster()
    cfg = json.loads(booster.save_config())
    bs = cfg["learner"]["learner_model_param"]["base_score"]
    if isinstance(bs, str) and bs.startswith("["):
        cfg["learner"]["learner_model_param"]["base_score"] = bs.strip("[]")
        booster.load_config(json.dumps(cfg))
    idx = np.random.RandomState(RANDOM_STATE).choice(len(Xt_train), size=3000, replace=False)
    sv = shap.TreeExplainer(xgb).shap_values(Xt_train[idx])
    if isinstance(sv, list):
        sv = sv[-1]
    mean_abs = np.abs(sv).mean(axis=0)
    order = np.argsort(mean_abs)[::-1][:10]
    top_factors = [{"feature": MODEL_FEATURES[i], "mean_abs_shap": float(mean_abs[i])} for i in order]

    # --- Copiar artefactos ---
    joblib.dump(xgb, API_MODELS_DIR / "model_lifestyle.joblib")
    joblib.dump(iso, API_MODELS_DIR / "calibrator_lifestyle.joblib")
    joblib.dump(prep, API_MODELS_DIR / "preprocessor_lifestyle.joblib")
    shutil.copy(ARTIFACTS_DIR.parent / "src" / "features_lifestyle.py",
                API_MODELS_DIR.parent / "features_lifestyle.py")

    # --- Schema ---
    schema = load_json(API_MODELS_DIR / "feature_schema_lifestyle.json")
    schema["deployed_threshold"] = DEPLOY_THRESHOLD
    schema["threshold_f1_optimal"] = DEPLOY_THRESHOLD
    schema["threshold_selection_rule"] = (
        "Máximo F1 en validación; empate resuelto por mayor recall (meseta 0.22-0.30). "
        "Nunca se usó el set de test para elegirlo."
    )
    schema["calibrated"] = True
    schema["calibration_method"] = "isotonic"
    schema["model_version"] = "v2_feature_engineering"
    # feature_order sigue siendo las 21 crudas (lo que manda el formulario);
    # feature_order_encoded son las 33 que ve el modelo -> las que usa SHAP.
    schema["feature_order_encoded"] = MODEL_FEATURES
    schema["top_factors_global"] = top_factors
    schema["v2_test_metrics"] = metrics
    save_json(schema, API_MODELS_DIR / "feature_schema_lifestyle.json")

    # --- metrics.json (solo la entrada lifestyle) ---
    mpath = API_MODELS_DIR / "metrics.json"
    allm = load_json(mpath)
    prev = allm.get("lifestyle", {})
    allm["lifestyle"] = {
        "dataset": "lifestyle",
        "final_model": "xgboost_v2_feature_engineering_calibrated",
        "deployed_threshold": DEPLOY_THRESHOLD,
        "threshold_selection_rule": schema["threshold_selection_rule"],
        "test_metrics_DEPLOYED": metrics,
        "top_factors_global": top_factors,
        "previous_deployment_for_reference": prev.get("test_metrics_DEPLOYED", prev),
    }
    save_json(allm, mpath)
    save_json(allm["lifestyle"], METRICS_DIR / "final_report_lifestyle_v2.json")

    print(f"Umbral desplegado: {DEPLOY_THRESHOLD}")
    print(f"TEST -> acc={metrics['accuracy']:.4f} P={metrics['precision']:.4f} "
          f"R={metrics['recall']:.4f} F1={metrics['f1']:.4f} "
          f"AUC={metrics['roc_auc']:.4f} PR-AUC={metrics['pr_auc']:.4f} "
          f"Brier={metrics['brier_score']:.4f}")
    print(f"Top factores: {[t['feature'] for t in top_factors[:6]]}")
    print(f"Rango de probabilidad en test: min={proba_test.min():.3f} max={proba_test.max():.3f}")


if __name__ == "__main__":
    main()
