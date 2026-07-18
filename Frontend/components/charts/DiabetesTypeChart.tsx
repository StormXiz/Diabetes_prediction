"use client";

import { Cell, Pie, PieChart, ResponsiveContainer } from "recharts";

// Reparto aproximado y ampliamente citado entre tipos de diabetes a nivel
// global (no específico a ningún país). Se muestra como referencia
// educativa, no como estadística exacta.
const DATA = [
  { name: "Tipo 2", value: 90, color: "#059669" },
  { name: "Tipo 1", value: 8, color: "#2563eb" },
  { name: "Gestacional", value: 2, color: "#d97706" },
];

export function DiabetesTypeChart() {
  return (
    <div className="relative h-56 w-56">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie data={DATA} dataKey="value" nameKey="name" innerRadius={55} outerRadius={80} paddingAngle={3}>
            {DATA.map((d) => (
              <Cell key={d.name} fill={d.color} stroke="none" />
            ))}
          </Pie>
        </PieChart>
      </ResponsiveContainer>
      <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-3xl font-extrabold text-slate-900 dark:text-slate-50">90%</span>
        <span className="text-xs text-slate-500 dark:text-slate-400">Tipo 2</span>
      </div>
    </div>
  );
}
