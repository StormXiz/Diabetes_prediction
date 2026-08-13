"""
Segunda pasada de optimización del módulo LIFESTYLE.

Diferencias contra `optimize_lifestyle.py` (la primera pasada):
  1. **Ingeniería de features** (`features_lifestyle.py`) — 12 variables
     derivadas de dominio, dentro del propio preprocesador para que la API no
     cambie. Es la palanca más grande en tabular.
  2. **Búsqueda más amplia**: 200 iteraciones (antes 80) y criterio de refit
     PR-AUC (`average_precision`) en vez de F1. Con 17% de positivos, PR-AUC
     mide la calidad del ranking en la clase minoritaria sin depender de dónde
     esté puesto el umbral; F1 a 0.5 fijo penaliza modelos buenos cuyo punto de
     operación óptimo no está en 0.5.
  3. **Ensemble** XGBoost + LightGBM (promedio de probabilidades), que se
     conserva solo si de verdad mejora sobre el mejor individual en validación.
  4. **Barrido de umbral con varios criterios** — se reportan todos y se elige
     con el criterio explícito de producto, no a ciegas.

Todo lo demás (split estratificado 70/15/15 con el mismo `RANDOM_STATE`,
calibración en validación, evaluación única en test) se mantiene igual para que
la comparación contra la primera pasada sea apples-to-apples.

Uso:
    conda activate diabetes
    cd ml/src
    python optimize_lifestyle_v2.py
"""
from __future__ import annotations

import json
import time
import warnings

import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
import numpy as np
import pandas as pd
from scipy.stats import randint, uniform, loguniform
from sklearn.calibration import calibration_curve
from sklearn.compose import ColumnTransformer
from sklearn.isotonic import IsotonicRegression
from sklearn.metrics import (
    average_precision_score, brier_score_loss, classification_report,
    confusion_matrix, f1_score, precision_score, recall_score, roc_auc_score,
)
from sklearn.model_selection import RandomizedSearchCV, StratifiedKFold, train_test_split
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import FunctionTransformer, StandardScaler
import joblib
from xgboost import XGBClassifier

from common import ARTIFACTS_DIR, DATASETS_DIR, FIGURES_DIR, METRICS_DIR, RANDOM_STATE, save_json
from features_lifestyle import RAW_FEATURES, MODEL_FEATURES, engineer_features

warnings.filterwarnings("ignore", category=UserWarning)
warnings.filterwarnings("ignore", category=FutureWarning)

PREFIX = "lifestyle_v2"
MIN_RECALL = 0.80
N_SPLITS = 5
N_ITER = 200
TARGET = "Diabetes_binary"
BMI_MIN, BMI_MAX = 12.0, 70.0


def log(msg: str):
    print(f"[{time.strftime('%H:%M:%S')}] {msg}", flush=True)


# ---------------------------------------------------------------------------
# Datos — misma limpieza y mismo split que prep_lifestyle.py
# ---------------------------------------------------------------------------
def load_split():
    df = pd.read_csv(DATASETS_DIR / "diabetes_012_health_indicators_BRFSS2015.csv")
    df = df.drop_duplicates()
    df[TARGET] = (df["Diabetes_012"] > 0).astype(int)
    df = df.drop(columns=["Diabetes_012"])
    df.loc[(df["BMI"] < BMI_MIN) | (df["BMI"] > BMI_MAX), "BMI"] = np.nan
    df["BMI"] = df["BMI"].fillna(df["BMI"].median())
    for col in ["MentHlth", "PhysHlth"]:
        df[col] = df[col].clip(0, 30)

    X = df[RAW_FEATURES]
    y = df[TARGET].values

    X_train, X_temp, y_train, y_temp = train_test_split(
        X, y, test_size=0.30, stratify=y, random_state=RANDOM_STATE
    )
    X_val, X_test, y_val, y_test = train_test_split(
        X_temp, y_temp, test_size=0.50, stratify=y_temp, random_state=RANDOM_STATE
    )
    log(f"train={len(y_train)} val={len(y_val)} test={len(y_test)} "
        f"positivos={y.mean():.4f}")
    return X_train, y_train, X_val, y_val, X_test, y_test


