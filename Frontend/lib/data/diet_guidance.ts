// Guía nutricional por nivel de riesgo de diabetes tipo 2.
// Fundamentado en recomendaciones de la American Diabetes Association (ADA),
// CDC, Mayo Clinic y Harvard Health (método del plato, 25-30 g de fibra/día,
// bajo índice glucémico, minerales potasio/magnesio inversamente asociados a
// HbA1c). Referencias en Database/SUPABASE.md y el chatbot cita las fuentes.

export type RiskLevel = "low" | "moderate" | "high";

export type NutrientRule = {
  key: string;
  label: string;
  // "prefer" = buscar alimentos altos en esto; "limit" = mantenerlo bajo
  direction: "prefer" | "limit";
  why: string;
};

export type DietPlan = {
  level: RiskLevel;
  title: string;
  headline: string;
  summary: string;
  platePctVeggies: number;
  plateCarbs: number;
  plateProtein: number;
  fiberTargetG: number;
  focusCategories: string[]; // categorías del food_nutrition a destacar
  avoidCategories: string[];
  nutrientRules: NutrientRule[];
  sampleDay: { meal: string; idea: string }[];
};

export const DIET_PLANS: Record<RiskLevel, DietPlan> = {
  low: {
    level: "low",
    title: "Plan preventivo",
    headline: "Mantener el buen camino",
    summary:
      "Tu riesgo estimado es bajo. La meta no es corregir nada urgente, sino sostener hábitos que mantengan tu glucosa estable a largo plazo. Comer variado, con suficiente fibra y sin exceso de azúcares añadidos, es lo que conserva ese margen.",
    platePctVeggies: 50,
    plateCarbs: 25,
    plateProtein: 25,
    fiberTargetG: 25,
    focusCategories: ["Vegetales", "Frutas", "Leguminosas", "Cereales, tubérculos y plátanos"],
    avoidCategories: ["Azúcares", "Snacks"],
    nutrientRules: [
      {
        key: "fibra_g",
        label: "Fibra",
        direction: "prefer",
        why: "Frena la absorción de azúcar y evita picos de glucosa después de comer. La ADA recomienda 25-30 g al día; mantenerla alta es la forma más simple de conservar tu bajo riesgo.",
      },
      {
        key: "potasio_mg",
        label: "Potasio",
        direction: "prefer",
        why: "Equilibra el sodio y protege la presión arterial. Un mayor consumo de potasio se asocia con mejor control de la glucosa a largo plazo (menor HbA1c).",
      },
      {
        key: "kcal",
        label: "Calorías",
        direction: "limit",
        why: "Mantener el peso estable es el factor que más protege frente a la diabetes tipo 2. No hace falta contar calorías al detalle, solo evitar el exceso constante.",
      },
    ],
    sampleDay: [
      { meal: "Desayuno", idea: "Avena con fruta fresca y un puñado de nueces." },
      { meal: "Almuerzo", idea: "Medio plato de vegetales, un cuarto de quinua o arroz integral, un cuarto de pollo o pescado." },
      { meal: "Cena", idea: "Legumbres (lenteja, fréjol) con ensalada abundante." },
    ],
  },
  moderate: {
    level: "moderate",
    title: "Plan de control activo",
    headline: "Reforzar antes de que avance",
    summary:
      "Tu riesgo estimado es intermedio: es el momento en que los cambios de alimentación tienen más impacto. Priorizamos bajar el índice glucémico de lo que comes, subir la fibra y cuidar sodio y grasas saturadas, porque a este nivel el riesgo suele venir acompañado de presión y colesterol.",
    platePctVeggies: 50,
    plateCarbs: 25,
    plateProtein: 25,
    fiberTargetG: 30,
    focusCategories: ["Vegetales", "Leguminosas", "Pescados y mariscos", "Frutas"],
    avoidCategories: ["Azúcares", "Snacks", "Carnes y embutidos"],
    nutrientRules: [
      {
        key: "fibra_g",
        label: "Fibra",
        direction: "prefer",
        why: "A riesgo intermedio conviene apuntar al extremo alto del rango (30 g/día). La fibra soluble de legumbres y vegetales suaviza la curva de glucosa tras cada comida.",
      },
      {
        key: "grasa_saturada_g",
        label: "Grasa saturada",
        direction: "limit",
        why: "El riesgo medio suele ir junto a colesterol alto. Reducir la grasa saturada (embutidos, frituras) protege las arterias que la glucosa alta ya tiende a dañar.",
      },
      {
        key: "sodio_mg",
        label: "Sodio",
        direction: "limit",
        why: "Glucosa alta y presión alta van de la mano. Bajar el sodio ayuda a controlar la presión, que a este nivel de riesgo es una preocupación real.",
      },
      {
        key: "potasio_mg",
        label: "Potasio",
        direction: "prefer",
        why: "Contrarresta al sodio y se asocia a mejor control glucémico. Vegetales de hoja, legumbres y ciertas frutas lo aportan sin azúcar añadida.",
      },
    ],
    sampleDay: [
      { meal: "Desayuno", idea: "Huevo con vegetales salteados y una fruta de bajo índice glucémico (manzana, pera)." },
      { meal: "Almuerzo", idea: "Pescado a la plancha, medio plato de vegetales, un cuarto de legumbres." },
      { meal: "Cena", idea: "Ensalada grande con atún o pollo, aguacate y semillas; evitar pan blanco." },
    ],
  },
  high: {
    level: "high",
    title: "Plan de manejo intensivo",
    headline: "Actuar y consultar a un profesional",
    summary:
      "Tu riesgo estimado es alto. Además de estos ajustes de alimentación, es importante que consultes con un médico o nutricionista: esta guía acompaña, no reemplaza, ese seguimiento. La prioridad es controlar la glucosa con alimentos de bajo índice glucémico, mucha fibra y el mínimo de azúcares y grasas saturadas.",
    platePctVeggies: 50,
    plateCarbs: 25,
    plateProtein: 25,
    fiberTargetG: 30,
    focusCategories: ["Vegetales", "Leguminosas", "Pescados y mariscos"],
    avoidCategories: ["Azúcares", "Snacks", "Carnes y embutidos", "Grasas y frutos secos"],
    nutrientRules: [
      {
        key: "carbohidratos_g",
        label: "Carbohidratos",
        direction: "limit",
        why: "A riesgo alto, la cantidad y el tipo de carbohidrato es lo que más mueve la glucosa. No se eliminan, se eligen: enteros, con fibra, en porciones controladas (un cuarto del plato).",
      },
      {
        key: "fibra_g",
        label: "Fibra",
        direction: "prefer",
        why: "Es tu mejor aliada para amortiguar los picos de azúcar. Cada comida debería incluir una fuente de fibra (legumbres, vegetales, granos enteros).",
      },
      {
        key: "grasa_saturada_g",
        label: "Grasa saturada",
        direction: "limit",
        why: "Reducirla protege un sistema cardiovascular que a este nivel de riesgo ya está bajo más presión por la glucosa elevada.",
      },
      {
        key: "sodio_mg",
        label: "Sodio",
        direction: "limit",
        why: "Control estricto: la combinación de glucosa y presión altas es la que más daña las arterias con el tiempo.",
      },
    ],
    sampleDay: [
      { meal: "Desayuno", idea: "Tortilla de claras con espinaca; evitar jugos y pan blanco." },
      { meal: "Almuerzo", idea: "Medio plato de vegetales, un cuarto de legumbres, un cuarto de pescado o pollo; agua en vez de bebidas azucaradas." },
      { meal: "Cena", idea: "Sopa de vegetales con legumbres, porción pequeña de grano entero." },
    ],
  },
};

// Mapea la categoría de riesgo que devuelve el modelo (texto libre del backend)
// a un nivel de plan. El backend usa low/moderate/high; cubrimos variantes en
// español por si acaso.
export function riskToLevel(category: string): RiskLevel {
  const c = category.toLowerCase();
  if (c.includes("high") || c.includes("alto")) return "high";
  if (c.includes("mod") || c.includes("medio") || c.includes("inter")) return "moderate";
  return "low";
}
