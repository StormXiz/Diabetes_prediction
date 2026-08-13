import { DIET_PLANS, riskToLevel, type RiskLevel } from "@/lib/data/diet_guidance";
import { CURATED_FOODS, type FoodItem } from "@/lib/data/curatedFoods";
import { allTemplateItems, type TemplateItem } from "@/lib/data/mealTemplates";
import { displayFoodName } from "@/lib/foodDisplay";

// "Plan preventivo", "Plan de control glucémico moderado", etc. (plan.title)
// son nombres de marketing, no adjetivos de nivel de riesgo — usarlos dentro
// de frases tipo "riesgo ${plan.title}" da textos rotos como "riesgo plan
// preventivo". Para esas frases se necesita el nivel en sí (bajo/moderado/alto).
const LEVEL_LABEL: Record<RiskLevel, string> = { low: "bajo", moderate: "moderado", high: "alto" };

function toFoodItem(i: TemplateItem): FoodItem {
  return {
    nombre: i.nombre,
    categoria: i.categoria,
    kcal: i.kcal100,
    prot: i.prot100,
    carb: i.carb100,
    grasa: i.grasa100,
    fibra: i.fibra100,
    sodio: null,
    potasio: null,
    gsat: null,
    avoid: false,
  };
}

export type ChatMsg = { role: "bot" | "user"; text: string; foods?: FoodItem[] };

export type Suggestion = { label: string; intent: Intent };

type Intent =
  | "explain_result"
  | "what_eat"
  | "what_avoid"
  | "why_nutrients"
  | "sample_day"
  | "next_steps"
  | "free";

export type ChatContext = {
  level: RiskLevel;
  percent: number;
  topFactors: { feature: string; direction: string }[];
  // Restricciones activas (categorías de food_nutrition excluidas, ej. "Lácteos").
  // Si están presentes, el chat puede actualizarlas vía function calling y el
  // llamador (GuideChatbot) recibe el cambio para regenerar el plan semanal.
  restrictions?: string[];
};

const FEATURE_ES: Record<string, string> = {
  GenHlth: "tu salud general percibida",
  BMI: "tu índice de masa corporal (IMC)",
  bmi: "tu índice de masa corporal (IMC)",
  Age: "tu edad",
  age: "tu edad",
  HighBP: "tu presión arterial alta",
  hypertension: "tu presión arterial alta",
  HighChol: "tu colesterol alto",
  HbA1c_level: "tu nivel de HbA1c",
  blood_glucose_level: "tu glucosa en sangre",
  heart_disease: "el antecedente cardíaco",
  Income: "tu nivel de ingresos",
  Sex: "el sexo",
  CholCheck: "tu revisión de colesterol",
  smoking_history_unknown: "tu historial de tabaquismo",
  Education: "tu nivel educativo",
  MentHlth: "tus días de mala salud mental",
  PhysHlth: "tus días de mala salud física",
  Smoker: "si fumas",
  Stroke: "un ACV previo",
  HeartDiseaseorAttack: "un antecedente cardíaco",
  PhysActivity: "tu actividad física",
  Fruits: "tu consumo de fruta",
  Veggies: "tu consumo de vegetales",
  HvyAlcoholConsump: "tu consumo alto de alcohol",
  AnyHealthcare: "tu cobertura de salud",
  NoDocbcCost: "no ir al médico por el costo",
  DiffWalk: "tu dificultad para caminar",
  // Variables derivadas del modelo v2 (ver ml/src/features_lifestyle.py)
  BMI_cat: "tu categoría de IMC",
  obese: "tu nivel de obesidad",
  metabolic_burden: "tu carga metabólica (presión, colesterol y peso juntos)",
  cardio_history: "tus antecedentes cardiovasculares",
  healthy_habits: "el balance de tus hábitos saludables",
  poor_health_days: "tus días de mala salud al mes",
  functional_limitation: "tu limitación funcional",
  ses_index: "tu nivel socioeconómico",
  healthcare_access: "tu acceso a atención médica",
  age_x_bmi: "tu edad combinada con tu IMC",
  genhlth_x_diffwalk: "tu salud general junto con la dificultad para caminar",
  risk_factor_count: "la cantidad de factores de riesgo que se te acumulan",
};

// Detecta si el usuario está preguntando por alimentos para adjuntar las
// tarjetas (funciona igual con respuesta de IA o de reglas).
export function foodsForMessage(ctx: ChatContext, text: string): FoodItem[] {
  const t = text.toLowerCase();
  if (/evitar|azúcar|azucar|no comer|malo|prohib|limitar/.test(t)) return topFoodsFor(ctx.level, true, 4);
  if (/comer|aliment|dieta|fruta|vegetal|receta|menú|menu|recomend|qué como|que como/.test(t))
    return topFoodsFor(ctx.level, false, 4);
  return [];
}

