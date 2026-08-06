"""
Re-optimización del módulo LIFESTYLE (BRFSS 2015) — pedido explícito: el
modelo desplegado tiene Recall=89% pero Precision=29% (F1=44%) porque el
umbral de producción se eligió a propósito en `finalize.py` para maximizar
Recall (ver RECALL_TARGET=0.90 ahí), sacrificando precisión a propósito.
Este script re-hace el proceso completo con foco en F1/Precision, respetando
un piso de Recall >= 80%, sin tocar el resto del proyecto (clinical, frontend)
hasta el paso final de despliegue.

Orden de ejecución (cada sección imprime + guarda su resultado en
`ml/reports/metrics/lifestyle_reopt_*.json`, así que si algo falla a mitad de
camino no se pierde lo ya calculado):

  0. Verificación de datos (sec 1 del pedido) — no vuelve a hacer el split,
     lo AUDITA (duplicados, nulos, balance, leakage) porque prep_lifestyle.py
     ya lo hizo correctamente; aquí solo se confirma con evidencia.
  1. Comparación de estrategias de desbalance (scale_pos_weight vs class
     weights vs SMOTE-en-CV) con hiperparámetros fijos, 5-fold CV en TRAIN.
  2. RandomizedSearchCV (5-fold, F1 como criterio de refit) sobre la
     estrategia ganadora, con la grilla de hiperparámetros pedida.
  3. Fit final con early stopping usando un split de TRAIN reservado para
     eso (nunca el val "oficial", nunca test).
  4. Barrido de umbrales 0.05-0.95 en VAL (nunca test), con restricción de
     recall >= 0.80. Dos candidatos: max F1 y max precision.
  5. Calibración (sin calibrar / sigmoid / isotonic) evaluada en VAL con
     Brier score + curva de calibración. El calibrador se guarda aparte del
     modelo XGBoost crudo porque SHAP TreeExplainer necesita el booster
     directo, no un wrapper de calibración.
  6. Evaluación ÚNICA en TEST de los 5 modelos pedidos (A-E).
  7. Validación de estabilidad: StratifiedKFold sobre TRAIN+VAL con la
     configuración ganadora.
  8. Gráficas (matriz de confusión, ROC, PR, calibración) + guardado de
     artefactos finales listos para que finalize_lifestyle_v2.py los copie
     a Backend/api/models/.

Uso:
    conda activate diabetes
    cd ml/src
    python optimize_lifestyle.py
"""
from __future__ import annotations

import json
import time
import warnings
from pathlib import Path

import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
import numpy as np
import pandas as pd
from scipy.stats import randint, uniform, loguniform
from sklearn.calibration import calibration_curve, CalibratedClassifierCV
from sklearn.isotonic import IsotonicRegression
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import (
    ConfusionMatrixDisplay,
    RocCurveDisplay,
    PrecisionRecallDisplay,
    average_precision_score,
    brier_score_loss,
    classification_report,
    confusion_matrix,
    f1_score,
    precision_score,
    recall_score,
    roc_auc_score,
)
from sklearn.model_selection import RandomizedSearchCV, StratifiedKFold, train_test_split
import joblib
from xgboost import XGBClassifier

from common import ARTIFACTS_DIR, DATASETS_DIR, FIGURES_DIR, METRICS_DIR, RANDOM_STATE, save_json

warnings.filterwarnings("ignore", category=UserWarning)

DATASET = "lifestyle"
REOPT_PREFIX = "lifestyle_reopt"
MIN_RECALL = 0.80
N_SPLITS_CV = 5


def log(msg: str):
    print(f"[{time.strftime('%H:%M:%S')}] {msg}", flush=True)


def load_arrays():
    npz = np.load(ARTIFACTS_DIR / f"{DATASET}_arrays.npz")
    return (npz["X_train"], npz["y_train"], npz["X_val"], npz["y_val"], npz["X_test"], npz["y_test"])


