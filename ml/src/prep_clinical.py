"""
Módulo B — Riesgo clínico (Diabetes Prediction Dataset, 100,000 filas).

Columnas: gender, age, hypertension, heart_disease, smoking_history, bmi,
HbA1c_level, blood_glucose_level, diabetes (target).

Limpieza [PLAN_MAESTRO sec 3.2]:
- Duplicados exactos -> eliminar (se detectaron ~3,854 en EDA previa).
- `smoking_history == "No Info"` -> tratar como categoría de "desconocido" explícita
  (no se descarta la fila: es información real de que el dato no se reportó).
- bmi / HbA1c_level / blood_glucose_level en 0 (o fuera de rango fisiológico) ->
  inválidos -> imputar con mediana de la clase correspondiente.
- Outliers en bmi vía IQR -> winsorizar a los límites.
"""
from __future__ import annotations

import json

import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
import numpy as np
import pandas as pd
import seaborn as sns
from sklearn.compose import ColumnTransformer
from sklearn.model_selection import train_test_split
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import StandardScaler, OneHotEncoder
import joblib

from common import DATASETS_DIR, FIGURES_DIR, ARTIFACTS_DIR, RANDOM_STATE, save_json

DATASET_NAME = "clinical"
RAW_CSV = DATASETS_DIR / "diabetes_prediction_dataset.csv"

NUMERIC_FEATURES = ["age", "bmi", "HbA1c_level", "blood_glucose_level"]
BINARY_FEATURES = ["hypertension", "heart_disease"]
CATEGORICAL_FEATURES = ["gender", "smoking_history"]
ALL_FEATURES = NUMERIC_FEATURES + BINARY_FEATURES + CATEGORICAL_FEATURES
TARGET = "diabetes"

# Rangos fisiológicos plausibles
BMI_MIN, BMI_MAX = 10.0, 80.0
HBA1C_MIN, HBA1C_MAX = 3.0, 20.0
GLUCOSE_MIN, GLUCOSE_MAX = 40, 400
AGE_MIN, AGE_MAX = 0, 110


def load_and_clean() -> tuple[pd.DataFrame, dict]:
    df = pd.read_csv(RAW_CSV)
    n_before = len(df)

    # 1) Duplicados
    df = df.drop_duplicates()
    n_dupes = n_before - len(df)

    # 2) "No Info" en smoking_history -> categoría explícita "unknown" (no se pierde la fila)
    df["smoking_history"] = df["smoking_history"].replace({"No Info": "unknown"})

    # 3) Valores imposibles -> NaN y luego imputación por mediana
    invalid_counts = {}
    for col, (lo, hi) in {
        "bmi": (BMI_MIN, BMI_MAX),
        "HbA1c_level": (HBA1C_MIN, HBA1C_MAX),
        "blood_glucose_level": (GLUCOSE_MIN, GLUCOSE_MAX),
        "age": (AGE_MIN, AGE_MAX),
    }.items():
        mask = (df[col] <= 0) | (df[col] < lo) | (df[col] > hi)
        invalid_counts[col] = int(mask.sum())
        df.loc[mask, col] = np.nan
        df[col] = df[col].fillna(df[col].median())

    # 4) Outliers IQR en bmi -> winsorizar
    q1, q3 = df["bmi"].quantile([0.25, 0.75])
    iqr = q3 - q1
    lower, upper = q1 - 1.5 * iqr, q3 + 1.5 * iqr
    n_outliers = int(((df["bmi"] < lower) | (df["bmi"] > upper)).sum())
    df["bmi"] = df["bmi"].clip(lower, upper)

    df[TARGET] = df[TARGET].astype(int)

    meta = {
        "rows_raw": n_before,
        "duplicates_removed": n_dupes,
        "rows_after_dedupe": len(df),
        "invalid_values_imputed": invalid_counts,
        "bmi_iqr_outliers_winsorized": n_outliers,
        "positive_rate": float(df[TARGET].mean()),
    }
    return df, meta