def build_preprocessor() -> Pipeline:
    """FunctionTransformer primero (features derivadas) y luego el escalado.
    Se guarda entero, así la API transforma exactamente igual sin conocer la
    ingeniería de features."""
    return Pipeline([
        ("features", FunctionTransformer(engineer_features, validate=False)),
        ("scale", ColumnTransformer(
            [("all", StandardScaler(), MODEL_FEATURES)], remainder="drop"
        )),
    ])


# ---------------------------------------------------------------------------
# Búsqueda de hiperparámetros
# ---------------------------------------------------------------------------
PARAM_DIST = {
    "n_estimators": randint(200, 900),
    "max_depth": randint(3, 11),
    "learning_rate": loguniform(0.01, 0.25),
    "min_child_weight": randint(1, 25),
    "subsample": uniform(0.5, 0.5),
    "colsample_bytree": uniform(0.4, 0.6),
    "gamma": uniform(0, 6),
    "reg_alpha": loguniform(1e-3, 20),
    "reg_lambda": loguniform(1e-3, 20),
    "scale_pos_weight": uniform(1.0, 5.5),
}


def search_xgb(Xt_train, y_train):
    log(f"=== Búsqueda XGBoost ({N_ITER} iter x {N_SPLITS} folds, refit=PR-AUC) ===")
    base = XGBClassifier(tree_method="hist", eval_metric="logloss",
                         random_state=RANDOM_STATE, n_jobs=1)
    cv = StratifiedKFold(n_splits=N_SPLITS, shuffle=True, random_state=RANDOM_STATE)
    scoring = {"average_precision": "average_precision", "roc_auc": "roc_auc",
               "f1": "f1", "precision": "precision", "recall": "recall"}
    search = RandomizedSearchCV(
        base, PARAM_DIST, n_iter=N_ITER, scoring=scoring, refit="average_precision",
        cv=cv, random_state=RANDOM_STATE, n_jobs=-1, verbose=0,
    )
    t0 = time.time()
    search.fit(Xt_train, y_train)
    secs = time.time() - t0
    i = search.best_index_
    cvres = search.cv_results_
    scores = {m: {"mean": float(cvres[f"mean_test_{m}"][i]),
                  "std": float(cvres[f"std_test_{m}"][i])} for m in scoring}
    log(f"  {secs:.0f}s | best PR-AUC CV = {scores['average_precision']['mean']:.4f} "
        f"± {scores['average_precision']['std']:.4f}")
    for m, s in scores.items():
        log(f"    {m}: {s['mean']:.4f} ± {s['std']:.4f}")
    return search.best_estimator_, search.best_params_, scores, secs


def search_lgbm(Xt_train, y_train):
    from lightgbm import LGBMClassifier
    log("=== Búsqueda LightGBM (60 iter, para el ensemble) ===")
    grid = {
        "n_estimators": randint(200, 800),
        "num_leaves": randint(15, 150),
        "learning_rate": loguniform(0.01, 0.25),
        "min_child_samples": randint(5, 120),
        "subsample": uniform(0.5, 0.5),
        "colsample_bytree": uniform(0.4, 0.6),
        "reg_alpha": loguniform(1e-3, 20),
        "reg_lambda": loguniform(1e-3, 20),
        "scale_pos_weight": uniform(1.0, 5.5),
    }
    base = LGBMClassifier(random_state=RANDOM_STATE, n_jobs=1, verbosity=-1)
    cv = StratifiedKFold(n_splits=N_SPLITS, shuffle=True, random_state=RANDOM_STATE)
    search = RandomizedSearchCV(base, grid, n_iter=60, scoring="average_precision",
                                cv=cv, random_state=RANDOM_STATE, n_jobs=-1)
    t0 = time.time()
    search.fit(Xt_train, y_train)
    log(f"  {time.time()-t0:.0f}s | best PR-AUC CV = {search.best_score_:.4f}")
    return search.best_estimator_, search.best_params_, float(search.best_score_)


# ---------------------------------------------------------------------------
# Umbrales
# ---------------------------------------------------------------------------
def sweep(y_true, proba) -> pd.DataFrame:
    rows = []
    for t in np.arange(0.05, 0.951, 0.01):
        t = round(float(t), 3)
        pred = (proba >= t).astype(int)
        tp = int(((pred == 1) & (y_true == 1)).sum())
        tn = int(((pred == 0) & (y_true == 0)).sum())
        fp = int(((pred == 1) & (y_true == 0)).sum())
        fn = int(((pred == 0) & (y_true == 1)).sum())
        p = tp / max(tp + fp, 1)
        r = tp / max(tp + fn, 1)
        rows.append({"threshold": t, "precision": p, "recall": r,
                     "f1": 2 * p * r / max(p + r, 1e-12),
                     "specificity": tn / max(tn + fp, 1),
                     "tp": tp, "tn": tn, "fp": fp, "fn": fn})
    return pd.DataFrame(rows)