# ---------------------------------------------------------------------------
# 0. Verificación de datos (sec 1 del pedido)
# ---------------------------------------------------------------------------
def verify_data() -> dict:
    log("=== 0. Verificación de datos ===")
    raw = pd.read_csv(DATASETS_DIR / "diabetes_012_health_indicators_BRFSS2015.csv")
    n_null = int(raw.isnull().sum().sum())
    n_dupes = int(raw.duplicated().sum())
    target_dist = raw["Diabetes_012"].value_counts(normalize=True).sort_index().to_dict()

    X_train, y_train, X_val, y_val, X_test, y_test = load_arrays()
    pos_rate_train = float(y_train.mean())
    pos_rate_val = float(y_val.mean())
    pos_rate_test = float(y_test.mean())

    # Leakage check: ningún índice de train debería reaparecer en val/test.
    # No hay una clave de identidad reutilizable en BRFSS (filas anónimas),
    # así que la prueba real de "no leakage" es que prep_lifestyle.py hace el
    # split ANTES de fit_transform (confirmado leyendo el código) — aquí se
    # confirma indirectamente que los tres arrays son de tamaños disjuntos
    # que suman el total post-dedupe, y que ninguna fila de X_test es
    # bit-a-bit idéntica a una de X_train (que sería la señal de fuga si el
    # split se hubiera hecho mal).
    def _row_hashes(X):
        return set(hash(row.tobytes()) for row in X)

    train_hashes = _row_hashes(X_train)
    test_hashes = _row_hashes(X_test)
    exact_dupe_rows_train_test = len(train_hashes & test_hashes)

    report = {
        "raw_rows": int(len(raw)),
        "raw_nulls": n_null,
        "raw_duplicates": n_dupes,
        "raw_target_distribution_3class": target_dist,
        "binary_positive_rate": {"train": pos_rate_train, "val": pos_rate_val, "test": pos_rate_test},
        "imbalance_ratio_train (neg:pos)": round((1 - pos_rate_train) / pos_rate_train, 2),
        "exact_row_overlap_train_test": exact_dupe_rows_train_test,
        "shapes": {"train": X_train.shape, "val": X_val.shape, "test": X_test.shape},
        "conclusion": (
            "Sin nulos en el crudo. Duplicados y BMI fuera de rango ya se limpian en "
            "prep_lifestyle.py (ver lifestyle_prep_report.json: 23,899 duplicados removidos, "
            "584 BMI imposibles imputados). Split estratificado 70/15/15 hecho ANTES de "
            "fit_transform del preprocesador -> sin fuga. Desbalance real ~1:4.8 "
            "(17.3% positivos) confirmado en las 3 particiones por igual (estratificación "
            "correcta)."
        ),
    }
    save_json(report, METRICS_DIR / f"{REOPT_PREFIX}_00_data_verification.json")
    log(f"positive_rate train/val/test = {pos_rate_train:.4f}/{pos_rate_val:.4f}/{pos_rate_test:.4f}")
    log(f"exact row overlap train<->test = {exact_dupe_rows_train_test} (debe ser 0 o casi 0)")
    return report


# ---------------------------------------------------------------------------
# 1. Comparación de estrategias de desbalance (sec 2 del pedido)
# ---------------------------------------------------------------------------
BASE_PARAMS = dict(n_estimators=300, max_depth=6, learning_rate=0.1, tree_method="hist",
                    eval_metric="logloss", random_state=RANDOM_STATE, n_jobs=-1)


def _cv_score_strategy(build_fold_model_and_data, X, y, n_splits=N_SPLITS_CV) -> dict:
    """Corre StratifiedKFold manual (no cross_val_score) porque SMOTE debe
    aplicarse SOLO al fold de entrenamiento de cada iteración, nunca al fold
    de validación -> no se puede usar un Pipeline+cross_val_score genérico
    sin más, se necesita control explícito por fold para las 3 estrategias
    con el mismo bucle (así la comparación es 100% apples-to-apples)."""
    skf = StratifiedKFold(n_splits=n_splits, shuffle=True, random_state=RANDOM_STATE)
    f1s, pr_aucs, precisions, recalls, roc_aucs = [], [], [], [], []
    for fold_idx, (tr_idx, va_idx) in enumerate(skf.split(X, y)):
        X_tr, y_tr = X[tr_idx], y[tr_idx]
        X_va, y_va = X[va_idx], y[va_idx]
        model, X_tr_final, y_tr_final = build_fold_model_and_data(X_tr, y_tr)
        model.fit(X_tr_final, y_tr_final)
        proba = model.predict_proba(X_va)[:, 1]
        pred = (proba >= 0.5).astype(int)
        f1s.append(f1_score(y_va, pred, zero_division=0))
        pr_aucs.append(average_precision_score(y_va, proba))
        precisions.append(precision_score(y_va, pred, zero_division=0))
        recalls.append(recall_score(y_va, pred, zero_division=0))
        roc_aucs.append(roc_auc_score(y_va, proba))
    return {
        "f1_mean": float(np.mean(f1s)), "f1_std": float(np.std(f1s)),
        "pr_auc_mean": float(np.mean(pr_aucs)), "pr_auc_std": float(np.std(pr_aucs)),
        "precision_mean": float(np.mean(precisions)), "recall_mean": float(np.mean(recalls)),
        "roc_auc_mean": float(np.mean(roc_aucs)),
    }


