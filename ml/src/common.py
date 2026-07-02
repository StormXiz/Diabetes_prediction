"""
Utilidades compartidas por los pipelines de los dos módulos (lifestyle / clinical).

Diseño: mantener el mismo criterio de evaluación y el mismo formato de artefactos
para ambos datasets, de forma que la API (FastAPI) pueda cargar cualquiera de los
dos con el mismo código.
"""
from __future__ import annotations

import json
import time
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any

import numpy as np
from sklearn.metrics import (
    accuracy_score,
    confusion_matrix,
    f1_score,
    precision_score,
    recall_score,
    roc_auc_score,
    precision_recall_curve,
    roc_curve,
    average_precision_score,
)

# ---------------------------------------------------------------------------
# Rutas del proyecto
# ---------------------------------------------------------------------------
PROJECT_ROOT = Path(__file__).resolve().parents[2]
DATASETS_DIR = PROJECT_ROOT / "Datasets"
ML_DIR = PROJECT_ROOT / "ml"
FIGURES_DIR = ML_DIR / "reports" / "figures"
METRICS_DIR = ML_DIR / "reports" / "metrics"
ARTIFACTS_DIR = ML_DIR / "artifacts"       # cache de trabajo (npz, preprocesadores intermedios)
API_MODELS_DIR = PROJECT_ROOT / "Backend" / "api" / "models"  # entrega final que consume la API

for d in (FIGURES_DIR, METRICS_DIR, ARTIFACTS_DIR, API_MODELS_DIR):
    d.mkdir(parents=True, exist_ok=True)

RANDOM_STATE = 42


# ---------------------------------------------------------------------------
# Evaluación
# ---------------------------------------------------------------------------
@dataclass
class EvalResult:
    model_name: str
    dataset: str
    imbalance_strategy: str
    threshold: float
    accuracy: float
    precision: float
    recall: float
    f1: float
    roc_auc: float
    pr_auc: float
    confusion_matrix: list
    fit_seconds: float
    params: dict = field(default_factory=dict)

    def to_dict(self) -> dict[str, Any]:
        return {
            "model_name": self.model_name,
            "dataset": self.dataset,
            "imbalance_strategy": self.imbalance_strategy,
            "threshold": self.threshold,
            "accuracy": self.accuracy,
            "precision": self.precision,
            "recall": self.recall,
            "f1": self.f1,
            "roc_auc": self.roc_auc,
            "pr_auc": self.pr_auc,
            "confusion_matrix": self.confusion_matrix,
            "fit_seconds": self.fit_seconds,
            "params": self.params,
        }


def evaluate_at_threshold(y_true, y_proba, threshold: float) -> dict:
    y_pred = (y_proba >= threshold).astype(int)
    return {
        "accuracy": float(accuracy_score(y_true, y_pred)),
        "precision": float(precision_score(y_true, y_pred, zero_division=0)),
        "recall": float(recall_score(y_true, y_pred, zero_division=0)),
        "f1": float(f1_score(y_true, y_pred, zero_division=0)),
        "roc_auc": float(roc_auc_score(y_true, y_proba)),
        "pr_auc": float(average_precision_score(y_true, y_proba)),
        "confusion_matrix": confusion_matrix(y_true, y_pred).tolist(),
    }


def best_threshold_for_f1(y_true, y_proba) -> float:
    """Recorre umbrales sobre la curva precision-recall y devuelve el que maximiza F1.

    Se usa en VALIDACIÓN, nunca en test, para no filtrar información del test set.
    """
    precisions, recalls, thresholds = precision_recall_curve(y_true, y_proba)
    f1s = 2 * precisions * recalls / (precisions + recalls + 1e-12)
    f1s = f1s[:-1]  # precision_recall_curve devuelve un punto extra sin threshold
    if len(thresholds) == 0:
        return 0.5
    best_idx = int(np.argmax(f1s))
    return float(thresholds[best_idx])


def timed_fit(estimator, X, y):
    t0 = time.time()
    estimator.fit(X, y)
    return estimator, time.time() - t0


def save_json(obj: Any, path: Path):
    path.parent.mkdir(parents=True, exist_ok=True)
    with open(path, "w") as f:
        json.dump(obj, f, indent=2, default=_json_default)


def _json_default(o):
    if isinstance(o, (np.integer,)):
        return int(o)
    if isinstance(o, (np.floating,)):
        return float(o)
    if isinstance(o, (np.ndarray,)):
        return o.tolist()
    return str(o)


def load_json(path: Path) -> Any:
    with open(path) as f:
        return json.load(f)


def merge_metrics_entry(dataset: str, entry: dict):
    """Añade/reemplaza la entrada de un modelo en metrics_<dataset>.json (acumulativo,
    para poder entrenar los 8 modelos en llamadas separadas sin perder progreso)."""
    path = METRICS_DIR / f"metrics_{dataset}.json"
    data = load_json(path) if path.exists() else {"dataset": dataset, "models": {}}
    data["models"][entry["model_name"]] = entry
    save_json(data, path)
    return data