// Construye el contexto de grounding (datos reales) que se le pasa al modelo
// de IA como system prompt, para que no invente y hable en base a la tabla de
// alimentos y la guía nutricional del proyecto.
export function buildGrounding(ctx: ChatContext): string {
  const plan = DIET_PLANS[ctx.level];
  const factors = ctx.topFactors
    .slice(0, 4)
    .map((f) => `${FEATURE_ES[f.feature] ?? f.feature} (${f.direction === "increases_risk" ? "sube el riesgo" : "lo baja"})`)
    .join(", ");

  const rec = topFoodsFor(ctx.level, false, 6)
    .map((f) => `${displayFoodName(f.nombre)}: ${f.kcal ?? "?"} kcal, ${f.fibra ?? 0} g fibra, ${f.prot ?? 0} g proteína`)
    .join("; ");
  const avoid = topFoodsFor(ctx.level, true, 4)
    .map((f) => `${displayFoodName(f.nombre)}: ${f.kcal ?? "?"} kcal`)
    .join("; ");

  const rules = plan.nutrientRules
    .map((r) => `${r.label} (${r.direction === "prefer" ? "buscar más" : "mantener bajo"}): ${r.why}`)
    .join(" | ");

  const restrictions = ctx.restrictions?.length
    ? `Restricciones activas del usuario (ya excluidas de su plan): ${ctx.restrictions.join(", ")}.`
    : "El usuario no tiene restricciones alimentarias registradas todavía.";

  return [
    `Nivel de riesgo del usuario: ${ctx.level} (${ctx.percent}% de riesgo relativo estimado).`,
    `Factores que más pesaron: ${factors || "varios combinados"}.`,
    `Plan recomendado: ${plan.title}. ${plan.summary}`,
    `Método del plato: ${plan.platePctVeggies}% vegetales, ${plan.plateCarbs}% carbohidratos enteros, ${plan.plateProtein}% proteína magra. Meta de fibra: ${plan.fiberTargetG} g/día.`,
    `Nutrientes clave: ${rules}`,
    `Alimentos recomendados (tabla Ecuador 2021, por 100 g): ${rec}.`,
    `Alimentos a moderar: ${avoid}.`,
    `Día de ejemplo: ${plan.sampleDay.map((d) => `${d.meal}: ${d.idea}`).join(" / ")}.`,
    restrictions,
  ].join("\n");
}

export const SYSTEM_PROMPT = [
  "Eres el asistente nutricional de DiabetesRisk, una plataforma que estima el riesgo de diabetes tipo 2.",
  "Acompañas a la persona DESPUÉS de que recibió su estimación de riesgo.",
  "Reglas:",
  "- Responde SIEMPRE en español, cálido y cercano pero directo. Máximo 4 frases salvo que pidan un listado.",
  "- Básate SOLO en los datos de contexto que se te dan (nivel de riesgo, plan, alimentos con sus valores). No inventes alimentos ni cifras que no estén ahí.",
  "- Nunca das un diagnóstico. Si el riesgo es alto, recuerda con tacto que consulte a un médico o nutricionista.",
  "- No uses emojis. No uses markdown de encabezados. Puedes usar viñetas simples con '•' si enumeras.",
  "- Si te preguntan algo fuera de nutrición/diabetes/su resultado, redirige amablemente a eso.",
  "- Si el usuario menciona una intolerancia, alergia o restricción alimentaria NUEVA (ej. 'soy intolerante a la lactosa', 'soy vegetariano', 'no puedo comer mariscos'), llama a update_dietary_restrictions con la lista COMPLETA de categorías a excluir: las que ya estaban activas (ver 'Restricciones activas del usuario' en el contexto) más la nueva.",
  "- Si el usuario dice que YA NO tiene una restricción, que se equivocó, o que quiere volver a comer de todo (ej. 'ya no soy intolerante', 'quita mis restricciones', 'come de todo otra vez'), también llama a update_dietary_restrictions pero con esa categoría QUITADA de la lista (puede quedar vacía []). No asumas restricciones que el usuario no mencionó explícitamente — cada usuario tiene las suyas propias, nunca reutilices las de otra conversación.",
  "- Si el usuario pide cambiar o sustituir un alimento específico de su plan (ej. 'cámbiame la tilapia', 'no me gusta el pollo', 'ponme otra cosa en vez de lentejas'), llama SIEMPRE a suggest_food_alternatives con el nombre de ese alimento — nunca inventes un sustituto de memoria ni sugieras algo de otra categoría (como fruta para reemplazar una proteína). Si la función no devuelve alternativas (porque esa categoría está entre las restricciones activas), dilo claramente en vez de inventar una.",
].join("\n");