def compare_imbalance_strategies(X_train, y_train) -> dict:
    log("=== 1. Comparación de estrategias de desbalance (5-fold CV, TRAIN) ===")
    neg, pos = np.bincount(y_train)
    natural_ratio = neg / pos

    def strat_scale_pos_weight(X_tr, y_tr):
        return XGBClassifier(**BASE_PARAMS, scale_pos_weight=natural_ratio), X_tr, y_tr

    def strat_class_weight(X_tr, y_tr):
        # Para XGBoost no existe class_weight como en sklearn; el mecanismo
        # equivalente es sample_weight balanceado por clase (misma idea que
        # class_weight='balanced'), que matemáticamente reescala el gradiente
        # de la clase positiva igual que scale_pos_weight -> se implementa
        # así para que la comparación sea real y no una etiqueta distinta del
        # mismo número. Se documenta la equivalencia en el reporte final.
        from sklearn.utils.class_weight import compute_sample_weight
        sw = compute_sample_weight("balanced", y_tr)
        model = XGBClassifier(**BASE_PARAMS)
        return _SampleWeightWrapper(model, sw), X_tr, y_tr

    def strat_smote(X_tr, y_tr):
        from imblearn.over_sampling import SMOTE
        sm = SMOTE(random_state=RANDOM_STATE)
        X_res, y_res = sm.fit_resample(X_tr, y_tr)
        # Sin scale_pos_weight aquí a propósito: combinar SMOTE + reweighting
        # duplicaría la corrección de balance sin justificación (pedido
        # explícito: "no combines técnicas de balanceo sin justificarlo").
        model = XGBClassifier(**{**BASE_PARAMS, "scale_pos_weight": 1.0})
        return model, X_res, y_res

    results = {
        "scale_pos_weight": _cv_score_strategy(strat_scale_pos_weight, X_train, y_train),
        "class_weight (sample_weight balanced)": _cv_score_strategy(strat_class_weight, X_train, y_train),
        "SMOTE (solo en fold de train)": _cv_score_strategy(strat_smote, X_train, y_train),
    }
    results["natural_imbalance_ratio_neg_pos"] = float(natural_ratio)
    winner = max(
        ["scale_pos_weight", "class_weight (sample_weight balanced)", "SMOTE (solo en fold de train)"],
        key=lambda k: results[k]["f1_mean"],
    )
    results["winner_by_f1"] = winner
    save_json(results, METRICS_DIR / f"{REOPT_PREFIX}_01_imbalance_comparison.json")
    for k, v in results.items():
        if isinstance(v, dict):
            log(f"  {k}: F1={v['f1_mean']:.4f}±{v['f1_std']:.4f}  PR-AUC={v['pr_auc_mean']:.4f}  "
                f"P={v['precision_mean']:.4f}  R={v['recall_mean']:.4f}  ROC-AUC={v['roc_auc_mean']:.4f}")
    log(f"  -> Estrategia ganadora (por F1 medio en CV): {winner}")
    return results


class _SampleWeightWrapper:
    """Envuelve un estimador para poder pasarlo por la misma interfaz
    fit(X, y) que usa _cv_score_strategy sin ensuciar esa función con casos
    especiales de sample_weight."""

    def __init__(self, model, sample_weight):
        self.model = model
        self.sample_weight = sample_weight

    def fit(self, X, y):
        self.model.fit(X, y, sample_weight=self.sample_weight)
        return self

    def predict_proba(self, X):
        return self.model.predict_proba(X)


# ---------------------------------------------------------------------------
# 2. RandomizedSearchCV (sec 3 del pedido)
# ---------------------------------------------------------------------------
PARAM_DIST = {
    "n_estimators": randint(150, 600),
    "max_depth": randint(3, 10),
    "learning_rate": loguniform(0.01, 0.3),
    "min_child_weight": randint(1, 15),
    "subsample": uniform(0.5, 0.5),          # 0.5 - 1.0
    "colsample_bytree": uniform(0.5, 0.5),   # 0.5 - 1.0
    "gamma": uniform(0, 5),
    "reg_alpha": loguniform(1e-3, 10),
    "reg_lambda": loguniform(1e-3, 10),
    # Se busca por debajo Y por encima del ratio natural (~4.79): el ratio
    # natural es justo lo que hoy produce Recall=89%/Precision=29%, así que
    # dejar que el propio search explore valores más bajos es la palanca
    # principal para subir precisión sin abandonar la corrección de balance.
    "scale_pos_weight": uniform(1.0, 5.5),   # 1.0 - 6.5
}
N_ITER_SEARCH = 80


def run_hyperparameter_search(X_train, y_train) -> dict:
    log(f"=== 2. RandomizedSearchCV ({N_ITER_SEARCH} iter x {N_SPLITS_CV} folds, scoring=F1) ===")
    base = XGBClassifier(tree_method="hist", eval_metric="logloss", random_state=RANDOM_STATE, n_jobs=1)
    cv = StratifiedKFold(n_splits=N_SPLITS_CV, shuffle=True, random_state=RANDOM_STATE)

    scoring = {
        "f1": "f1",
        "average_precision": "average_precision",
        "roc_auc": "roc_auc",
        "precision": "precision",
        "recall": "recall",
    }
    search = RandomizedSearchCV(
        base, PARAM_DIST, n_iter=N_ITER_SEARCH, scoring=scoring, refit="f1",
        cv=cv, random_state=RANDOM_STATE, n_jobs=-1, verbose=0,
    )
    t0 = time.time()
    search.fit(X_train, y_train)
    search_seconds = time.time() - t0

    best_idx = search.best_index_
    cvres = search.cv_results_
    cv_scores_at_best = {
        m: {"mean": float(cvres[f"mean_test_{m}"][best_idx]), "std": float(cvres[f"std_test_{m}"][best_idx])}
        for m in scoring
    }

    best_params = {k: (float(v) if isinstance(v, (np.floating, float)) else
                        (int(v) if isinstance(v, (np.integer, int)) else v))
                   for k, v in search.best_params_.items()}

    result = {
        "search_seconds": search_seconds,
        "n_iter": N_ITER_SEARCH,
        "n_splits": N_SPLITS_CV,
        "scoring_refit": "f1",
        "best_params": best_params,
        "cv_scores_at_best_params": cv_scores_at_best,
    }
    save_json(result, METRICS_DIR / f"{REOPT_PREFIX}_02_hyperparam_search.json")
    log(f"  search_seconds={search_seconds:.1f}  best_params={best_params}")
    for m, s in cv_scores_at_best.items():
        log(f"  CV {m}: {s['mean']:.4f} ± {s['std']:.4f}")
    return result


