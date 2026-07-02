"""
Módulo A — Riesgo por estilo de vida (BRFSS 2015, diabetes_012_health_indicators).

Dataset original: 253,681 filas, target de 3 clases `Diabetes_012`
(0 = sin diabetes, 1 = prediabetes, 2 = diabetes).
Decisión [PLAN_MAESTRO sec 3.1]: entrenar sobre la versión completa desbalanceada,
binarizando el target -> Diabetes_binary = 1 si (prediabetes o diabetes), 0 si no.
Esto reproduce exactamente la semántica de `diabetes_binary_health_indicators_BRFSS2015.csv`
sin necesitar el CSV alternativo.

Ejecuta: limpieza, EDA (figuras), split estratificado 70/15/15, ColumnTransformer,
y guarda arrays + preprocesador + esquema de features.
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
from sklearn.preprocessing import StandardScaler
import joblib

from common import (
    DATASETS_DIR,
    FIGURES_DIR,
    ARTIFACTS_DIR,
    RANDOM_STATE,
    save_json,
)

DATASET_NAME = "lifestyle"
RAW_CSV = DATASETS_DIR / "diabetes_012_health_indicators_BRFSS2015.csv"

# BMI es la única variable numérica continua real; el resto son binarias 0/1 o
# categóricas/ordinales ya codificadas como enteros en el dataset original de BRFSS.
NUMERIC_FEATURES = ["BMI", "MentHlth", "PhysHlth"]
BINARY_FEATURES = [
    "HighBP", "HighChol", "CholCheck", "Smoker", "Stroke",
    "HeartDiseaseorAttack", "PhysActivity", "Fruits", "Veggies",
    "HvyAlcoholConsump", "AnyHealthcare", "NoDocbcCost", "DiffWalk", "Sex",
]
ORDINAL_FEATURES = ["GenHlth", "Age", "Education", "Income"]
ALL_FEATURES = NUMERIC_FEATURES + BINARY_FEATURES + ORDINAL_FEATURES
TARGET = "Diabetes_binary"

# Rangos fisiológicos plausibles para detectar valores imposibles / outliers extremos.
BMI_MIN, BMI_MAX = 12.0, 70.0


def load_and_clean() -> pd.DataFrame:
    df = pd.read_csv(RAW_CSV)

    # 1) Duplicados
    n_before = len(df)
    df = df.drop_duplicates()
    n_dupes = n_before - len(df)

    # 2) Binarizar target (0 sin diabetes; 1 = prediabetes o diabetes)
    df[TARGET] = (df["Diabetes_012"] > 0).astype(int)
    df = df.drop(columns=["Diabetes_012"])

    # 3) Valores imposibles: BMI fuera de rango fisiológico -> tratar como NaN e imputar con mediana
    n_bmi_invalid = int(((df["BMI"] < BMI_MIN) | (df["BMI"] > BMI_MAX)).sum())
    df.loc[(df["BMI"] < BMI_MIN) | (df["BMI"] > BMI_MAX), "BMI"] = np.nan

    # 4) Faltantes: BRFSS limpio no trae NaN salvo los que acabamos de introducir.
    df["BMI"] = df["BMI"].fillna(df["BMI"].median())

    # 5) Outliers en MentHlth/PhysHlth (rango válido documentado 0-30 días) -> clip
    for col in ["MentHlth", "PhysHlth"]:
        df[col] = df[col].clip(0, 30)

    # Tipos: todo a int/float apropiado
    for col in BINARY_FEATURES + ORDINAL_FEATURES:
        df[col] = df[col].astype(int)
    df[TARGET] = df[TARGET].astype(int)

    meta = {
        "rows_raw": n_before,
        "duplicates_removed": n_dupes,
        "rows_after_dedupe": len(df),
        "bmi_out_of_range_imputed": n_bmi_invalid,
        "positive_rate": float(df[TARGET].mean()),
    }
    return df, meta


def run_eda(df: pd.DataFrame):
    sns.set_theme(style="whitegrid")

    # Distribución de clases
    fig, ax = plt.subplots(figsize=(5, 4))
    df[TARGET].value_counts().sort_index().plot(kind="bar", ax=ax, color=["#2563eb", "#dc2626"])
    ax.set_xticklabels(["No diabetes (0)", "Prediabetes/Diabetes (1)"], rotation=0)
    ax.set_title("Distribución de clases — Módulo Lifestyle (BRFSS 2015)")
    ax.set_ylabel("Nº registros")
    fig.tight_layout()
    fig.savefig(FIGURES_DIR / "lifestyle_class_distribution.png", dpi=140)
    plt.close(fig)

    # Histograma / boxplot BMI
    fig, axes = plt.subplots(1, 2, figsize=(10, 4))
    sns.histplot(df["BMI"], bins=50, ax=axes[0], color="#2563eb")
    axes[0].set_title("Distribución de BMI")
    sns.boxplot(x=TARGET, y="BMI", data=df, ax=axes[1], palette=["#2563eb", "#dc2626"])
    axes[1].set_title("BMI vs Diabetes")
    fig.tight_layout()
    fig.savefig(FIGURES_DIR / "lifestyle_bmi_dist_boxplot.png", dpi=140)
    plt.close(fig)

    # Edad (bucket) vs diabetes
    fig, ax = plt.subplots(figsize=(7, 4))
    rate_by_age = df.groupby("Age")[TARGET].mean()
    rate_by_age.plot(kind="bar", ax=ax, color="#0891b2")
    ax.set_title("Tasa de diabetes por bucket de edad (Age 1=18-24 ... 13=80+)")
    ax.set_ylabel("Proporción positiva")
    fig.tight_layout()
    fig.savefig(FIGURES_DIR / "lifestyle_age_vs_diabetes.png", dpi=140)
    plt.close(fig)

    # Heatmap de correlación
    fig, ax = plt.subplots(figsize=(12, 10))
    corr = df[ALL_FEATURES + [TARGET]].corr()
    sns.heatmap(corr, cmap="coolwarm", center=0, ax=ax, annot=False)
    ax.set_title("Mapa de correlación — Módulo Lifestyle")
    fig.tight_layout()
    fig.savefig(FIGURES_DIR / "lifestyle_correlation_heatmap.png", dpi=140)
    plt.close(fig)

    # Outliers detectados vía IQR en BMI
    q1, q3 = df["BMI"].quantile([0.25, 0.75])
    iqr = q3 - q1
    lower, upper = q1 - 1.5 * iqr, q3 + 1.5 * iqr
    n_outliers = int(((df["BMI"] < lower) | (df["BMI"] > upper)).sum())

    return {"bmi_iqr_outliers": n_outliers, "bmi_iqr_bounds": [float(lower), float(upper)]}


def build_preprocessor() -> ColumnTransformer:
    # Binarias y ordinales ya son numéricas coherentes (0/1 o escalas 1..N) -> passthrough + scaler
    # BMI/MentHlth/PhysHlth -> escalado estándar (lo necesitan SVM/KNN/LogReg).
    numeric_pipeline = Pipeline([("scaler", StandardScaler())])
    ordinal_binary_pipeline = Pipeline([("scaler", StandardScaler())])

    preprocessor = ColumnTransformer(
        transformers=[
            ("num", numeric_pipeline, NUMERIC_FEATURES),
            ("ord_bin", ordinal_binary_pipeline, BINARY_FEATURES + ORDINAL_FEATURES),
        ],
        remainder="drop",
    )
    return preprocessor


def main():
    df, clean_meta = load_and_clean()
    eda_meta = run_eda(df)

    X = df[ALL_FEATURES]
    y = df[TARGET].values

    # Split estratificado 70/15/15
    X_train, X_temp, y_train, y_temp = train_test_split(
        X, y, test_size=0.30, stratify=y, random_state=RANDOM_STATE
    )
    X_val, X_test, y_val, y_test = train_test_split(
        X_temp, y_temp, test_size=0.50, stratify=y_temp, random_state=RANDOM_STATE
    )

    preprocessor = build_preprocessor()
    X_train_t = preprocessor.fit_transform(X_train)  # fit SOLO con train -> evita data leakage
    X_val_t = preprocessor.transform(X_val)
    X_test_t = preprocessor.transform(X_test)

    feature_names = NUMERIC_FEATURES + BINARY_FEATURES + ORDINAL_FEATURES

    np.savez_compressed(
        ARTIFACTS_DIR / f"{DATASET_NAME}_arrays.npz",
        X_train=X_train_t, y_train=y_train,
        X_val=X_val_t, y_val=y_val,
        X_test=X_test_t, y_test=y_test,
    )
    joblib.dump(preprocessor, ARTIFACTS_DIR / f"{DATASET_NAME}_preprocessor.joblib")

    schema = {
        "module": "lifestyle",
        "target": TARGET,
        "feature_order": feature_names,
        "numeric_features": NUMERIC_FEATURES,
        "binary_features": BINARY_FEATURES,
        "ordinal_features": ORDINAL_FEATURES,
        "ranges": {
            "BMI": {"min": 12, "max": 70, "type": "float", "help": "Índice de masa corporal"},
            "MentHlth": {"min": 0, "max": 30, "type": "int", "help": "Días de mala salud mental (últimos 30)"},
            "PhysHlth": {"min": 0, "max": 30, "type": "int", "help": "Días de mala salud física (últimos 30)"},
            "GenHlth": {"min": 1, "max": 5, "type": "int", "help": "Salud general autopercibida (1=excelente..5=mala)"},
            "Age": {"min": 1, "max": 13, "type": "int", "help": "Bucket de edad BRFSS (1=18-24 ... 13=80+)"},
            "Education": {"min": 1, "max": 6, "type": "int"},
            "Income": {"min": 1, "max": 8, "type": "int"},
            **{f: {"min": 0, "max": 1, "type": "int"} for f in BINARY_FEATURES},
        },
    }
    save_json(schema, ARTIFACTS_DIR / f"{DATASET_NAME}_feature_schema.json")

    report = {**clean_meta, **eda_meta, "n_train": len(y_train), "n_val": len(y_val), "n_test": len(y_test)}
    save_json(report, ARTIFACTS_DIR / f"{DATASET_NAME}_prep_report.json")
    print(json.dumps(report, indent=2))


if __name__ == "__main__":
    main()
