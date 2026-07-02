"""
Selección final del modelo por dataset + umbral orientado a RECALL (prioridad
médica: minimizar falsos negativos) + SHAP (top_factors) + serialización de
artefactos finales que consume la API FastAPI.

Decisión de selección de modelo [PLAN_MAESTRO sec 4.6]:
- Se compararon los 8 algoritmos (ver metrics_<dataset>.json, ronda base) y se
  afinaron con RandomizedSearchCV los 2-3 mejores por ROC-AUC (ver tune.py).
- Modelo final elegido para AMBOS módulos: XGBoost (tree_method=hist), porque:
  (a) fue top-2 por ROC-AUC en ambos datasets tras el tuning,
  (b) es sensiblemente más rápido en inferencia que Gradient Boosting/SVM,
  (c) tiene soporte directo y rápido de SHAP (TreeExplainer) para `top_factors`.

Decisión de UMBRAL [PLAN_MAESTRO sec 4.5 y 4.6]:
- Se reporta el umbral que maximiza F1 (equilibrado) y el umbral que alcanza
  Recall objetivo ~0.90 en validación. Dado que el contexto es médico y el plan
  pide priorizar Recall para minimizar falsos negativos, se despliega el umbral
  "recall objetivo" en producción (feature_schema/metrics documentan ambos para
  transparencia académica).
"""
from __future__ import annotations

import json
import shutil

import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
import numpy as np
from sklearn.metrics import (
    ConfusionMatrixDisplay, RocCurveDisplay, PrecisionRecallDisplay,
)
import joblib
import shap

from common import (
    ARTIFACTS_DIR, API_MODELS_DIR, FIGURES_DIR, METRICS_DIR,
    evaluate_at_threshold, save_json, load_json,
)

FINAL_MODEL_KEY = "xgboost"
RECALL_TARGET = 0.90


def load_arrays(dataset: str):
    npz = np.load(ARTIFACTS_DIR / f"{dataset}_arrays.npz")
    return (npz["X_train"], npz["y_train"], npz["X_val"], npz["y_val"], npz["X_test"], npz["y_test"])


def threshold_for_target_recall(y_true, y_proba, target: float) -> tuple[float, bool]:
    """Umbral más alto posible (=> mejor precisión) que aún cumple recall >= target.
    Si ningún umbral alcanza el target, devuelve el umbral que da el recall máximo posible."""
    thresholds = np.unique(y_proba)
    thresholds = np.sort(thresholds)[::-1]  # de más restrictivo a menos restrictivo
    best = None
    for t in thresholds:
        y_pred = (y_proba >= t).astype(int)
        tp = int(((y_pred == 1) & (y_true == 1)).sum())
        fn = int(((y_pred == 0) & (y_true == 1)).sum())
        recall = tp / max(tp + fn, 1)
        if recall >= target:
            best = t
            break
    if best is not None:
        return float(best), True
    # fallback: umbral mínimo (recall máximo alcanzable)
    return float(thresholds[-1]), False


def make_plots(dataset: str, model, X_test, y_test, threshold: float):
    y_proba = model.predict_proba(X_test)[:, 1]
    y_pred = (y_proba >= threshold).astype(int)

    fig, ax = plt.subplots(figsize=(5, 4.5))
    ConfusionMatrixDisplay.from_predictions(
        y_test, y_pred, display_labels=["No riesgo", "Riesgo"], cmap="Blues", ax=ax, colorbar=False
    )
    ax.set_title(f"Matriz de confusión — {dataset} (thr={threshold:.3f})")
    fig.tight_layout()
    fig.savefig(FIGURES_DIR / f"{dataset}_confusion_matrix.png", dpi=140)
    plt.close(fig)

    fig, ax = plt.subplots(figsize=(5, 4.5))
    RocCurveDisplay.from_predictions(y_test, y_proba, ax=ax, color="#2563eb")
    ax.plot([0, 1], [0, 1], linestyle="--", color="gray")
    ax.set_title(f"Curva ROC — {dataset}")
    fig.tight_layout()
    fig.savefig(FIGURES_DIR / f"{dataset}_roc_curve.png", dpi=140)
    plt.close(fig)

    fig, ax = plt.subplots(figsize=(5, 4.5))
    PrecisionRecallDisplay.from_predictions(y_test, y_proba, ax=ax, color="#dc2626")
    ax.set_title(f"Curva Precision-Recall — {dataset}")
    fig.tight_layout()
    fig.savefig(FIGURES_DIR / f"{dataset}_pr_curve.png", dpi=140)
    plt.close(fig)


def make_comparison_chart(dataset: str):
    data = load_json(METRICS_DIR / f"metrics_{dataset}.json")
    names, recalls, f1s, aucs = [], [], [], []
    for name, e in data["models"].items():
        tm = e["test_metrics"]
        names.append(name)
        recalls.append(tm["recall"])
        f1s.append(tm["f1"])
        aucs.append(tm["roc_auc"])
    order = np.argsort(aucs)[::-1]
    names = [names[i] for i in order]
    recalls = [recalls[i] for i in order]
    f1s = [f1s[i] for i in order]
    aucs = [aucs[i] for i in order]

    x = np.arange(len(names))
    width = 0.25
    fig, ax = plt.subplots(figsize=(10, 5))
    ax.bar(x - width, recalls, width, label="Recall", color="#dc2626")
    ax.bar(x, f1s, width, label="F1", color="#0891b2")
    ax.bar(x + width, aucs, width, label="ROC-AUC", color="#2563eb")
    ax.axhline(0.90, color="black", linestyle="--", linewidth=1, label="Meta 90%")
    ax.set_xticks(x)
    ax.set_xticklabels(names, rotation=20)
    ax.set_ylim(0, 1.05)
    ax.set_title(f"Comparación de los 8 modelos — {dataset}")
    ax.legend()
    fig.tight_layout()
    fig.savefig(FIGURES_DIR / f"{dataset}_model_comparison.png", dpi=140)
    plt.close(fig)