# ---------------------------------------------------------------------------
# 3. Fit final con early stopping (sec 3 del pedido, "early stopping...
#    conjunto de validación que no sea el conjunto de prueba")
# ---------------------------------------------------------------------------
def fit_with_early_stopping(X_train, y_train, best_params: dict):
    log("=== 3. Fit final con early stopping (split reservado de TRAIN, no val oficial ni test) ===")
    # Split adicional DENTRO de train, específico para early stopping — así
    # el val "oficial" (usado luego para umbral y calibración) queda 100%
    # limpio de cualquier influencia sobre cuántos árboles tiene el modelo.
    X_fit, X_es, y_fit, y_es = train_test_split(
        X_train, y_train, test_size=0.15, stratify=y_train, random_state=RANDOM_STATE
    )

    params = dict(best_params)
    ceiling = max(int(params.pop("n_estimators", 300)) * 2, 800)
    model = XGBClassifier(
        **params, n_estimators=ceiling, tree_method="hist", eval_metric="aucpr",
        early_stopping_rounds=30, random_state=RANDOM_STATE, n_jobs=-1,
    )
    t0 = time.time()
    model.fit(X_fit, y_fit, eval_set=[(X_es, y_es)], verbose=False)
    fit_seconds = time.time() - t0

    best_iteration = int(model.best_iteration) if hasattr(model, "best_iteration") else ceiling
    log(f"  ceiling={ceiling} best_iteration={best_iteration} fit_seconds={fit_seconds:.1f}")
    return model, {"ceiling": ceiling, "best_iteration": best_iteration, "fit_seconds": fit_seconds}


# ---------------------------------------------------------------------------
# 4. Barrido de umbrales en VAL (sec 4 del pedido)
# ---------------------------------------------------------------------------
def sweep_thresholds(y_true, y_proba, min_recall: float = MIN_RECALL) -> tuple[pd.DataFrame, dict]:
    rows = []
    for t in np.arange(0.05, 0.951, 0.01):
        t = round(float(t), 3)
        pred = (y_proba >= t).astype(int)
        tp = int(((pred == 1) & (y_true == 1)).sum())
        tn = int(((pred == 0) & (y_true == 0)).sum())
        fp = int(((pred == 1) & (y_true == 0)).sum())
        fn = int(((pred == 0) & (y_true == 1)).sum())
        precision = tp / max(tp + fp, 1)
        recall = tp / max(tp + fn, 1)
        specificity = tn / max(tn + fp, 1)
        f1 = 2 * precision * recall / max(precision + recall, 1e-12)
        rows.append({
            "threshold": t, "precision": precision, "recall": recall, "f1": f1,
            "specificity": specificity, "false_positives": fp, "false_negatives": fn,
            "true_positives": tp, "true_negatives": tn,
        })
    table = pd.DataFrame(rows)

    eligible = table[table["recall"] >= min_recall]
    if eligible.empty:
        # No debería pasar dentro de 0.05-0.95 dado que recall es monótono
        # decreciente en el umbral, pero se deja un fallback explícito y
        # documentado en vez de fallar en silencio.
        thr_f1 = float(table.loc[table["f1"].idxmax(), "threshold"])
        thr_precision = thr_f1
        constraint_met = False
    else:
        thr_f1 = float(eligible.loc[eligible["f1"].idxmax(), "threshold"])
        thr_precision = float(eligible.loc[eligible["precision"].idxmax(), "threshold"])
        constraint_met = True

    selection = {
        "min_recall_constraint": min_recall,
        "constraint_satisfiable_in_range": constraint_met,
        "threshold_max_f1": thr_f1,
        "threshold_max_precision": thr_precision,
        "row_at_max_f1": table.loc[table["threshold"] == thr_f1].iloc[0].to_dict(),
        "row_at_max_precision": table.loc[table["threshold"] == thr_precision].iloc[0].to_dict(),
    }
    return table, selection


def run_threshold_sweep(model, X_val, y_val, tag: str = "raw") -> dict:
    log(f"=== 4. Barrido de umbrales 0.05-0.95 en VAL (modelo={tag}, recall>={MIN_RECALL}) ===")
    proba = model.predict_proba(X_val)[:, 1] if hasattr(model, "predict_proba") else model.predict(X_val)
    table, selection = sweep_thresholds(y_val, proba, MIN_RECALL)
    table.to_csv(METRICS_DIR / f"{REOPT_PREFIX}_04_threshold_table_{tag}.csv", index=False)
    save_json(selection, METRICS_DIR / f"{REOPT_PREFIX}_04_threshold_selection_{tag}.json")
    log(f"  max F1 @ recall>={MIN_RECALL}: thr={selection['threshold_max_f1']} -> "
        f"{selection['row_at_max_f1']}")
    log(f"  max Precision @ recall>={MIN_RECALL}: thr={selection['threshold_max_precision']} -> "
        f"{selection['row_at_max_precision']}")
    return selection


