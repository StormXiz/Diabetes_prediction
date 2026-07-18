import type { Json } from "./supabase/database.types";

export type DashboardStats = {
  total_users: number;
  total_predictions: number;
  predictions_by_module: { lifestyle?: number; clinical?: number };
  risk_distribution: { low?: number; moderate?: number; high?: number };
  predictions_last_14_days: { date: string; count: number }[];
  diets_total: number;
  diets_published: number;
  foods_total: number;
};

// El RPC devuelve `Json` (tipo genérico de Postgres) — esto valida la forma
// mínima en vez de confiar ciegamente en un `as DashboardStats`.
export function parseDashboardStats(data: Json): DashboardStats {
  const d = (typeof data === "object" && data !== null && !Array.isArray(data) ? data : {}) as Record<
    string,
    Json | undefined
  >;

  const num = (v: Json | undefined) => (typeof v === "number" ? v : 0);
  const record = (v: Json | undefined) =>
    (typeof v === "object" && v !== null && !Array.isArray(v) ? (v as Record<string, number>) : {});

  const trend = Array.isArray(d.predictions_last_14_days)
    ? d.predictions_last_14_days
        .map((row) => {
          const r = row as Record<string, Json>;
          return { date: String(r.date ?? ""), count: num(r.count as Json) };
        })
        .filter((row) => row.date)
    : [];

  return {
    total_users: num(d.total_users),
    total_predictions: num(d.total_predictions),
    predictions_by_module: record(d.predictions_by_module),
    risk_distribution: record(d.risk_distribution),
    predictions_last_14_days: trend,
    diets_total: num(d.diets_total),
    diets_published: num(d.diets_published),
    foods_total: num(d.foods_total),
  };
}
