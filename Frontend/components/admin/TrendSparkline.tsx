"use client";

import { useEffect, useState } from "react";
import { useReducedMotion } from "motion/react";

/**
 * Sparkline de predicciones de los últimos 14 días. La línea "se dibuja" al
 * aparecer usando `pathLength` normalizado (sin medir el path con JS), igual
 * de espíritu que el stroke-dashoffset del Gauge de /result/[id].
 */
export function TrendSparkline({ data }: { data: { date: string; count: number }[] }) {
  const shouldReduceMotion = useReducedMotion();
  const [drawn, setDrawn] = useState(false);

  useEffect(() => {
    const id = requestAnimationFrame(() => setDrawn(true));
    return () => cancelAnimationFrame(id);
  }, []);

  if (data.length === 0) {
    return <p className="text-sm text-slate-400">Sin actividad registrada en estos 14 días.</p>;
  }

  const w = 280;
  const h = 64;
  const pad = 4;
  const max = Math.max(1, ...data.map((d) => d.count));

  const points = data.map((d, i) => {
    const x = data.length > 1 ? (i / (data.length - 1)) * w : w / 2;
    const y = h - pad - (d.count / max) * (h - pad * 2);
    return { x, y };
  });

  const linePath = `M${points.map((p) => `${p.x},${p.y}`).join(" L")}`;
  const areaPath = `${linePath} L${w},${h} L0,${h} Z`;
  const total = data.reduce((sum, d) => sum + d.count, 0);
  const peak = data.reduce((best, d) => (d.count > best.count ? d : best), data[0]);

  return (
    <div>
      <svg viewBox={`0 0 ${w} ${h}`} className="h-16 w-full" preserveAspectRatio="none" aria-hidden>
        <path d={areaPath} fill="#2563eb" opacity="0.06" />
        <path
          d={linePath}
          fill="none"
          stroke="#2563eb"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          pathLength={1}
          strokeDasharray={1}
          strokeDashoffset={shouldReduceMotion || drawn ? 0 : 1}
          style={{
            transition: shouldReduceMotion ? "none" : "stroke-dashoffset 1s cubic-bezier(0.16,1,0.3,1)",
          }}
        />
      </svg>
      <div className="mt-2 flex items-center justify-between text-xs text-slate-400">
        <span>{total} predicciones en 14 días</span>
        <span>
          Pico: {peak.count} el {formatDate(peak.date)}
        </span>
      </div>
    </div>
  );
}

function formatDate(iso: string) {
  const d = new Date(`${iso}T00:00:00`);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("es", { day: "numeric", month: "short" });
}
