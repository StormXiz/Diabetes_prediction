"""
Entrena UN modelo para UN dataset y acumula el resultado en metrics_<dataset>.json.

Se ejecuta modelo a modelo (en vez de los 8 de golpe) porque el sandbox de
entrenamiento tiene límite de tiempo por llamada; cada ejecución es independiente
e idempotente: vuelve a dejar el resultado de ese modelo en el JSON acumulado.

Manejo del desbalance [PLAN_MAESTRO sec 4.5]:
- Estrategia principal: `class_weight='balanced'` (LogReg, DecisionTree, RandomForest,
  SVM) / `scale_pos_weight` (XGBoost) / `class_weight` (LightGBM) / `class_weight`
  (GradientBoosting de sklearn no lo soporta -> se remuestrea con sample_weight).
- KNN no soporta class_weight -> se compensa con `weights='distance'` + ajuste de
  threshold en validación.
- SMOTE se probó explícitamente como alternativa sobre Logistic Regression
  (ver smote_experiment.py) para documentar la comparación pedida por el plan;
  se optó por class_weight/scale_pos_weight en el resto de modelos por eficiencia
  computacional en datasets de 67k-160k filas de entrenamiento en este sandbox.
- El THRESHOLD de decisión se afina en el set de VALIDACIÓN maximizando F1
  (nunca en test) y ese mismo threshold se aplica al test set.
- SVM y KNN se entrenan sobre una submuestra estratificada (ver MAX_TRAIN_*) porque
  no escalan a >60k filas en tiempo razonable; se documenta como limitación conocida.
"""
from __future__ import annotations

import argparse
import sys
import time

import numpy as np
from sklearn.ensemble import GradientBoostingClassifier, RandomForestClassifier
from sklearn.linear_model import LogisticRegression
from sklearn.neighbors import KNeighborsClassifier
from sklearn.svm import SVC
from sklearn.tree import DecisionTreeClassifier
from sklearn.utils import compute_class_weight
import joblib

from common import (
    ARTIFACTS_DIR,
    RANDOM_STATE,
    best_threshold_for_f1,
    evaluate_at_threshold,
    merge_metrics_entry,
)

MAX_TRAIN_SVM = 6000
MAX_TRAIN_KNN = 30000


def load_arrays(dataset: str):
    npz = np.load(ARTIFACTS_DIR / f"{dataset}_arrays.npz")
    return (
        npz["X_train"], npz["y_train"],
        npz["X_val"], npz["y_val"],
        npz["X_test"], npz["y_test"],
    )


def stratified_subsample(X, y, n, seed=RANDOM_STATE):
    if len(y) <= n:
        return X, y
    rng = np.random.RandomState(seed)
    idx_pos = np.where(y == 1)[0]
    idx_neg = np.where(y == 0)[0]
    pos_rate = len(idx_pos) / len(y)
    n_pos = max(1, int(n * pos_rate))
    n_neg = n - n_pos
    sel_pos = rng.choice(idx_pos, size=min(n_pos, len(idx_pos)), replace=False)
    sel_neg = rng.choice(idx_neg, size=min(n_neg, len(idx_neg)), replace=False)
    idx = np.concatenate([sel_pos, sel_neg])
    rng.shuffle(idx)
    return X[idx], y[idx]