export function greeting(ctx: ChatContext): ChatMsg {
  const plan = DIET_PLANS[ctx.level];
  const hasResult = ctx.percent > 0 || ctx.topFactors.length > 0;
  const tone = hasResult
    ? ctx.level === "low"
      ? "Buenas noticias: tu resultado salió en riesgo bajo."
      : ctx.level === "moderate"
      ? "Tu resultado salió en riesgo intermedio, un buen momento para actuar."
      : "Tu resultado salió en riesgo alto, así que vale la pena tomarlo en serio."
    : `Estás viendo el plan para riesgo ${LEVEL_LABEL[ctx.level]} (${plan.title.toLowerCase()}).`;
  return {
    role: "bot",
    text: `Hola, soy tu guía nutricional. ${tone} Estoy aquí para explicarte qué significa y ayudarte con tu alimentación según tu nivel de riesgo. Si tienes alguna intolerancia o alergia, dímelo y ajusto tu plan. ¿Por dónde quieres empezar?`,
  };
}

export function suggestionsFor(ctx: ChatContext): Suggestion[] {
  return [
    { label: "¿Qué significa mi resultado?", intent: "explain_result" },
    { label: "¿Qué debería comer?", intent: "what_eat" },
    { label: "¿Qué conviene evitar?", intent: "what_avoid" },
    { label: "¿Por qué esos nutrientes?", intent: "why_nutrients" },
    { label: "Muéstrame un día de ejemplo", intent: "sample_day" },
    { label: "¿Cuáles son mis próximos pasos?", intent: "next_steps" },
  ];
}

function topFoodsFor(level: RiskLevel, avoid: boolean, n = 4): FoodItem[] {
  const plan = DIET_PLANS[level];
  if (avoid) {
    // Para "qué evitar" sí sirve CURATED_FOODS: son ejemplos reales de
    // ultraprocesados/comida chatarra (chicharrón, tocino, snacks salados),
    // no ingredientes crudos disfrazados de recomendación.
    const pool = CURATED_FOODS.filter((f) => f.avoid);
    return [...pool].sort((a, b) => (b.kcal ?? 0) - (a.kcal ?? 0)).slice(0, n);
  }
  // Para "qué comer" se usan los ingredientes de los platos curados
  // (mealTemplates.ts) — comida real, ya lista para comer, la misma que
  // arma el plan semanal — en vez del pool de CURATED_FOODS ordenado por
  // fibra, que incluye cosas como "lenteja cruda" o "salvado de trigo
  // crudo" (técnicamente alto en fibra, pero nadie se come eso tal cual).
  const pool = allTemplateItems(level).map(toFoodItem);
  // Reparte por categoría (no un top-N global por fibra) — si no, las
  // legumbres (mucha más fibra por 100g) siempre ganan y categorías como
  // Frutas quedan sin ningún representante, aunque estén en el plan.
  const focus = plan.focusCategories;
  const perCategory = Math.max(1, Math.ceil(n / focus.length));
  const picked: FoodItem[] = [];
  for (const cat of focus) {
    const items = pool
      .filter((f) => f.categoria === cat)
      .sort((a, b) => (b.fibra ?? 0) - (a.fibra ?? 0))
      .slice(0, perCategory);
    picked.push(...items);
  }
  return picked.slice(0, n);
}

// Sustitutos reales para un alimento específico (ej. "cambia la tilapia por
// otra cosa") — busca la categoría del alimento mencionado dentro de los
// platos curados y devuelve otros ingredientes reales de esa MISMA
// categoría, respetando las restricciones activas del usuario. Si no se
// reconoce el alimento, no devuelve nada (mejor no sugerir que sugerir algo
// de otra categoría, como fruta en vez de proteína).
export function substitutesFor(level: RiskLevel, foodName: string, restrictions: string[] = [], n = 4): FoodItem[] {
  const pool = allTemplateItems(level);
  const target = pool.find((f) => f.nombre.toLowerCase().includes(foodName.toLowerCase()));
  if (!target) return [];
  return pool
    .filter((f) => f.categoria === target.categoria && f.nombre !== target.nombre && !restrictions.includes(f.categoria))
    .map(toFoodItem)
    .slice(0, n);
}

