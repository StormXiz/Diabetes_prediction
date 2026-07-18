"use client";

import { Bar, BarChart, CartesianGrid, ResponsiveContainer, XAxis, YAxis } from "recharts";

// Valores SHAP reales del modelo de estilo de vida entrenado (XGBoost,
// TreeExplainer) — ver ml/reports/FASE1_RESULTADOS.md sec. 6. No son
// ilustrativos: es literalmente lo que el modelo desplegado usa.
const DATA = [
  { label: "Salud general", value: 0.5284 },
  { label: "IMC", value: 0.4015 },
  { label: "Edad", value: 0.3972 },
  { label: "Presión alta", value: 0.3647 },
  { label: "Colesterol alto", value: 0.2963 },
  { label: "Ingresos", value: 0.1254 },
  { label: "Sexo", value: 0.1129 },
  { label: "Revisión de colesterol", value: 0.0741 },
].reverse(); // recharts dibuja de abajo hacia arriba

export function FeatureImportanceChart() {
  return (
    <div className="h-80 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={DATA} layout="vertical" margin={{ left: 8, right: 24 }}>
          <CartesianGrid horizontal={false} stroke="currentColor" className="text-slate-100 dark:text-slate-800" />
          <XAxis type="number" hide />
          <YAxis
            type="category"
            dataKey="label"
            width={130}
            tickLine={false}
            axisLine={false}
            tick={{ fontSize: 12, fill: "currentColor" }}
            className="text-slate-600 dark:text-slate-400"
          />
          <Bar dataKey="value" fill="#059669" radius={[0, 6, 6, 0]} barSize={16} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