def build_model(name: str, y_train: np.ndarray):
    classes = np.unique(y_train)
    weights = compute_class_weight("balanced", classes=classes, y=y_train)
    class_weight_dict = dict(zip(classes, weights))
    pos_weight = class_weight_dict[1] / class_weight_dict[0] if 0 in class_weight_dict else 1.0
    neg, pos = np.bincount(y_train)
    scale_pos_weight = neg / max(pos, 1)

    if name == "logreg":
        return LogisticRegression(
            class_weight="balanced", max_iter=1000, solver="lbfgs", random_state=RANDOM_STATE
        ), {}
    if name == "dtree":
        return DecisionTreeClassifier(
            class_weight="balanced", max_depth=10, min_samples_leaf=20, random_state=RANDOM_STATE
        ), {}
    if name == "rf":
        return RandomForestClassifier(
            n_estimators=200, max_depth=14, class_weight="balanced_subsample",
            n_jobs=-1, random_state=RANDOM_STATE,
        ), {}
    if name == "svm":
        return SVC(
            kernel="rbf", C=1.0, gamma="scale", probability=True,
            class_weight="balanced", random_state=RANDOM_STATE,
        ), {"subsampled_to": MAX_TRAIN_SVM}
    if name == "knn":
        return KNeighborsClassifier(n_neighbors=15, weights="distance", n_jobs=-1), {
            "subsampled_to": MAX_TRAIN_KNN
        }
    if name == "gboost":
        return GradientBoostingClassifier(
            n_estimators=150, max_depth=3, learning_rate=0.1, random_state=RANDOM_STATE
        ), {"sample_weight": "balanced (manual)"}
    if name == "xgboost":
        from xgboost import XGBClassifier
        return XGBClassifier(
            n_estimators=300, max_depth=6, learning_rate=0.1, tree_method="hist",
            scale_pos_weight=scale_pos_weight, eval_metric="logloss",
            random_state=RANDOM_STATE, n_jobs=-1,
        ), {"scale_pos_weight": float(scale_pos_weight)}
    if name == "lightgbm":
        from lightgbm import LGBMClassifier
        return LGBMClassifier(
            n_estimators=300, max_depth=-1, num_leaves=63, learning_rate=0.1,
            class_weight="balanced", random_state=RANDOM_STATE, n_jobs=-1, verbosity=-1,
        ), {}
    raise ValueError(f"Modelo desconocido: {name}")


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--dataset", required=True, choices=["lifestyle", "clinical"])
    parser.add_argument("--model", required=True,
                         choices=["logreg", "dtree", "rf", "svm", "knn", "gboost", "xgboost", "lightgbm"])
    args = parser.parse_args()

    X_train, y_train, X_val, y_val, X_test, y_test = load_arrays(args.dataset)

    model, extra_info = build_model(args.model, y_train)

    X_fit, y_fit = X_train, y_train
    if args.model == "svm":
        X_fit, y_fit = stratified_subsample(X_train, y_train, MAX_TRAIN_SVM)
    elif args.model == "knn":
        X_fit, y_fit = stratified_subsample(X_train, y_train, MAX_TRAIN_KNN)

    sample_weight = None
    if args.model == "gboost":
        neg, pos = np.bincount(y_fit)
        w_pos = neg / max(pos, 1)
        sample_weight = np.where(y_fit == 1, w_pos, 1.0)

    t0 = time.time()
    if sample_weight is not None:
        model.fit(X_fit, y_fit, sample_weight=sample_weight)
    else:
        model.fit(X_fit, y_fit)
    fit_seconds = time.time() - t0

    y_val_proba = model.predict_proba(X_val)[:, 1]
    threshold = best_threshold_for_f1(y_val, y_val_proba)

    y_test_proba = model.predict_proba(X_test)[:, 1]
    test_metrics = evaluate_at_threshold(y_test, y_test_proba, threshold)
    val_metrics = evaluate_at_threshold(y_val, y_val_proba, threshold)

    entry = {
        "model_name": args.model,
        "dataset": args.dataset,
        "imbalance_strategy": "class_weight/scale_pos_weight (balanced)",
        "threshold": threshold,
        "fit_seconds": fit_seconds,
        "n_train_used": int(len(y_fit)),
        "params": {k: str(v) for k, v in model.get_params().items()},
        "extra_info": extra_info,
        "val_metrics": val_metrics,
        "test_metrics": test_metrics,
    }
    merge_metrics_entry(args.dataset, entry)

    model_path = ARTIFACTS_DIR / f"{args.dataset}_{args.model}.joblib"
    joblib.dump(model, model_path)

    print(f"[{args.dataset}/{args.model}] fit={fit_seconds:.1f}s thr={threshold:.3f} "
          f"TEST recall={test_metrics['recall']:.4f} f1={test_metrics['f1']:.4f} "
          f"roc_auc={test_metrics['roc_auc']:.4f} acc={test_metrics['accuracy']:.4f}")


if __name__ == "__main__":
    main()
