// Cliente ligero para hablar con la API FastAPI [PLAN_MAESTRO sec 7].
// Adjunta el access_token de la sesión de Supabase como Bearer token — la API
// lo valida de verdad (ver Backend/api/auth.py), no es solo un adorno.
import { createClient } from "@/lib/supabase/client";

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

async function authHeader(): Promise<Record<string, string>> {
  const supabase = createClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) {
    throw new ApiError("No hay sesión activa. Inicia sesión de nuevo.", 401);
  }
  return { Authorization: `Bearer ${session.access_token}` };
}

async function postPrediction(path: string, payload: Record<string, unknown>): Promise<PredictionResult> {
  const headers = await authHeader();

  let res: Response;
  try {
    res = await fetch(`${API_URL}${path}`, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...headers },
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
