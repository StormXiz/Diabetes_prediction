// Genera el PDF resumen — estética editorial: una sola paleta (tinta +
// acento esmeralda + el color del riesgo solo donde corresponde), tablas
// sin rejilla (regla superior/inferior, sin relleno de color) pero con
// divisores visibles entre secciones/grupos para que la jerarquía se lea
// de un vistazo — nada de espacio en blanco "porque sí": cada página trae
// contenido real hasta el final (roadmap, próximos pasos, tip del día).
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import type { PredictionResult, TopFactor } from "@/lib/api";
import type { WeekPlan } from "@/lib/dietEngine";
import { displayFoodName } from "@/lib/foodDisplay";
import { RISK_META, type RiskCategory } from "@/lib/risk";

type RGB = [number, number, number];

const INK: RGB = [15, 23, 42]; // slate-900
const MUTED: RGB = [100, 116, 139]; // slate-500
const FAINT: RGB = [148, 163, 184]; // slate-400
const HAIRLINE: RGB = [226, 232, 240]; // slate-200
const DIVIDER: RGB = [203, 213, 225]; // slate-300 — más visible que el hairline de fila
const ACCENT: RGB = [5, 150, 105]; // emerald-600
const ACCENT_TINT: RGB = [236, 253, 245]; // emerald-50
const RED: RGB = [190, 40, 40];

const FEATURE_ES: Record<string, string> = {
  GenHlth: "Salud general percibida", BMI: "IMC", Age: "Edad", HighBP: "Presión arterial alta",
  HighChol: "Colesterol alto", HbA1c_level: "HbA1c", blood_glucose_level: "Glucosa en sangre",
  bmi: "IMC", age: "Edad", hypertension: "Hipertensión", heart_disease: "Enfermedad cardíaca",
  smoking_history_unknown: "Historial de tabaquismo desconocido", CholCheck: "Revisión de colesterol",
  Income: "Ingresos", Sex: "Sexo", Education: "Nivel educativo",
  MentHlth: "Días de mala salud mental", PhysHlth: "Días de mala salud física",
  Smoker: "Fumador", Stroke: "ACV previo", HeartDiseaseorAttack: "Enfermedad cardíaca",
  PhysActivity: "Actividad física", Fruits: "Consumo de fruta", Veggies: "Consumo de vegetales",
  HvyAlcoholConsump: "Consumo alto de alcohol", AnyHealthcare: "Cobertura de salud",
  NoDocbcCost: "No fue al médico por costo", DiffWalk: "Dificultad para caminar",
  // Variables derivadas del modelo v2 (ver ml/src/features_lifestyle.py)
  BMI_cat: "Categoría de IMC", obese: "Obesidad",
  metabolic_burden: "Carga metabólica", cardio_history: "Antecedentes cardiovasculares",
  healthy_habits: "Balance de hábitos saludables", poor_health_days: "Días de mala salud al mes",
  functional_limitation: "Limitación funcional", ses_index: "Nivel socioeconómico",
  healthcare_access: "Acceso a atención médica", age_x_bmi: "Edad combinada con IMC",
  genhlth_x_diffwalk: "Salud general con dificultad para caminar",
  risk_factor_count: "Factores de riesgo acumulados",
};

function humanizeFeature(name: string): string {
  return FEATURE_ES[name] ?? name;
}