def _fix_xgboost_shap_compat(model):
    """Workaround para incompatibilidad conocida shap<->xgboost recientes: el
    campo base_score se serializa como '[5E-1]' y shap intenta parsearlo con
    float() directamente. Se reescribe el config del booster con un valor
    numérico plano antes de pasarlo a TreeExplainer."""
    try:
        booster = model.get_booster()
        config = json.loads(booster.save_config())
        bs = config["learner"]["learner_model_param"]["base_score"]
        if isinstance(bs, str) and bs.startswith("["):
            config["learner"]["learner_model_param"]["base_score"] = bs.strip("[]")
            booster.load_config(json.dumps(config))
    except Exception:
        pass
    return model


def compute_shap_top_factors(model, X_train_sample, feature_names, top_n=8):
    model = _fix_xgboost_shap_compat(model)
    explainer = shap.TreeExplainer(model)
    shap_values = explainer.shap_values(X_train_sample)
    if isinstance(shap_values, list):
        shap_values = shap_values[-1]
    mean_abs = np.abs(shap_values).mean(axis=0)
    order = np.argsort(mean_abs)[::-1][:top_n]
    return [
        {"feature": feature_names[i], "mean_abs_shap": float(mean_abs[i])}
        for i in order
    ]


def finalize_dataset(dataset: str, feature_names_key: str):
    X_train, y_train, X_val, y_val, X_test, y_test = load_arrays(dataset)

    tuned_path = ARTIFACTS_DIR / f"{dataset}_{FINAL_MODEL_KEY}_tuned.joblib"
    tuned_result = load_json(ARTIFACTS_DIR / f"{dataset}_{FINAL_MODEL_KEY}_tuned_result.json")
    model = joblib.load(tuned_path)

    y_val_proba = model.predict_proba(X_val)[:, 1]
    thr_f1 = tuned_result["threshold"]
    thr_recall, recall_reached = threshold_for_target_recall(y_val, y_val_proba, RECALL_TARGET)

    deployed_threshold = thr_recall  # prioridad: Recall (contexto médico)

    test_metrics_f1 = evaluate_at_threshold(y_test, model.predict_proba(X_test)[:, 1], thr_f1)
    test_metrics_recall = evaluate_at_threshold(y_test, model.predict_proba(X_test)[:, 1], deployed_threshold)

    make_plots(dataset, model, X_test, y_test, deployed_threshold)
    make_comparison_chart(dataset)

    schema = load_json(ARTIFACTS_DIR / f"{dataset}_feature_schema.json")
    feature_names = schema[feature_names_key]

    sample_idx = np.random.RandomState(42).choice(len(X_train), size=min(3000, len(X_train)), replace=False)
    top_factors = compute_shap_top_factors(model, X_train[sample_idx], feature_names)

    # Copiar artefactos finales a Backend/api/models/
    joblib.dump(model, API_MODELS_DIR / f"model_{dataset}.joblib")
    shutil.copy(ARTIFACTS_DIR / f"{dataset}_preprocessor.joblib", API_MODELS_DIR / f"preprocessor_{dataset}.joblib")

    schema["deployed_threshold"] = deployed_threshold
    schema["threshold_f1_optimal"] = thr_f1
    schema["recall_target"] = RECALL_TARGET
    schema["recall_target_reached_on_validation"] = recall_reached
    schema["top_factors_global"] = top_factors
    save_json(schema, API_MODELS_DIR / f"feature_schema_{dataset}.json")

    result = {
        "dataset": dataset,
        "final_model": FINAL_MODEL_KEY,
        "best_params": tuned_result["best_params"],
        "cv_roc_auc_train": tuned_result["cv_best_roc_auc"],
        "thresholds": {"f1_optimal": thr_f1, "recall_target": deployed_threshold},
        "recall_target_reached_on_validation": recall_reached,
        "test_metrics_at_f1_threshold": test_metrics_f1,
        "test_metrics_at_recall_threshold_DEPLOYED": test_metrics_recall,
        "top_factors_global": top_factors,
        "all_models_comparison": load_json(METRICS_DIR / f"metrics_{dataset}.json")["models"],
    }
    return result


def main():
    final_report = {}
    final_report["lifestyle"] = finalize_dataset("lifestyle", "feature_order")
    final_report["clinical"] = finalize_dataset("clinical", "feature_order_encoded")

    save_json(final_report, API_MODELS_DIR / "metrics.json")
    save_json(final_report, METRICS_DIR / "final_report.json")

    for ds in ["lifestyle", "clinical"]:
        r = final_report[ds]
        print(f"\n=== {ds.upper()} — modelo final: {r['final_model']} ===")
        print(f"CV ROC-AUC (train): {r['cv_roc_auc_train']:.4f}")
        d = r["test_metrics_at_recall_threshold_DEPLOYED"]
        print(f"DEPLOYED (umbral recall>={RECALL_TARGET}, alcanzado={r['recall_target_reached_on_validation']}): "
              f"recall={d['recall']:.4f} precision={d['precision']:.4f} f1={d['f1']:.4f} "
              f"roc_auc={d['roc_auc']:.4f} acc={d['accuracy']:.4f}")
        f = r["test_metrics_at_f1_threshold"]
        print(f"Alternativa (umbral F1-óptimo): recall={f['recall']:.4f} precision={f['precision']:.4f} "
              f"f1={f['f1']:.4f} roc_auc={f['roc_auc']:.4f}")


if __name__ == "__main__":
    main()
