"""
Ingeniería de features del módulo LIFESTYLE.

Va DENTRO del preprocesador serializado (como primer paso de un Pipeline), no
en un script suelto: así la API sigue recibiendo los mismos 21 campos crudos
del formulario y el cálculo de features derivadas ocurre igual en
entrenamiento y en producción — imposible que se desincronicen.

Por qué estas features y no otras: XGBoost aprende cortes por variable, pero
le cuesta descubrir solo (a) no-linealidades fuertes como los saltos de riesgo
por categoría de IMC, y (b) interacciones/conteos entre variables (el riesgo
metabólico real no es "presión alta O colesterol alto", es cuántos de esos
componentes se acumulan a la vez). Dárselas explícitas es la palanca más
grande en datos tabulares — más que seguir subiendo n_estimators.
"""
from __future__ import annotations

import pandas as pd

RAW_FEATURES = [
    "BMI", "MentHlth", "PhysHlth",
    "HighBP", "HighChol", "CholCheck", "Smoker", "Stroke",
    "HeartDiseaseorAttack", "PhysActivity", "Fruits", "Veggies",
    "HvyAlcoholConsump", "AnyHealthcare", "NoDocbcCost", "DiffWalk", "Sex",
    "GenHlth", "Age", "Education", "Income",
]

ENGINEERED_FEATURES = [
    "BMI_cat",
    "obese",
    "metabolic_burden",
    "cardio_history",
    "healthy_habits",
    "poor_health_days",
    "functional_limitation",
    "ses_index",
    "healthcare_access",
    "age_x_bmi",
    "genhlth_x_diffwalk",
    "risk_factor_count",
]

MODEL_FEATURES = RAW_FEATURES + ENGINEERED_FEATURES


def _bmi_category(bmi: pd.Series) -> pd.Series:
    """Categoría ordinal de IMC (OMS). El riesgo de diabetes no sube lineal con
    el IMC: salta en los cortes clínicos (25, 30, 35, 40), y darle el escalón
    explícito le ahorra al árbol tener que aproximarlo con muchos cortes."""
    return pd.cut(
        bmi,
        bins=[0, 18.5, 25, 30, 35, 40, 1000],
        labels=[0, 1, 2, 3, 4, 5],
        right=False,
    ).astype(float)


def engineer_features(X: pd.DataFrame) -> pd.DataFrame:
    """Recibe el DataFrame con las 21 columnas crudas y devuelve esas mismas
    columnas + las derivadas. No muta la entrada."""
    df = X.copy()

    df["BMI_cat"] = _bmi_category(df["BMI"])
    df["obese"] = (df["BMI"] >= 30).astype(int)

    # Componentes del síndrome metabólico presentes a la vez. Lo que predice
    # diabetes no es cada uno por separado sino cuántos se acumulan.
    df["metabolic_burden"] = df["HighBP"] + df["HighChol"] + df["obese"]

    df["cardio_history"] = df["Stroke"] + df["HeartDiseaseorAttack"]

    # Hábitos protectores menos hábitos de riesgo, en un solo eje.
    df["healthy_habits"] = (
        df["PhysActivity"] + df["Fruits"] + df["Veggies"]
        - df["Smoker"] - df["HvyAlcoholConsump"]
    )

    df["poor_health_days"] = df["MentHlth"] + df["PhysHlth"]

    # Limitación funcional: dificultad para caminar junto con salud general
    # mala (GenHlth 4-5) es una señal bastante más fuerte que cualquiera sola.
    df["functional_limitation"] = df["DiffWalk"] + (df["GenHlth"] >= 4).astype(int)

    # Nivel socioeconómico como proxy de acceso (ver GUIA_PARA_EL_EQUIPO.md:
    # correlación real documentada en salud pública, no juicio de la app).
    df["ses_index"] = df["Income"] + df["Education"]
    df["healthcare_access"] = df["AnyHealthcare"] - df["NoDocbcCost"]

    # Interacciones: el riesgo del IMC alto se agrava con la edad, y la mala
    # salud percibida pesa distinto si además hay limitación de movilidad.
    df["age_x_bmi"] = df["Age"] * df["BMI_cat"]
    df["genhlth_x_diffwalk"] = df["GenHlth"] * df["DiffWalk"]

    # Conteo global de factores de riesgo clásicos de diabetes tipo 2.
    df["risk_factor_count"] = (
        df["HighBP"] + df["HighChol"] + df["obese"]
        + (df["Age"] >= 9).astype(int)      # bucket 9 = 60-64 años en adelante
        + df["DiffWalk"]
        + (df["GenHlth"] >= 4).astype(int)
        + df["Smoker"]
    )

    return df[MODEL_FEATURES]
