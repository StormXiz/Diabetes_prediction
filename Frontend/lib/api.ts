// Cliente ligero para hablar con la API FastAPI. Sin login: los endpoints
// /predict/* son públicos, no se manda ningún token de sesión.
const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

export type TopFactor = {
  feature: string;
  impact: number;
  direction: "increases_risk" | "decreases_risk";
};

export type PredictionResult = {
  module: "lifestyle" | "clinical";
  risk_score: number;
  risk_category: "low" | "moderate" | "high";
  threshold_used: number;
  top_factors: TopFactor[];
  disclaimer: string;
};

export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

async function postPrediction(path: string, payload: Record<string, unknown>): Promise<PredictionResult> {
  let res: Response;
  try {
    res = await fetch(`${API_URL}${path}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
  } catch {
    // fetch lanza esto cuando no hay servidor escuchando (backend caído/no
    // levantado), a diferencia de un 4xx/5xx real que sí llega a `res.ok`.
    throw new ApiError("No se pudo conectar con el servidor de predicción. Intenta de nuevo en un momento.", 0);
  }

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    const detail = Array.isArray(body?.detail)
      ? body.detail.map((d: { msg?: string }) => d.msg).join(", ")
      : body?.detail ?? "No se pudo calcular la predicción.";
    throw new ApiError(detail, res.status);
  }

  return res.json();
}

export function predictLifestyle(payload: Record<string, unknown>) {
  return postPrediction("/predict/lifestyle", payload);
}

export function predictClinical(payload: Record<string, unknown>) {
  return postPrediction("/predict/clinical", payload);
}