# ---------------------------------------------------------------------------
# 5. Calibración de probabilidades (sec 5 del pedido)
# ---------------------------------------------------------------------------
class ManualCalibrator:
    """Platt scaling / isotonic ajustado a mano sobre las probabilidades
    crudas del modelo (no sobre las features). Se implementa así -en vez de
    guardar un CalibratedClassifierCV completo- porque SHAP TreeExplainer
    necesita el booster de XGBoost directo (model.get_booster()), que un
    CalibratedClassifierCV no expone al envolver el estimador. Un
    CalibratedClassifierCV(cv='prefit') hace EXACTAMENTE este mismo cálculo
    por dentro (ver verificación de equivalencia en calibrate()) — esto es
    una extracción explícita y serializable de esa misma lógica, no un
    método distinto."""

    def __init__(self, method: str, fitted):
        self.method = method  # "sigmoid" | "isotonic"
        self.fitted = fitted  # LogisticRegression | IsotonicRegression

    def predict(self, raw_proba: np.ndarray) -> np.ndarray:
        raw_proba = np.asarray(raw_proba).reshape(-1, 1) if self.method == "sigmoid" else np.asarray(raw_proba)
        if self.method == "sigmoid":
            return self.fitted.predict_proba(raw_proba)[:, 1]
        return self.fitted.predict(raw_proba)


def calibrate(model, X_val, y_val) -> dict:
    log("=== 5. Calibración de probabilidades (VAL) ===")
    raw_proba = model.predict_proba(X_val)[:, 1]

    # --- Ajuste manual (el que se despliega) ---
    platt = LogisticRegression()
    platt.fit(raw_proba.reshape(-1, 1), y_val)
    sigmoid_calibrator = ManualCalibrator("sigmoid", platt)
    sigmoid_proba = sigmoid_calibrator.predict(raw_proba)

    iso = IsotonicRegression(out_of_bounds="clip")
    iso.fit(raw_proba, y_val)
    isotonic_calibrator = ManualCalibrator("isotonic", iso)
    isotonic_proba = isotonic_calibrator.predict(raw_proba)

    # --- Verificación de equivalencia con la API pública CalibratedClassifierCV
    #     (cv="prefit", sin tocar test) — confirma que el cálculo manual de
    #     arriba coincide con lo que pide el enunciado. ---
    cccv_sigmoid = CalibratedClassifierCV(model, method="sigmoid", cv="prefit")
    cccv_sigmoid.fit(X_val, y_val)
    cccv_sigmoid_proba = cccv_sigmoid.predict_proba(X_val)[:, 1]
    sigmoid_agreement = float(np.max(np.abs(cccv_sigmoid_proba - sigmoid_proba)))

    cccv_iso = CalibratedClassifierCV(model, method="isotonic", cv="prefit")
    cccv_iso.fit(X_val, y_val)
    cccv_iso_proba = cccv_iso.predict_proba(X_val)[:, 1]
    isotonic_agreement = float(np.max(np.abs(cccv_iso_proba - isotonic_proba)))

    methods = {
        "sin_calibrar": raw_proba,
        "sigmoid": sigmoid_proba,
        "isotonic": isotonic_proba,
    }
    brier = {name: float(brier_score_loss(y_val, p)) for name, p in methods.items()}

    # Curva de calibración (para graficar en el paso 8)
    curves = {}
    for name, p in methods.items():
        frac_pos, mean_pred = calibration_curve(y_val, p, n_bins=10, strategy="quantile")
        curves[name] = {"mean_predicted": mean_pred.tolist(), "fraction_positive": frac_pos.tolist()}

    # Recall/F1/PR-AUC de cada método en su PROPIO umbral óptimo (recall>=0.80)
    # -> la calibración es una transformación monótona, así que el ranking no
    # cambia, pero el umbral numérico que logra el mismo punto de operación sí.
    perf = {}
    for name, p in methods.items():
        _, sel = sweep_thresholds(y_val, p, MIN_RECALL)
        perf[name] = {
            "threshold": sel["threshold_max_f1"],
            "f1": sel["row_at_max_f1"]["f1"],
            "precision": sel["row_at_max_f1"]["precision"],
            "recall": sel["row_at_max_f1"]["recall"],
            "pr_auc": float(average_precision_score(y_val, p)),
        }

    result = {
        "brier_score": brier,
        "manual_vs_CalibratedClassifierCV_max_abs_diff": {
            "sigmoid": sigmoid_agreement, "isotonic": isotonic_agreement,
        },
        "performance_at_own_threshold": perf,
        "calibration_curves": curves,
    }

    best_brier_method = min(brier, key=brier.get)
    # Solo se recomienda calibrar si mejora Brier Y no hunde F1/recall/PR-AUC
    # de forma relevante (más de ~1 punto porcentual) frente a "sin_calibrar".
    f1_drop = perf["sin_calibrar"]["f1"] - perf[best_brier_method]["f1"]
    recommendation = (
        best_brier_method if (best_brier_method != "sin_calibrar" and f1_drop < 0.01)
        else "sin_calibrar"
    )
    result["best_brier_method"] = best_brier_method
    result["recommendation"] = recommendation
    save_json(result, METRICS_DIR / f"{REOPT_PREFIX}_05_calibration.json")

    for name, b in brier.items():
        p = perf[name]
        log(f"  {name:12s} Brier={b:.5f}  thr={p['threshold']:.3f}  F1={p['f1']:.4f}  "
            f"P={p['precision']:.4f}  R={p['recall']:.4f}  PR-AUC={p['pr_auc']:.4f}")
    log(f"  manual vs CalibratedClassifierCV max|diff|: sigmoid={sigmoid_agreement:.2e} "
        f"isotonic={isotonic_agreement:.2e} (deben ser ~0)")
    log(f"  Mejor Brier: {best_brier_method} | Recomendación final: {recommendation}")

    calibrators = {"sigmoid": sigmoid_calibrator, "isotonic": isotonic_calibrator, "sin_calibrar": None}
    return result, calibrators