def pick_thresholds(y_val, proba_val) -> dict:
    table = sweep(y_val, proba_val)
    table.to_csv(METRICS_DIR / f"{PREFIX}_threshold_table.csv", index=False)

    elig = table[table["recall"] >= MIN_RECALL]
    out = {
        "f1_global": float(table.loc[table["f1"].idxmax(), "threshold"]),
        "f1_recall80": float(elig.loc[elig["f1"].idxmax(), "threshold"]) if not elig.empty else None,
        "recall80_max_precision": float(elig.loc[elig["precision"].idxmax(), "threshold"]) if not elig.empty else None,
    }
    log("  Opciones de umbral (medidas en VALIDACIÓN):")
    for name, thr in out.items():
        if thr is None:
            continue
        row = table.loc[table["threshold"] == thr].iloc[0]
        log(f"    {name:24s} thr={thr:.2f}  P={row['precision']:.3f} "
            f"R={row['recall']:.3f} F1={row['f1']:.3f} Spec={row['specificity']:.3f}")
    return out


# ---------------------------------------------------------------------------
# Evaluación
# ---------------------------------------------------------------------------
def full_eval(y_true, proba, thr) -> dict:
    pred = (proba >= thr).astype(int)
    cm = confusion_matrix(y_true, pred)
    tn, fp, fn, tp = cm.ravel()
    return {
        "threshold": float(thr),
        "confusion_matrix": cm.tolist(),
        "accuracy": float((tp + tn) / (tp + tn + fp + fn)),
        "precision": float(precision_score(y_true, pred, zero_division=0)),
        "recall": float(recall_score(y_true, pred, zero_division=0)),
        "specificity": float(tn / max(tn + fp, 1)),
        "f1": float(f1_score(y_true, pred, zero_division=0)),
        "roc_auc": float(roc_auc_score(y_true, proba)),
        "pr_auc": float(average_precision_score(y_true, proba)),
        "brier_score": float(brier_score_loss(y_true, proba)),
        "true_positives": int(tp), "true_negatives": int(tn),
        "false_positives": int(fp), "false_negatives": int(fn),
        "classification_report": classification_report(
            y_true, pred, target_names=["No riesgo", "Riesgo"], zero_division=0),
    }