function hexToRgb(hex: string): RGB {
  const n = parseInt(hex.replace("#", ""), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

const NEXT_STEPS: Record<RiskCategory, string[]> = {
  low: [
    "Mantén lo que ya funciona — no hay que corregir nada urgente, solo sostenerlo.",
    "Repite esta estimación cada cierto tiempo para confirmar que tu riesgo se mantiene bajo.",
    "Usa el catálogo de dietas de la app si quieres variar tu menú sin perder el enfoque.",
  ],
  moderate: [
    "Elige uno o dos cambios concretos esta semana (ej. pan integral en vez de blanco, una porción más de vegetales al almuerzo).",
    "Prioriza subir la fibra y bajar el sodio y las grasas saturadas — es lo que más pesa a este nivel.",
    "Vuelve a estimar tu riesgo en unas semanas para ver si esos cambios se reflejan.",
  ],
  high: [
    "Agenda una consulta con un médico o nutricionista — esta guía acompaña, no reemplaza ese seguimiento.",
    "Lleva este documento a tu cita: resume tu resultado, tus factores y tu plan de alimentación.",
    "Empieza por el plan de comidas de esta semana; los ajustes grandes se sostienen mejor paso a paso.",
  ],
};

const DAILY_TIPS = [
  "Combina siempre un carbohidrato con una proteína o grasa saludable — la glucosa sube más despacio.",
  "Caminar 10-15 minutos después de tu comida más fuerte ayuda a bajar el pico de glucosa.",
  "Prefiere la fruta entera sobre el jugo: la fibra de la pulpa frena la absorción del azúcar.",
  "\"Sin azúcar añadida\" no es lo mismo que \"bajo en carbohidratos\" — revisa la etiqueta completa.",
  "Comer en horarios regulares evita los picos de hambre que suelen llevar a comer de más.",
  "El agua sigue siendo la mejor opción para hidratarte; las bebidas azucaradas suben la glucosa rápido.",
  "Dormir poco afecta cómo tu cuerpo regula el azúcar en sangre al día siguiente.",
];

const MARGIN = 20;
const PAGE_WIDTH = 210;
const PAGE_HEIGHT = 297;
const CONTENT_WIDTH = PAGE_WIDTH - MARGIN * 2;
const CONTENT_BOTTOM = PAGE_HEIGHT - 24;

function eyebrow(doc: jsPDF, text: string, x: number, y: number, color: RGB = MUTED, align: "left" | "right" = "left") {
  doc.setFont("helvetica", "bold");
  doc.setFontSize(7.8);
  doc.setTextColor(...color);
  doc.setCharSpace(0.5);
  doc.text(text.toUpperCase(), x, y, { align });
  doc.setCharSpace(0);
}

function divider(doc: jsPDF, y: number) {
  doc.setDrawColor(...DIVIDER);
  doc.setLineWidth(0.25);
  doc.line(MARGIN, y, PAGE_WIDTH - MARGIN, y);
}

function drawHeader(doc: jsPDF, subtitle: string) {
  doc.setFillColor(...ACCENT);
  doc.rect(0, 0, PAGE_WIDTH, 1.4, "F");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  doc.setTextColor(...INK);
  doc.text("Diabetes", MARGIN, 15);
  const w = doc.getTextWidth("Diabetes");
  doc.setTextColor(...ACCENT);
  doc.text("Risk", MARGIN + w, 15);

  eyebrow(doc, subtitle, PAGE_WIDTH - MARGIN, 15, FAINT, "right");

  doc.setDrawColor(...HAIRLINE);
  doc.setLineWidth(0.2);
  doc.line(MARGIN, 20, PAGE_WIDTH - MARGIN, 20);
}

function drawFooter(doc: jsPDF, pageLabel: string) {
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  doc.setTextColor(...FAINT);
  doc.text(pageLabel, MARGIN, PAGE_HEIGHT - 12);
  doc.text("diabetesrisk.shop", PAGE_WIDTH - MARGIN, PAGE_HEIGHT - 12, { align: "right" });
}

function wrapText(doc: jsPDF, text: string, maxWidth: number): string[] {
  return doc.splitTextToSize(text, maxWidth);
}

function drawRiskBar(doc: jsPDF, x: number, y: number, width: number, percent: number, color: RGB) {
  const height = 3.5;
  doc.setFillColor(...HAIRLINE);
  doc.roundedRect(x, y, width, height, height / 2, height / 2, "F");
  const fillWidth = Math.max(height, (Math.min(100, Math.max(0, percent)) / 100) * width);
  doc.setFillColor(...color);
  doc.roundedRect(x, y, fillWidth, height, height / 2, height / 2, "F");

  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  doc.setTextColor(...FAINT);
  doc.text("0", x, y + 7);
  doc.text("50", x + width / 2, y + 7, { align: "center" });
  doc.text("100", x + width, y + 7, { align: "right" });
}

/** Callout con filete lateral de color — la misma idea que el disclaimer, reutilizada para tips/next-steps. */
function drawCallout(doc: jsPDF, y: number, title: string, lines: string[], color: RGB = ACCENT): number {
  const wrapped = lines.flatMap((l) => wrapText(doc, `•  ${l}`, CONTENT_WIDTH - 10));
  const height = 6 + wrapped.length * 5.2 + 4;
  doc.setFillColor(...color);
  doc.rect(MARGIN, y, 0.8, height, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8.5);
  doc.setTextColor(...color);
  doc.text(title.toUpperCase(), MARGIN + 6, y + 5);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(...INK);
  doc.text(wrapped, MARGIN + 6, y + 10.5, { lineHeightFactor: 1.5 });
  return y + height;
}

const minimalHead = {
  fillColor: false as const,
  textColor: MUTED,
  fontStyle: "bold" as const,
  fontSize: 8.5,
  lineWidth: { bottom: 0.5, top: 0, left: 0, right: 0 },
  lineColor: INK,
  cellPadding: { top: 2, bottom: 3.5, left: 3, right: 3 },
};
const minimalBody = {
  fillColor: false as const,
  textColor: INK,
  fontSize: 10,
  lineWidth: { bottom: 0.15, top: 0, left: 0, right: 0 },
  lineColor: HAIRLINE,
  cellPadding: { top: 4.5, bottom: 4.5, left: 3, right: 3 },
};

export function generateDietPlanPdf(opts: {
  prediction: PredictionResult | null;
  plan: WeekPlan | null;
  dietTitle: string;
  riskCategory: RiskCategory;
}) {
  const { prediction, plan, dietTitle, riskCategory } = opts;
  const meta = RISK_META[riskCategory];
  const riskColor = hexToRgb(meta.color);
  const doc = new jsPDF({ unit: "mm", format: "a4" });

  // ---------- Página 1: qué es la diabetes + disclaimer + hoja de ruta ----------
  drawHeader(doc, "Orientación · no es un diagnóstico");
  let y = 36;

  eyebrow(doc, "Tu resumen", MARGIN, y, ACCENT);
  y += 7;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(22);
  doc.setTextColor(...INK);
  doc.text("Orientación sobre tu riesgo", MARGIN, y);
  y += 12;
  divider(doc, y);
  y += 10;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(12.5);
  doc.setTextColor(...INK);
  doc.text("¿Qué es la diabetes tipo 2?", MARGIN, y);
  y += 7;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(...MUTED);
  const intro = wrapText(
    doc,
    "El cuerpo usa una hormona llamada insulina para que la glucosa (el azúcar de la sangre) entre a las células y se use como energía. En la diabetes tipo 2, el cuerpo deja de responder bien a la insulina —o no produce suficiente— y la glucosa se acumula en la sangre en vez de entrar a las células. Es una condición manejable: la alimentación, la actividad física y, cuando corresponde, el tratamiento médico marcan una diferencia real.",
    CONTENT_WIDTH,
  );
  doc.text(intro, MARGIN, y, { lineHeightFactor: 1.55 });
  y += intro.length * 5.4 + 10;
  divider(doc, y);
  y += 10;

  const discText = wrapText(
    doc,
    "DiabetesRisk es una herramienta de orientación basada en Machine Learning, no un diagnóstico médico. La estimación de riesgo y el plan de alimentación de este documento no reemplazan la consulta con un profesional de salud. Si tienes síntomas, antecedentes familiares de diabetes, o dudas sobre tu salud, consulta a un médico o nutricionista.",
    CONTENT_WIDTH - 10,
  );
  doc.setFillColor(...ACCENT);
  doc.rect(MARGIN, y, 0.8, discText.length * 5.4 + 8, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8.5);
  doc.setTextColor(...ACCENT);
  doc.text("ANTES DE CONTINUAR", MARGIN + 6, y + 5);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9.5);
  doc.setTextColor(...INK);
  doc.text(discText, MARGIN + 6, y + 10.5, { lineHeightFactor: 1.55 });
  y += discText.length * 5.4 + 16;
  divider(doc, y);
  y += 10;

  eyebrow(doc, "Guía general", MARGIN, y, MUTED);
  y += 6;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12.5);
  doc.setTextColor(...INK);
  doc.text("El método del plato", MARGIN, y);
  y += 10;

  const plateCols = [
    { label: "Vegetales", pct: "50%" },
    { label: "Carbohidratos", pct: "25%" },
    { label: "Proteína", pct: "25%" },
  ];
  const colW = CONTENT_WIDTH / 3;
  plateCols.forEach((c, i) => {
    const cx = MARGIN + i * colW;
    if (i > 0) {
      doc.setDrawColor(...HAIRLINE);
      doc.setLineWidth(0.2);
      doc.line(cx, y - 2, cx, y + 17);
    }
    doc.setFont("helvetica", "bold");
    doc.setFontSize(21);
    doc.setTextColor(...INK);
    doc.text(c.pct, cx + colW / 2 - 4, y + 9, { align: "center" });
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(...MUTED);
    doc.text(c.label, cx + colW / 2 - 4, y + 16, { align: "center" });
  });
  y += 26;
  divider(doc, y);
  y += 12;

  // Hoja de ruta del documento — para que se entienda de un vistazo qué sigue.
  eyebrow(doc, "En este documento", MARGIN, y, MUTED);
  y += 8;
  const roadmap = [
    { n: "01", title: "Tu resultado", desc: "El porcentaje, la categoría de riesgo y los factores que más influyeron." },
    { n: "02", title: "Resumen semanal", desc: "Calorías, proteína, carbohidratos, grasa y fibra de cada día, de un vistazo." },
    { n: "03", title: "Plan día por día", desc: "Las comidas de lunes a domingo con alimentos, gramos y calorías reales." },
  ];
  for (const item of roadmap) {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(13);
    doc.setTextColor(...ACCENT);
    doc.text(item.n, MARGIN, y + 5);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10.5);
    doc.setTextColor(...INK);
    doc.text(item.title, MARGIN + 14, y + 3.5);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(...MUTED);
    const descLines = wrapText(doc, item.desc, CONTENT_WIDTH - 14);
    doc.text(descLines, MARGIN + 14, y + 8.5);
    y += 8.5 + descLines.length * 4.6 + 4;
  }

  drawFooter(doc, "01 · Qué es la diabetes");

  // ---------- Página 2: resultado, por qué, y próximos pasos ----------
  doc.addPage();
  drawHeader(doc, "Tu estimación de riesgo");
  y = 36;

  const percent = prediction ? Math.round(prediction.risk_score * 100) : null;

  eyebrow(doc, meta.label, MARGIN, y, riskColor);
  y += 12;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(46);
  doc.setTextColor(...INK);
  doc.text(percent !== null ? `${percent}%` : "—", MARGIN, y);
  y += 10;

  if (percent !== null) {
    drawRiskBar(doc, MARGIN, y, CONTENT_WIDTH, percent, riskColor);
    y += 14;
  }

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9.5);
  doc.setTextColor(...MUTED);
  const scoreNote = wrapText(
    doc,
    "Es una probabilidad estadística de un modelo de Machine Learning entrenado (XGBoost) — no un cálculo con reglas fijas. Por eso no se mueve en proporción directa a un solo factor.",
    CONTENT_WIDTH,
  );
  doc.text(scoreNote, MARGIN, y, { lineHeightFactor: 1.55 });
  y += scoreNote.length * 5 + 10;
  divider(doc, y);
  y += 10;

  const topFactors = (prediction?.top_factors ?? []) as TopFactor[];
  if (topFactors.length > 0) {
    eyebrow(doc, "Por qué", MARGIN, y, ACCENT);
    y += 6;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(13);
    doc.setTextColor(...INK);
    doc.text("Factores que más influyen", MARGIN, y);
    y += 4;

    autoTable(doc, {
      startY: y,
      margin: { left: MARGIN, right: MARGIN },
      head: [["Factor", "Efecto sobre tu riesgo"]],
      body: topFactors.map((f) => [
        humanizeFeature(f.feature),
        f.direction === "increases_risk" ? "Aumenta el riesgo" : "Reduce el riesgo",
      ]),
      theme: "plain",
      styles: minimalBody,
      headStyles: minimalHead,
      columnStyles: { 1: { halign: "right", fontStyle: "bold" } },
      didParseCell: (data) => {
        if (data.section === "body" && data.column.index === 1) {
          const up = topFactors[data.row.index]?.direction === "increases_risk";
          data.cell.styles.textColor = up ? RED : ACCENT;
        }
      },
    });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    y = (doc as any).lastAutoTable.finalY + 12;
  }
  divider(doc, y);
  y += 10;

  eyebrow(doc, "Qué puedes hacer", MARGIN, y, ACCENT);
  y += 6;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  doc.setTextColor(...INK);
  doc.text("Tus próximos pasos", MARGIN, y);
  y += 8;

  for (const step of NEXT_STEPS[riskCategory]) {
    const lines = wrapText(doc, step, CONTENT_WIDTH - 8);
    doc.setFillColor(...ACCENT);
    doc.circle(MARGIN + 1, y - 1.3, 0.9, "F");
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9.5);
    doc.setTextColor(...INK);
    doc.text(lines, MARGIN + 6, y, { lineHeightFactor: 1.5 });
    y += lines.length * 5.2 + 6;
  }

  drawFooter(doc, "02 · Tu resultado");

  // ---------- Página 3: resumen semanal ----------
  if (plan) {
    doc.addPage();
    drawHeader(doc, `${dietTitle}`);
    y = 36;

    eyebrow(doc, "Tu plan", MARGIN, y, ACCENT);
    y += 7;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(20);
    doc.setTextColor(...INK);
    doc.text("Resumen semanal", MARGIN, y);
    y += 6;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9.5);
    doc.setTextColor(...MUTED);
    doc.text(`Objetivo diario: ${Math.round(plan.targetCalories)} kcal de mantenimiento`, MARGIN, y);
    y += 10;
    divider(doc, y);
    y += 10;

    autoTable(doc, {
      startY: y,
      margin: { left: MARGIN, right: MARGIN },
      head: [["Día", "Kcal", "% objetivo", "Proteína", "Carbos", "Grasa", "Fibra"]],
      body: plan.days.map((d) => [
        d.day,
        `${Math.round(d.totalKcal)}`,
        `${Math.round((d.totalKcal / plan.targetCalories) * 100)}%`,
        `${d.macros.prot} g`,
        `${d.macros.carb} g`,
        `${d.macros.grasa} g`,
        `${d.macros.fibra} g`,
      ]),
      theme: "plain",
      styles: minimalBody,
      headStyles: minimalHead,
      columnStyles: {
        0: { fontStyle: "bold" },
        1: { halign: "right" },
        2: { halign: "right", fontStyle: "bold", textColor: ACCENT },
        3: { halign: "right" },
        4: { halign: "right" },
        5: { halign: "right" },
        6: { halign: "right" },
      },
    });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    y = (doc as any).lastAutoTable.finalY + 14;
    divider(doc, y);
    y += 12;

    // Promedios de la semana — contexto adicional que aprovecha el espacio
    // y ayuda a leer la tabla de arriba sin tener que promediar a mano.
    const n = plan.days.length;
    const avg = {
      kcal: Math.round(plan.days.reduce((s, d) => s + d.totalKcal, 0) / n),
      prot: Math.round(plan.days.reduce((s, d) => s + d.macros.prot, 0) / n),
      carb: Math.round(plan.days.reduce((s, d) => s + d.macros.carb, 0) / n),
      grasa: Math.round(plan.days.reduce((s, d) => s + d.macros.grasa, 0) / n),
      fibra: Math.round(plan.days.reduce((s, d) => s + d.macros.fibra, 0) / n),
    };
    eyebrow(doc, "Promedio de la semana", MARGIN, y, MUTED);
    y += 8;
    const avgPairs: [string, string][] = [
      ["Kcal/día", `${avg.kcal}`],
      ["Proteína", `${avg.prot} g`],
      ["Carbohidratos", `${avg.carb} g`],
      ["Grasa", `${avg.grasa} g`],
      ["Fibra", `${avg.fibra} g`],
    ];
    const avgColW = CONTENT_WIDTH / avgPairs.length;
    avgPairs.forEach(([label, value], i) => {
      const cx = MARGIN + i * avgColW;
      doc.setFont("helvetica", "bold");
      doc.setFontSize(15);
      doc.setTextColor(...INK);
      doc.text(value, cx, y + 6);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(7.5);
      doc.setTextColor(...FAINT);
      doc.text(label.toUpperCase(), cx, y + 11);
    });
    y += 20;
    divider(doc, y);
    y += 12;

    eyebrow(doc, "Recordatorio", MARGIN, y, ACCENT);
    y += 7;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9.5);
    doc.setTextColor(...MUTED);
    const noteLines = wrapText(
      doc,
      "Las porciones están calculadas para tus calorías de mantenimiento (fórmula Mifflin-St Jeor) a partir de tu peso, estatura, edad y nivel de actividad. Si cambian esos datos, regenera el plan desde la app para que las cantidades se ajusten.",
      CONTENT_WIDTH,
    );
    doc.text(noteLines, MARGIN, y, { lineHeightFactor: 1.55 });

    drawFooter(doc, "03 · Resumen semanal");

    // ---------- Páginas 4+: detalle día por día ----------
    plan.days.forEach((day, dayIdx) => {
      doc.addPage();
      drawHeader(doc, `${dietTitle}`);
      y = 36;

      eyebrow(doc, `Plan diario · día ${dayIdx + 1} de 7`, MARGIN, y, ACCENT);
      y += 8;
      doc.setFont("helvetica", "bold");
      doc.setFontSize(21);
      doc.setTextColor(...INK);
      doc.text(day.day, MARGIN, y);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(9.5);
      doc.setTextColor(...MUTED);
      doc.text(`${Math.round(day.totalKcal)} kcal · objetivo ${Math.round(plan.targetCalories)} kcal`, PAGE_WIDTH - MARGIN, y, { align: "right" });
      y += 9;
      divider(doc, y);
      y += 10;

      const macroPairs: [string, string][] = [
        ["Proteína", `${day.macros.prot} g`],
        ["Carbohidratos", `${day.macros.carb} g`],
        ["Grasa", `${day.macros.grasa} g`],
        ["Fibra", `${day.macros.fibra} g`],
      ];
      const macroColW = CONTENT_WIDTH / 4;
      macroPairs.forEach(([label, value], i) => {
        const cx = MARGIN + i * macroColW;
        doc.setFont("helvetica", "bold");
        doc.setFontSize(14);
        doc.setTextColor(...INK);
        doc.text(value, cx, y + 6);
        doc.setFont("helvetica", "normal");
        doc.setFontSize(7.5);
        doc.setTextColor(...FAINT);
        doc.text(label.toUpperCase(), cx, y + 11.5);
      });
      y += 18;
      divider(doc, y);
      y += 10;

      // Una sola tabla para todo el día: "Comida" agrupa sus alimentos con
      // rowSpan, y se marca con una línea más visible el cierre de cada
      // grupo — así el ojo separa comidas sin necesitar 5 tablas sueltas.
      const groupEndRows = new Set<number>();
      const body: (string | { content: string; rowSpan: number; styles: object })[][] = [];
      for (const meal of day.meals) {
        meal.items.forEach((it, idx) => {
          const row: (string | { content: string; rowSpan: number; styles: object })[] = [];
          if (idx === 0) {
            row.push({
              content: `${meal.name}\n${meal.totalKcal} kcal`,
              rowSpan: meal.items.length,
              styles: { fontStyle: "bold", textColor: ACCENT, valign: "middle" },
            });
          }
          row.push(displayFoodName(it.food.nombre), `${it.grams} g`, `${it.kcal}`);
          body.push(row);
        });
        groupEndRows.add(body.length - 1);
      }

      autoTable(doc, {
        startY: y,
        margin: { left: MARGIN, right: MARGIN },
        head: [["Comida", "Alimento", "Gramos", "Kcal"]],
        body,
        theme: "plain",
        styles: minimalBody,
        headStyles: minimalHead,
        columnStyles: {
          0: { cellWidth: 34 },
          2: { halign: "right" },
          3: { halign: "right" },
        },
        didParseCell: (data) => {
          if (data.section === "body" && groupEndRows.has(data.row.index)) {
            data.cell.styles.lineWidth = { ...(data.cell.styles.lineWidth as object), bottom: 0.5 };
            data.cell.styles.lineColor = DIVIDER;
          }
        },
      });
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      y = (doc as any).lastAutoTable.finalY + 10;

      // El tip solo entra si de verdad hay espacio real para su bloque
      // completo (filete + título + texto envuelto) antes del pie de página.
      if (CONTENT_BOTTOM - y > 20) {
        y = drawCallout(doc, y, "Tip del día", [DAILY_TIPS[dayIdx % DAILY_TIPS.length]], ACCENT);
      }

      drawFooter(doc, `Plan semanal · ${day.day}`);
    });
  }

  doc.save("diabetesrisk-resumen.pdf");
}