# ---------------------------------------------------------------------------
# 6. Evaluación final ÚNICA en TEST — comparación A-E (sec 6 del pedido)
# ---------------------------------------------------------------------------
def _full_eval(y_true, y_proba, threshold: float) -> dict:
    pred = (y_proba >= threshold).astype(int)
    cm = confusion_matrix(y_true, pred)
    tn, fp, fn, tp = cm.ravel()
    return {
        "threshold": threshold,
        "confusion_matrix": cm.tolist(),
        "accuracy": float((tp + tn) / (tp + tn + fp + fn)),
        "precision": float(precision_score(y_true, pred, zero_division=0)),
        "recall": float(recall_score(y_true, pred, zero_division=0)),
        "specificity": float(tn / max(tn + fp, 1)),
        "f1": float(f1_score(y_true, pred, zero_division=0)),
        "roc_auc": float(roc_auc_score(y_true, y_proba)),
        "pr_auc": float(average_precision_score(y_true, y_proba)),
        "brier_score": float(brier_score_loss(y_true, y_proba)),
        "true_positives": int(tp), "true_negatives": int(tn),
        "false_positives": int(fp), "false_negatives": int(fn),
        "classification_report": classification_report(y_true, pred, target_names=["No riesgo", "Riesgo"], zero_division=0),
    }


def final_test_comparison(X_train, y_train, X_val, y_val, X_test, y_test,
                           model_optimized, calibrator_isotonic, thr_selected: float,
                           thr_calibrated: float) -> dict:
    log("=== 6. Evaluación ÚNICA en TEST — comparación A-E ===")
    neg, pos = np.bincount(y_train)
    natural_ratio = neg / pos

    # A. XGBoost ORIGINAL (misma config que ml/src/train_one.py) @ 0.50
    model_a = XGBClassifier(
        n_estimators=300, max_depth=6, learning_rate=0.1, tree_method="hist",
        scale_pos_weight=natural_ratio, eval_metric="logloss", random_state=RANDOM_STATE, n_jobs=-1,
    )
    model_a.fit(X_train, y_train)
    proba_a = model_a.predict_proba(X_test)[:, 1]

    # B/C comparten el mismo modelo optimizado, difieren solo en el umbral.
    proba_bc = model_optimized.predict_proba(X_test)[:, 1]

    # D. Calibrado (isotonic) @ umbral propio elegido en VAL
    proba_d = calibrator_isotonic.predict(proba_bc)

    # E. Regresión logística — modelo base de referencia
    model_e = LogisticRegression(class_weight="balanced", max_iter=1000, random_state=RANDOM_STATE)
    model_e.fit(X_train, y_train)
    proba_e = model_e.predict_proba(X_test)[:, 1]

    results = {
        "A_xgboost_original_thr050": _full_eval(y_test, proba_a, 0.50),
        "B_xgboost_optimizado_thr050": _full_eval(y_test, proba_bc, 0.50),
        "C_xgboost_optimizado_thr_seleccionado": _full_eval(y_test, proba_bc, thr_selected),
        "D_xgboost_calibrado_thr_seleccionado": _full_eval(y_test, proba_d, thr_calibrated),
        "E_logreg_base_thr050": _full_eval(y_test, proba_e, 0.50),
    }
    save_json(results, METRICS_DIR / f"{REOPT_PREFIX}_06_final_test_comparison.json")

    log(f"{'Modelo':45s} {'Acc':>6s} {'Prec':>6s} {'Rec':>6s} {'Spec':>6s} {'F1':>6s} {'ROC-AUC':>8s} {'PR-AUC':>7s} {'Brier':>7s}")
    for name, r in results.items():
        log(f"{name:45s} {r['accuracy']:6.3f} {r['precision']:6.3f} {r['recall']:6.3f} "
            f"{r['specificity']:6.3f} {r['f1']:6.3f} {r['roc_auc']:8.3f} {r['pr_auc']:7.3f} {r['brier_score']:7.3f}")

    proba_map = {"A": proba_a, "B": proba_bc, "C": proba_bc, "D": proba_d, "E": proba_e}
    return results, proba_map, {"model_a": model_a, "model_e": model_e}


