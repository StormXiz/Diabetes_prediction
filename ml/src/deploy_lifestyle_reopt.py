"""
Despliegue del módulo LIFESTYLE re-optimizado (ver optimize_lifestyle.py) a
Backend/api/models/ — paso EXPLÍCITO y separado del script de optimización a
propósito, para poder revisar los números antes de que la API los sirva.

Copia:
  - model_lifestyle.joblib         <- XGBoost crudo (para predict_proba Y para
                                       SHAP TreeExplainer, que necesita el
                                       booster directo, no un wrapper de
                                       calibración)
  - calibrator_lifestyle.joblib    <- IsotonicRegression fit en VAL, se aplica
                                       DESPUÉS de model.predict_proba()
  - preprocessor_lifestyle.joblib  <- sin cambios (mismas features/orden)
  - feature_schema_lifestyle.json  <- deployed_threshold nuevo + metadata de
                                       la re-optimización
  - metrics.json                   <- solo se actualiza la entrada "lifestyle";
                                       "clinical" se preserva intacta

No re-entrena nada; asume que optimize_lifestyle.py ya corrió y dejó sus
artefactos en ml/artifacts/lifestyle_reopt_*.

Uso:
    conda activate diabetes
    cd ml/src
    python deploy_lifestyle_reopt.py
"""
from __future__ import annotations

import json
import shutil

import joblib

from common import ARTIFACTS_DIR, API_MODELS_DIR, METRICS_DIR, save_json, load_json


def main():
    src_model = ARTIFACTS_DIR / "lifestyle_reopt_model_raw.joblib"
    src_calibrator = ARTIFACTS_DIR / "lifestyle_reopt_calibrator_isotonic.joblib"
    src_schema = ARTIFACTS_DIR / "lifestyle_reopt_feature_schema.json"
    src_preprocessor = ARTIFACTS_DIR / "lifestyle_preprocessor.joblib"

    for p in (src_model, src_calibrator, src_schema, src_preprocessor):
        if not p.exists():
            raise FileNotFoundError(f"Falta {p} — corre optimize_lifestyle.py primero.")

    # --- Copiar modelo + calibrador + preprocesador ---
    shutil.copy(src_model, API_MODELS_DIR / "model_lifestyle.joblib")
    shutil.copy(src_calibrator, API_MODELS_DIR / "calibrator_lifestyle.joblib")
    shutil.copy(src_preprocessor, API_MODELS_DIR / "preprocessor_lifestyle.joblib")

    # --- Schema: se parte del schema re-optimizado (ya trae deployed_threshold,
    #     top_factors_global, hiperparámetros y métricas de la re-optimización)
    #     y se ajustan las claves que predict.py / el resto del proyecto esperan. ---
    schema = json.loads(src_schema.read_text())
    schema["calibrated"] = True
    schema["calibration_method"] = "isotonic"
    schema["min_recall_constraint"] = 0.80
    # Se conservan estas dos claves por compatibilidad con quien lea el
    # schema esperando el formato viejo, pero ahora reflejan la re-optimización:
    schema["threshold_f1_optimal"] = schema["deployed_threshold"]
    schema.pop("recall_target", None)
    schema.pop("recall_target_reached_on_validation", None)
    save_json(schema, API_MODELS_DIR / "feature_schema_lifestyle.json")

    # --- metrics.json: actualizar SOLO la entrada "lifestyle" ---
    metrics_path = API_MODELS_DIR / "metrics.json"
    metrics = load_json(metrics_path) if metrics_path.exists() else {}
    old_lifestyle = metrics.get("lifestyle", {})

    metrics["lifestyle"] = {
        "dataset": "lifestyle",
        "final_model": "xgboost_reoptimized_calibrated_isotonic",
        "best_params": schema["reopt_hyperparameters"],
        "deployed_threshold": schema["deployed_threshold"],
        "min_recall_constraint": 0.80,
        "test_metrics_DEPLOYED": schema["reopt_test_metrics"],
        "stability_cv_10fold": schema["reopt_stability_cv"],
        "top_factors_global": schema["top_factors_global"],
        "previous_deployment_for_reference": old_lifestyle,
    }
    save_json(metrics, metrics_path)
    save_json(metrics, METRICS_DIR / "final_report_lifestyle_reopt.json")

    print("Desplegado en Backend/api/models/:")
    print(f"  deployed_threshold = {schema['deployed_threshold']:.4f} (antes: "
          f"{old_lifestyle.get('thresholds', {}).get('recall_target', 'N/A')})")
    tm = schema["reopt_test_metrics"]
    print(f"  TEST -> precision={tm['precision']:.4f} recall={tm['recall']:.4f} f1={tm['f1']:.4f} "
          f"roc_auc={tm['roc_auc']:.4f} brier={tm['brier_score']:.4f}")


if __name__ == "__main__":
    main()
