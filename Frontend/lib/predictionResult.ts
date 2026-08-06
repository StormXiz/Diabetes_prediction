// Puente entre el formulario de predicción y /result sin base de datos —
// desde que se quitó el login ya no hay user_id para guardar en la tabla
// `predictions`, así que el resultado viaja en sessionStorage (dura solo esa
// pestaña/sesión del navegador, que es justo lo que se necesita para pasar
// de un formulario a la página de resultado).
import type { PredictionResult } from "@/lib/api";

const KEY = "last_prediction_result";

export function saveLastPredictionResult(result: PredictionResult) {
  sessionStorage.setItem(KEY, JSON.stringify(result));
}

export function readLastPredictionResult(): PredictionResult | null {
  const raw = sessionStorage.getItem(KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as PredictionResult;
  } catch {
    return null;
  }
}