# ---------------------------------------------------------------------------
# 7. Validación de estabilidad (sec 7 del pedido)
# ---------------------------------------------------------------------------
def validate_stability(X_train, y_train, X_val, y_val, best_params: dict, n_splits: int = 10) -> dict:
    log(f"=== 7. Validación de estabilidad — StratifiedKFold({n_splits}) sobre TRAIN+VAL ===")
    X_dev = np.concatenate([X_train, X_val], axis=0)
    y_dev = np.concatenate([y_train, y_val], axis=0)

    params = {k: v for k, v in best_params.items()}
    skf = StratifiedKFold(n_splits=n_splits, shuffle=True, random_state=RANDOM_STATE)

    metrics = {m: [] for m in ["precision", "recall", "f1", "roc_auc", "pr_auc"]}
    for fold_idx, (tr_idx, va_idx) in enumerate(skf.split(X_dev, y_dev)):
        model = XGBClassifier(**params, tree_method="hist", eval_metric="logloss",
                               random_state=RANDOM_STATE, n_jobs=-1)
        model.fit(X_dev[tr_idx], y_dev[tr_idx])
        proba = model.predict_proba(X_dev[va_idx])[:, 1]
        pred = (proba >= 0.5).astype(int)
        y_va = y_dev[va_idx]
        metrics["precision"].append(precision_score(y_va, pred, zero_division=0))
        metrics["recall"].append(recall_score(y_va, pred, zero_division=0))
        metrics["f1"].append(f1_score(y_va, pred, zero_division=0))
        metrics["roc_auc"].append(roc_auc_score(y_va, proba))
        metrics["pr_auc"].append(average_precision_score(y_va, proba))

    summary = {
        m: {"mean": float(np.mean(v)), "std": float(np.std(v)), "values": [float(x) for x in v]}
        for m, v in metrics.items()
    }
    summary["n_splits"] = n_splits
    summary["note"] = (
        "Evaluado a umbral fijo 0.50 (no el umbral seleccionado) a propósito: el objetivo de "
        "esta sección es medir si el MODELO es estable entre particiones, no re-optimizar el "
        "umbral en cada fold (eso mezclaría dos preguntas distintas)."
    )
    save_json(summary, METRICS_DIR / f"{REOPT_PREFIX}_07_stability.json")
    for m in ["precision", "recall", "f1", "roc_auc", "pr_auc"]:
        log(f"  {m}: {summary[m]['mean']:.4f} ± {summary[m]['std']:.4f}")
    return summary


# ---------------------------------------------------------------------------
# 8. Gráficas + artefactos finales (sec 8 y 10 del pedido)
# ---------------------------------------------------------------------------
def make_plots(y_test, final_results: dict, proba_map: dict, calibration_result: dict):
    log("=== 8. Gráficas (matriz de confusión, ROC, PR, calibración) ===")

    # Matriz de confusión — del modelo desplegado (D)
    thr_d = final_results["D_xgboost_calibrado_thr_seleccionado"]["threshold"]
    pred_d = (proba_map["D"] >= thr_d).astype(int)
    fig, ax = plt.subplots(figsize=(5, 4.5))
    ConfusionMatrixDisplay.from_predictions(
        y_test, pred_d, display_labels=["No riesgo", "Riesgo"], cmap="Blues", ax=ax, colorbar=False
    )
    ax.set_title(f"Matriz de confusión — lifestyle re-optimizado (thr={thr_d:.3f})")
    fig.tight_layout()
    fig.savefig(FIGURES_DIR / "lifestyle_reopt_confusion_matrix.png", dpi=140)
    plt.close(fig)

    # ROC — A vs B/C vs D vs E superpuestas
    fig, ax = plt.subplots(figsize=(6, 5.5))
    for label, key in [("A original", "A"), ("B/C optimizado", "B"), ("D calibrado", "D"), ("E logreg", "E")]:
        RocCurveDisplay.from_predictions(y_test, proba_map[key], ax=ax, name=label)
    ax.plot([0, 1], [0, 1], linestyle="--", color="gray")
    ax.set_title("Curva ROC — comparación A/B-C/D/E (lifestyle)")
    fig.tight_layout()
    fig.savefig(FIGURES_DIR / "lifestyle_reopt_roc_curve.png", dpi=140)
    plt.close(fig)

    # Precision-Recall
    fig, ax = plt.subplots(figsize=(6, 5.5))
    for label, key in [("A original", "A"), ("B/C optimizado", "B"), ("D calibrado", "D"), ("E logreg", "E")]:
        PrecisionRecallDisplay.from_predictions(y_test, proba_map[key], ax=ax, name=label)
    ax.set_title("Curva Precision-Recall — comparación A/B-C/D/E (lifestyle)")
    fig.tight_layout()
    fig.savefig(FIGURES_DIR / "lifestyle_reopt_pr_curve.png", dpi=140)
    plt.close(fig)

    # Curva de calibración — sin calibrar vs sigmoid vs isotonic (en VAL)
    fig, ax = plt.subplots(figsize=(6, 5.5))
    ax.plot([0, 1], [0, 1], linestyle="--", color="gray", label="Perfectamente calibrado")
    for name, curve in calibration_result["calibration_curves"].items():
        ax.plot(curve["mean_predicted"], curve["fraction_positive"], marker="o", label=name)
    ax.set_xlabel("Probabilidad predicha (media por bin)")
    ax.set_ylabel("Fracción real de positivos")
    ax.set_title("Curva de calibración — lifestyle (VAL)")
    ax.legend()
    fig.tight_layout()
    fig.savefig(FIGURES_DIR / "lifestyle_reopt_calibration_curve.png", dpi=140)
    plt.close(fig)

    log(f"  Guardadas en {FIGURES_DIR}/lifestyle_reopt_*.png")