def run_eda(df: pd.DataFrame):
    sns.set_theme(style="whitegrid")

    fig, ax = plt.subplots(figsize=(5, 4))
    df[TARGET].value_counts().sort_index().plot(kind="bar", ax=ax, color=["#2563eb", "#dc2626"])
    ax.set_xticklabels(["No diabetes (0)", "Diabetes (1)"], rotation=0)
    ax.set_title("Distribución de clases — Módulo Clínico")
    fig.tight_layout()
    fig.savefig(FIGURES_DIR / "clinical_class_distribution.png", dpi=140)
    plt.close(fig)

    fig, axes = plt.subplots(1, 3, figsize=(14, 4))
    for ax, col in zip(axes, ["bmi", "HbA1c_level", "blood_glucose_level"]):
        sns.boxplot(x=TARGET, y=col, data=df, ax=ax, palette=["#2563eb", "#dc2626"])
        ax.set_title(f"{col} vs Diabetes")
    fig.tight_layout()
    fig.savefig(FIGURES_DIR / "clinical_boxplots_vs_target.png", dpi=140)
    plt.close(fig)

    fig, ax = plt.subplots(figsize=(6, 4))
    sns.histplot(data=df, x="blood_glucose_level", hue=TARGET, bins=40, kde=True, ax=ax,
                 palette=["#2563eb", "#dc2626"])
    ax.set_title("Glucosa en sangre por clase")
    fig.tight_layout()
    fig.savefig(FIGURES_DIR / "clinical_glucose_hist.png", dpi=140)
    plt.close(fig)

    fig, ax = plt.subplots(figsize=(12, 8))
    corr_cols = NUMERIC_FEATURES + BINARY_FEATURES + [TARGET]
    sns.heatmap(df[corr_cols].corr(), cmap="coolwarm", center=0, annot=True, fmt=".2f", ax=ax)
    ax.set_title("Mapa de correlación — Módulo Clínico")
    fig.tight_layout()
    fig.savefig(FIGURES_DIR / "clinical_correlation_heatmap.png", dpi=140)
    plt.close(fig)

    return {}


def build_preprocessor() -> ColumnTransformer:
    numeric_pipeline = Pipeline([("scaler", StandardScaler())])
    binary_pipeline = Pipeline([("scaler", StandardScaler())])
    categorical_pipeline = Pipeline([("onehot", OneHotEncoder(handle_unknown="ignore"))])

    preprocessor = ColumnTransformer(
        transformers=[
            ("num", numeric_pipeline, NUMERIC_FEATURES),
            ("bin", binary_pipeline, BINARY_FEATURES),
            ("cat", categorical_pipeline, CATEGORICAL_FEATURES),
        ],
        remainder="drop",
    )
    return preprocessor


def main():
    df, clean_meta = load_and_clean()
    eda_meta = run_eda(df)

    X = df[ALL_FEATURES]
    y = df[TARGET].values

    X_train, X_temp, y_train, y_temp = train_test_split(
        X, y, test_size=0.30, stratify=y, random_state=RANDOM_STATE
    )
    X_val, X_test, y_val, y_test = train_test_split(
        X_temp, y_temp, test_size=0.50, stratify=y_temp, random_state=RANDOM_STATE
    )

    preprocessor = build_preprocessor()
    X_train_t = preprocessor.fit_transform(X_train)
    X_val_t = preprocessor.transform(X_val)
    X_test_t = preprocessor.transform(X_test)

    # Nombres de features tras one-hot (para SHAP / feature_schema)
    cat_names = list(preprocessor.named_transformers_["cat"]["onehot"].get_feature_names_out(CATEGORICAL_FEATURES))
    feature_names = NUMERIC_FEATURES + BINARY_FEATURES + cat_names

    np.savez_compressed(
        ARTIFACTS_DIR / f"{DATASET_NAME}_arrays.npz",
        X_train=X_train_t, y_train=y_train,
        X_val=X_val_t, y_val=y_val,
        X_test=X_test_t, y_test=y_test,
    )
    joblib.dump(preprocessor, ARTIFACTS_DIR / f"{DATASET_NAME}_preprocessor.joblib")

    schema = {
        "module": "clinical",
        "target": TARGET,
        "feature_order_raw": ALL_FEATURES,
        "feature_order_encoded": feature_names,
        "numeric_features": NUMERIC_FEATURES,
        "binary_features": BINARY_FEATURES,
        "categorical_features": CATEGORICAL_FEATURES,
        "categorical_choices": {
            "gender": sorted(df["gender"].unique().tolist()),
            "smoking_history": sorted(df["smoking_history"].unique().tolist()),
        },
        "ranges": {
            "age": {"min": 0, "max": 110, "type": "float", "help": "Edad en años"},
            "bmi": {"min": 10, "max": 80, "type": "float", "help": "Índice de masa corporal"},
            "HbA1c_level": {"min": 3.0, "max": 20.0, "type": "float", "help": "Hemoglobina glicosilada (%)"},
            "blood_glucose_level": {"min": 40, "max": 400, "type": "int", "help": "Glucosa en sangre (mg/dL)"},
            "hypertension": {"min": 0, "max": 1, "type": "int"},
            "heart_disease": {"min": 0, "max": 1, "type": "int"},
        },
    }
    save_json(schema, ARTIFACTS_DIR / f"{DATASET_NAME}_feature_schema.json")

    report = {**clean_meta, **eda_meta, "n_train": len(y_train), "n_val": len(y_val), "n_test": len(y_test)}
    save_json(report, ARTIFACTS_DIR / f"{DATASET_NAME}_prep_report.json")
    print(json.dumps(report, indent=2))


if __name__ == "__main__":
    main()
