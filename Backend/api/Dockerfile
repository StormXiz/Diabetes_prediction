# Imagen de la API (FastAPI). Build context: Backend/api/
# docker build -f Backend/api/Dockerfile -t diabetes-risk-api Backend/api

FROM python:3.11-slim

WORKDIR /app

# libgomp1: XGBoost/scikit-learn lo necesitan en tiempo de ejecución (OpenMP).
RUN apt-get update \
    && apt-get install -y --no-install-recommends libgomp1 \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

EXPOSE 8000

# Sin --reload: eso es solo para desarrollo local. Forma shell (no exec) a
# propósito: así SÍ se expande $PORT si el entorno lo define (ej. Railway);
# localmente/Docker Compose, donde no hay $PORT, cae al 8000 de siempre.
CMD uvicorn main:app --host 0.0.0.0 --port ${PORT:-8000}