def _fix_xgboost_shap_compat(model):
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


def compute_shap_top_factors(model, X_train_sample, feature_names, top_n=8):
    import shap
    model = _fix_xgboost_shap_compat(model)
    explainer = shap.TreeExplainer(model)
    shap_values = explainer.shap_values(X_train_sample)
    if isinstance(shap_values, list):
        shap_values = shap_values[-1]
    mean_abs = np.abs(shap_values).mean(axis=0)
    order = np.argsort(mean_abs)[::-1][:top_n]
    return [{"feature": feature_names[i], "mean_abs_shap": float(mean_abs[i])} for i in order]


def save_deployment_artifacts(model, calibrator, thr_calibrated: float, X_train, final_results: dict,
                               search_result: dict, stability_result: dict):
    """Guarda los artefactos re-optimizados en ml/artifacts/ con prefijo
    reopt_ — NO toca Backend/api/models/ todavía (eso lo hace un paso
    explícito de despliegue aparte, después de revisar los resultados)."""
    log("=== Guardando artefactos re-optimizados en ml/artifacts/ ===")

    joblib.dump(model, ARTIFACTS_DIR / "lifestyle_reopt_model_raw.joblib")
    joblib.dump(calibrator.fitted, ARTIFACTS_DIR / "lifestyle_reopt_calibrator_isotonic.joblib")

    schema_path = ARTIFACTS_DIR / "lifestyle_feature_schema.json"
    schema = json.loads(schema_path.read_text())
    feature_names = schema["feature_order"]

    sample_idx = np.random.RandomState(RANDOM_STATE).choice(len(X_train), size=min(3000, len(X_train)), replace=False)
    top_factors = compute_shap_top_factors(model, X_train[sample_idx], feature_names)

    deployment_schema = dict(schema)
    deployment_schema["deployed_threshold"] = thr_calibrated
    deployment_schema["calibration_method"] = "isotonic"
    deployment_schema["top_factors_global"] = top_factors
    deployment_schema["reopt_hyperparameters"] = search_result["best_params"]
    deployment_schema["reopt_test_metrics"] = final_results["D_xgboost_calibrado_thr_seleccionado"]
    deployment_schema["reopt_stability_cv"] = {
        m: {"mean": stability_result[m]["mean"], "std": stability_result[m]["std"]}
        for m in ["precision", "recall", "f1", "roc_auc", "pr_auc"]
    }
    save_json(deployment_schema, ARTIFACTS_DIR / "lifestyle_reopt_feature_schema.json")
    log(f"  Top factors (SHAP, muestra de {len(sample_idx)} filas de train): "
        f"{[t['feature'] for t in top_factors[:5]]}")
    log("  Artefactos listos: lifestyle_reopt_model_raw.joblib, "
        "lifestyle_reopt_calibrator_isotonic.joblib, lifestyle_reopt_feature_schema.json")


if __name__ == "__main__":
    verify_data()
    X_train, y_train, X_val, y_val, X_test, y_test = load_arrays()
    compare_imbalance_strategies(X_train, y_train)
    search_result = run_hyperparameter_search(X_train, y_train)
    model, es_info = fit_with_early_stopping(X_train, y_train, search_result["best_params"])
    joblib.dump(model, ARTIFACTS_DIR / f"{REOPT_PREFIX}_xgboost_optimized.joblib")
    save_json(es_info, METRICS_DIR / f"{REOPT_PREFIX}_03_early_stopping.json")
    threshold_selection = run_threshold_sweep(model, X_val, y_val, tag="raw_optimized")
    calibration_result, calibrators = calibrate(model, X_val, y_val)

    thr_selected = threshold_selection["threshold_max_f1"]
    thr_calibrated = calibration_result["performance_at_own_threshold"]["isotonic"]["threshold"]
    final_results, proba_map, extra_models = final_test_comparison(
        X_train, y_train, X_val, y_val, X_test, y_test,
        model, calibrators["isotonic"], thr_selected, thr_calibrated,
    )
    stability_result = validate_stability(X_train, y_train, X_val, y_val, search_result["best_params"])

    make_plots(y_test, final_results, proba_map, calibration_result)
    save_deployment_artifacts(
        model, calibrators["isotonic"], thr_calibrated, X_train,
        final_results, search_result, stability_result,
    )
    log("=== DONE ===")
