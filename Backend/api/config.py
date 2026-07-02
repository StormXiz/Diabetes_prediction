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

# --- Supabase ---
SUPABASE_URL = os.getenv("SUPABASE_URL", "https://swgqlrbztvqikkyitqtx.supabase.co")
SUPABASE_ANON_KEY = os.getenv("SUPABASE_ANON_KEY", "")
# Secreto compartido para verificar JWT localmente (HS256). Se obtiene en
# Supabase Dashboard -> Settings -> API -> JWT Settings -> "JWT Secret".
# NUNCA se hardcodea ni se commitea; si no está presente, la API cae a
# verificación remota contra /auth/v1/user (más lenta, pero sin necesitar el secreto).
SUPABASE_JWT_SECRET = os.getenv("SUPABASE_JWT_SECRET", "")

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
