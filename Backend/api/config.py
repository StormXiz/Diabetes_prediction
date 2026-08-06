"""Configuración de la API vía variables de entorno (.env en desarrollo,
variables de entorno del servicio en Render/Railway en producción).

Nada de secretos hardcodeados [PLAN_MAESTRO sec 12]: todo se lee de env vars.
"""
from __future__ import annotations

import os
from pathlib import Path

from dotenv import load_dotenv

load_dotenv()  # no-op en producción si no hay .env; en local carga Backend/.env

BASE_DIR = Path(__file__).resolve().parent
MODELS_DIR = BASE_DIR / "models"

# --- CORS ---
# Dominio(s) del frontend permitido(s), separados por coma. En dev, localhost.
FRONTEND_ORIGINS = [
    o.strip() for o in os.getenv("FRONTEND_ORIGINS", "http://localhost:3000").split(",") if o.strip()
]

# --- Umbral de bandas de riesgo ---
# [Supuesto] No especificado en el plan cómo mapear la probabilidad continua a
# bajo/moderado/alto. Se define relativo al `deployed_threshold` de cada modelo
# (el mismo umbral usado para la métrica de Recall priorizada en Fase 1):
#   proba < threshold/2            -> "low"
#   threshold/2 <= proba < threshold -> "moderate"
#   proba >= threshold             -> "high"
# Angel puede ajustar esta regla sin reentrenar el modelo (vive solo en la API).
