"""
Optimización de hiperparámetros [PLAN_MAESTRO sec 4.6] sobre los 2-3 mejores
modelos de cada dataset (según ROC-AUC en test de la ronda base, ver train_one.py).

Se usa RandomizedSearchCV (más barato que GridSearch completo) con
StratifiedKFold, optimizando roc_auc en TRAIN (nunca en test). El umbral final
se ajusta después en validación (ver finalize.py).
"""
from __future__ import annotations

import argparse
import time

import numpy as np
from scipy.stats import randint, uniform
from sklearn.model_selection import RandomizedSearchCV, StratifiedKFold
import joblib

from common import ARTIFACTS_DIR, RANDOM_STATE, save_json, best_threshold_for_f1, evaluate_at_threshold

PARAM_GRIDS = {
    "xgboost": {
        "n_estimators": randint(150, 500),
        "max_depth": randint(3, 9),
        "learning_rate": uniform(0.02, 0.25),
        "subsample": uniform(0.6, 0.4),
        "colsample_bytree": uniform(0.6, 0.4),
        "min_child_weight": randint(1, 8),
    },
    "lightgbm": {
        "n_estimators": randint(150, 500),
        "num_leaves": randint(15, 127),
        "learning_rate": uniform(0.02, 0.25),
        "subsample": uniform(0.6, 0.4),
        "colsample_bytree": uniform(0.6, 0.4),
        "min_child_samples": randint(5, 60),
    },
    "gboost": {
        "n_estimators": randint(80, 250),
        "max_depth": randint(2, 5),
        "learning_rate": uniform(0.02, 0.25),
        "subsample": uniform(0.6, 0.4),
    },
    "rf": {
        "n_estimators": randint(150, 400),
        "max_depth": randint(6, 20),
        "min_samples_leaf": randint(2, 30),
        "max_features": uniform(0.3, 0.6),
    },
}


def load_arrays(dataset: str):
    npz = np.load(ARTIFACTS_DIR / f"{dataset}_arrays.npz")
    return (npz["X_train"], npz["y_train"], npz["X_val"], npz["y_val"], npz["X_test"], npz["y_test"])


def build_base_estimator(name: str, y_train):
    neg, pos = np.bincount(y_train)
    scale_pos_weight = neg / max(pos, 1)
    if name == "xgboost":
        from xgboost import XGBClassifier
        return XGBClassifier(
            tree_method="hist", eval_metric="logloss", random_state=RANDOM_STATE,
            n_jobs=1, scale_pos_weight=scale_pos_weight,
        )
    if name == "lightgbm":
        from lightgbm import LGBMClassifier
        return LGBMClassifier(random_state=RANDOM_STATE, n_jobs=1, class_weight="balanced", verbosity=-1)
    if name == "gboost":
        from sklearn.ensemble import GradientBoostingClassifier
        return GradientBoostingClassifier(random_state=RANDOM_STATE)
    if name == "rf":
        from sklearn.ensemble import RandomForestClassifier
        return RandomForestClassifier(random_state=RANDOM_STATE, n_jobs=1, class_weight="balanced_subsample")
    raise ValueError(name)


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--dataset", required=True, choices=["lifestyle", "clinical"])
    parser.add_argument("--model", required=True, choices=list(PARAM_GRIDS.keys()))
    parser.add_argument("--n_iter", type=int, default=15)
    args = parser.parse_args()

    X_train, y_train, X_val, y_val, X_test, y_test = load_arrays(args.dataset)

    base = build_base_estimator(args.model, y_train)

    sample_weight_fit_params = {}
    if args.model == "gboost":
        neg, pos = np.bincount(y_train)
        w_pos = neg / max(pos, 1)
        sample_weight_fit_params = {"sample_weight": np.where(y_train == 1, w_pos, 1.0)}

    cv = StratifiedKFold(n_splits=3, shuffle=True, random_state=RANDOM_STATE)
    search = RandomizedSearchCV(
        base, PARAM_GRIDS[args.model], n_iter=args.n_iter, scoring="roc_auc",
        cv=cv, random_state=RANDOM_STATE, n_jobs=-1, refit=True, verbose=0,
    )

    t0 = time.time()
    search.fit(X_train, y_train, **sample_weight_fit_params)
    search_seconds = time.time() - t0

    best_model = search.best_estimator_
    y_val_proba = best_model.predict_proba(X_val)[:, 1]
    threshold = best_threshold_for_f1(y_val, y_val_proba)
    y_test_proba = best_model.predict_proba(X_test)[:, 1]
    test_metrics = evaluate_at_threshold(y_test, y_test_proba, threshold)
    val_metrics = evaluate_at_threshold(y_val, y_val_proba, threshold)

    result = {
        "dataset": args.dataset,
        "model": args.model,
        "best_params": {k: (float(v) if isinstance(v, (np.floating,)) else (int(v) if isinstance(v, (np.integer,)) else v))
                         for k, v in search.best_params_.items()},
        "cv_best_roc_auc": float(search.best_score_),
        "search_seconds": search_seconds,
        "threshold": threshold,
        "val_metrics": val_metrics,
        "test_metrics": test_metrics,
    }
    save_json(result, ARTIFACTS_DIR / f"{args.dataset}_{args.model}_tuned_result.json")
    joblib.dump(best_model, ARTIFACTS_DIR / f"{args.dataset}_{args.model}_tuned.joblib")

    print(f"[{args.dataset}/{args.model}] tuned in {search_seconds:.1f}s | cv_roc_auc={search.best_score_:.4f} | "
          f"TEST recall={test_metrics['recall']:.4f} f1={test_metrics['f1']:.4f} roc_auc={test_metrics['roc_auc']:.4f}")


if __name__ == "__main__":
    main()