export function answer(intent: Intent, ctx: ChatContext, freeText?: string): ChatMsg {
  const plan = DIET_PLANS[ctx.level];

  switch (intent) {
    case "explain_result": {
      const factors = ctx.topFactors
        .slice(0, 3)
        .map((f) => {
          const name = FEATURE_ES[f.feature] ?? f.feature;
          const dir = f.direction === "increases_risk" ? "sube" : "baja";
          return `${name} (${dir} tu riesgo)`;
        })
        .join(", ");
      return {
        role: "bot",
        text: `El modelo estimó un ${ctx.percent}% de riesgo relativo de diabetes tipo 2. Es una orientación estadística, no un diagnóstico. Lo que más pesó en tu caso fue: ${factors || "una combinación de factores"}. La buena noticia es que varios de esos factores se pueden mejorar con alimentación y hábitos.`,
      };
    }
    case "what_eat": {
      const foods = topFoodsFor(ctx.level, false, 4);
      return {
        role: "bot",
        text: `Para tu nivel (riesgo ${LEVEL_LABEL[ctx.level]}), la base es el método del plato: ${plan.platePctVeggies}% vegetales sin almidón, ${plan.plateCarbs}% carbohidratos enteros y ${plan.plateProtein}% proteína magra, apuntando a unos ${plan.fiberTargetG} g de fibra al día. Estos alimentos de la tabla ecuatoriana encajan muy bien:`,
        foods,
      };
    }
    case "what_avoid": {
      const foods = topFoodsFor(ctx.level, true, 4);
      return {
        role: "bot",
        text: `Conviene limitar los azúcares añadidos, los ultraprocesados y (en tu nivel) ${plan.avoidCategories.join(", ").toLowerCase()}. Elevan la glucosa rápido y aportan calorías sin fibra. Ejemplos a moderar:`,
        foods,
      };
    }
    case "why_nutrients": {
      const rules = plan.nutrientRules
        .map((r) => `• ${r.label} (${r.direction === "prefer" ? "busca más" : "manténlo bajo"}): ${r.why}`)
        .join("\n\n");
      return {
        role: "bot",
        text: `Para tu nivel de riesgo, estos son los nutrientes que más importan y por qué:\n\n${rules}`,
      };
    }
    case "sample_day": {
      const day = plan.sampleDay.map((d) => `• ${d.meal}: ${d.idea}`).join("\n");
      return {
        role: "bot",
        text: `Un día de ejemplo para tu plan:\n\n${day}\n\nNo es una regla rígida: la idea es que veas cómo se ve el método del plato en la práctica.`,
      };
    }
    case "next_steps": {
      const base =
        ctx.level === "high"
          ? "Lo primero: agenda una consulta con un médico o nutricionista. Esta guía acompaña, no reemplaza ese seguimiento."
          : ctx.level === "moderate"
          ? "Elige uno o dos cambios concretos de esta semana (por ejemplo, cambiar el pan blanco por grano entero y sumar una porción de vegetales al almuerzo)."
          : "Mantén lo que ya funciona y revisa tu riesgo cada cierto tiempo. La constancia es lo que conserva tu bajo riesgo.";
      return {
        role: "bot",
        text: `${base} También puedes explorar la sección de dietas para ver el catálogo completo con los alimentos, sus calorías y macros. ¿Quieres que te muestre alimentos concretos para empezar?`,
      };
    }
    default: {
      // Respuesta libre por palabras clave, sin alucinar: si no reconoce, deriva.
      const t = (freeText ?? "").toLowerCase();
      if (/fruta|vegetal|comer|aliment|dieta|receta/.test(t)) return answer("what_eat", ctx);
      if (/evitar|azúcar|azucar|malo|prohib/.test(t)) return answer("what_avoid", ctx);
      if (/por qué|porque|nutriente|fibra|sodio|potasio/.test(t)) return answer("why_nutrients", ctx);
      if (/resultado|riesgo|significa|porcentaje/.test(t)) return answer("explain_result", ctx);
      if (/día|dia|ejemplo|menú|menu/.test(t)) return answer("sample_day", ctx);
      if (/paso|hacer|empezar|siguiente/.test(t)) return answer("next_steps", ctx);
      return {
        role: "bot",
        text: "Puedo ayudarte con tu resultado, qué comer, qué evitar, por qué importan ciertos nutrientes, un día de ejemplo o tus próximos pasos. Toca una de las opciones o pregúntame con esas palabras.",
      };
    }
  }
}