def main():
    X_train, y_train, X_val, y_val, X_test, y_test = load_split()

    prep = build_preprocessor()
    Xt_train = prep.fit_transform(X_train)   # fit SOLO con train
    Xt_val = prep.transform(X_val)
    Xt_test = prep.transform(X_test)
    log(f"Features tras ingeniería: {Xt_train.shape[1]} (crudas: {len(RAW_FEATURES)})")

    xgb, xgb_params, xgb_cv, secs = search_xgb(Xt_train, y_train)
    lgbm, lgbm_params, lgbm_cv = search_lgbm(Xt_train, y_train)

    # --- ¿el ensemble ayuda de verdad? Se decide en VALIDACIÓN ---
    log("=== Ensemble vs individuales (VALIDACIÓN, PR-AUC) ===")
    p_xgb = xgb.predict_proba(Xt_val)[:, 1]
    p_lgbm = lgbm.predict_proba(Xt_val)[:, 1]
    p_ens = (p_xgb + p_lgbm) / 2
    ap = {"xgb": average_precision_score(y_val, p_xgb),
          "lgbm": average_precision_score(y_val, p_lgbm),
          "ensemble": average_precision_score(y_val, p_ens)}
    for k, v in ap.items():
        log(f"    {k:9s} PR-AUC={v:.4f}  ROC-AUC="
            f"{roc_auc_score(y_val, {'xgb': p_xgb, 'lgbm': p_lgbm, 'ensemble': p_ens}[k]):.4f}")
    use_ensemble = ap["ensemble"] > max(ap["xgb"], ap["lgbm"]) + 0.0005
    log(f"  -> {'SE USA el ensemble' if use_ensemble else 'NO mejora: se queda solo XGBoost'}")

    def raw_proba(Xt):
        return ((xgb.predict_proba(Xt)[:, 1] + lgbm.predict_proba(Xt)[:, 1]) / 2
                if use_ensemble else xgb.predict_proba(Xt)[:, 1])

    # --- Calibración (isotonic, ajustada en validación) ---
    log("=== Calibración ===")
    pv = raw_proba(Xt_val)
    iso = IsotonicRegression(out_of_bounds="clip").fit(pv, y_val)
    pv_cal = iso.predict(pv)
    brier = {"sin_calibrar": float(brier_score_loss(y_val, pv)),
             "isotonic": float(brier_score_loss(y_val, pv_cal))}
    log(f"    Brier sin calibrar={brier['sin_calibrar']:.5f}  isotonic={brier['isotonic']:.5f}")

    thresholds = pick_thresholds(y_val, pv_cal)

    # --- Evaluación ÚNICA en test ---
    log("=== TEST (una sola pasada) ===")
    pt_cal = iso.predict(raw_proba(Xt_test))
    results = {}
    for name, thr in thresholds.items():
        if thr is not None:
            results[name] = full_eval(y_test, pt_cal, thr)
            r = results[name]
            log(f"    {name:24s} thr={thr:.2f}  acc={r['accuracy']:.3f} P={r['precision']:.3f} "
                f"R={r['recall']:.3f} F1={r['f1']:.3f} AUC={r['roc_auc']:.3f} "
                f"PR-AUC={r['pr_auc']:.3f} Brier={r['brier_score']:.4f}")

    # --- Rango de probabilidades: ¿el modelo separa mejor que antes? ---
    hi = pt_cal[y_test == 1]
    lo = pt_cal[y_test == 0]
    spread = {
        "p95_de_positivos": float(np.percentile(hi, 95)),
        "mediana_positivos": float(np.median(hi)),
        "mediana_negativos": float(np.median(lo)),
        "max_probabilidad": float(pt_cal.max()),
        "separacion_medianas": float(np.median(hi) - np.median(lo)),
    }
    log("=== Separación de probabilidades en test ===")
    for k, v in spread.items():
        log(f"    {k}: {v:.4f}")

    payload = {
        "n_iter_search": N_ITER,
        "search_seconds": secs,
        "engineered_features": Xt_train.shape[1],
        "xgb_best_params": {k: (float(v) if isinstance(v, (np.floating, float))
                                else int(v) if isinstance(v, (np.integer, int)) else v)
                            for k, v in xgb_params.items()},
        "xgb_cv_scores": xgb_cv,
        "lgbm_cv_pr_auc": lgbm_cv,
        "ensemble_val_pr_auc": {k: float(v) for k, v in ap.items()},
        "use_ensemble": bool(use_ensemble),
        "brier_val": brier,
        "threshold_options": thresholds,
        "test_results": results,
        "probability_spread_test": spread,
    }
    save_json(payload, METRICS_DIR / f"{PREFIX}_results.json")

    joblib.dump(prep, ARTIFACTS_DIR / f"{PREFIX}_preprocessor.joblib")
    joblib.dump(xgb, ARTIFACTS_DIR / f"{PREFIX}_xgb.joblib")
    joblib.dump(lgbm, ARTIFACTS_DIR / f"{PREFIX}_lgbm.joblib")
    joblib.dump(iso, ARTIFACTS_DIR / f"{PREFIX}_calibrator.joblib")

    # Curva de calibración para el reporte
    fig, ax = plt.subplots(figsize=(6, 5.5))
    ax.plot([0, 1], [0, 1], "--", color="gray", label="Perfecto")
    for name, p in [("sin calibrar", pv), ("isotonic", pv_cal)]:
        frac, mean = calibration_curve(y_val, p, n_bins=10, strategy="quantile")
        ax.plot(mean, frac, marker="o", label=name)
    ax.set_xlabel("Probabilidad predicha")
    ax.set_ylabel("Fracción real de positivos")
    ax.set_title("Calibración — lifestyle v2 (validación)")
    ax.legend()
    fig.tight_layout()
    fig.savefig(FIGURES_DIR / f"{PREFIX}_calibration.png", dpi=140)
    plt.close(fig)

    log("=== DONE ===")
    return payload


if __name__ == "__main__":
    main()
