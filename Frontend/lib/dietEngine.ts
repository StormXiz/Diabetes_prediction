import { MEAL_STRUCTURE, RESTRICTABLE_CATEGORIES, type MealSlot, type MealTemplate, type RiskLevel } from "@/lib/data/mealTemplates";

export { RESTRICTABLE_CATEGORIES };

const DAYS = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo"];

// Cuánto puede estirarse o encogerse una porción de referencia para ajustar a
// las calorías del día. Fuera de este rango, el plato deja de verse como una
// porción realista (por eso NO se escala libre, a diferencia del motor
// anterior que llegaba a pedir 400g de un solo alimento).
const MIN_SCALE = 0.6;
const MAX_SCALE = 2.0;

// Las porciones de referencia de Almuerzo/Cena se escribieron pensando en
// ~2000 kcal/día. Para objetivos más altos (personas activas/grandes, ej.
// 2500-2800 kcal) la plantilla más liviana del pool (típicamente pescado)
// necesitaba una escala > MAX_SCALE y el día se quedaba muy por debajo del
// objetivo ("no llega, me quedo con hambre"). En vez de reescribir a mano
// las ~30 plantillas, se sube la porción base de las comidas principales de
// una vez aquí — sigue siendo una porción real (ej. pechuga de pollo pasa de
// 120g a ~170g), solo más generosa.
const MAIN_MEAL_BOOST: Partial<Record<MealSlot, number>> = {
  Almuerzo: 1.6,
  Cena: 1.5,
};

export type MealItem = {
  food: { nombre: string };
  grams: number;
  kcal: number;
  prot: number;
  carb: number;
  grasa: number;
  fibra: number;
  substitutedFrom?: string;
};
export type Meal = { name: string; items: MealItem[]; totalKcal: number };
export type DayMacros = { prot: number; carb: number; grasa: number; fibra: number };
export type DayPlan = { day: string; meals: Meal[]; totalKcal: number; macros: DayMacros };
export type WeekPlan = { days: DayPlan[]; targetCalories: number };

function templateAllowed(template: MealTemplate, restrictions: string[]): boolean {
  return !template.items.some((i) => restrictions.includes(i.categoria));
}

function hasAnimalProtein(template: MealTemplate): boolean {
  return template.items.some(
    (i) => i.categoria === "Carnes y embutidos" || i.categoria === "Pescados y mariscos",
  );
}

function pickTemplate(
  templates: Record<RiskLevel, MealTemplate[]>,
  level: RiskLevel,
  restrictions: string[],
  seed: number,
  requireAnimalProtein: boolean,
  recentNames: string[],
): { template: MealTemplate; substituted: boolean } {
  const pool = templates[level];
  const allowed = pool.filter((t) => templateAllowed(t, restrictions));
  // Cada comida siempre tiene al menos una plantilla libre de carne, pescado
  // Y lácteos a la vez, así que esto solo cae al pool completo en el caso
  // extremo de restricciones que no cubrimos — mejor mostrar algo que nada.
  let finalPool = allowed.length > 0 ? allowed : pool;

  // Si el almuerzo del día ya cayó en un plato sin proteína animal (ej. el
  // de leguminosas), la cena no puede repetir eso — evita días enteros sin
  // pollo/pescado/res/cerdo, que era la queja real ("nadie come lenteja dos
  // veces el mismo día"). Solo aplica si no choca con las restricciones.
  if (requireAnimalProtein) {
    const withProtein = finalPool.filter(hasAnimalProtein);
    if (withProtein.length > 0) finalPool = withProtein;
  }

  // Evita repetir el MISMO plato en los últimos días de esta franja — filtrar
  // el pool (por restricciones, por proteína animal) desalinea el índice
  // "seed % pool.length" del resto de la semana y puede hacer que el mismo
  // plato caiga dos días seguidos por pura coincidencia aritmética. Se
  // prioriza cualquier plato NO usado recientemente; solo se permite repetir
  // si de verdad no queda otra opción (pool muy chico + restricciones).
  const fresh = finalPool.filter((t) => !recentNames.includes(t.nombre));
  if (fresh.length > 0) finalPool = fresh;

  const template = finalPool[seed % finalPool.length];
  return { template, substituted: allowed.length === 0 && pool.length > 0 };
}

function templateBaseKcal(template: MealTemplate, boost: number): number {
  return template.items.reduce((sum, i) => sum + (i.kcal100 * i.gramosBase * boost) / 100, 0);
}

export function generateWeeklyPlan(
  targetCalories: number,
  level: RiskLevel,
  restrictions: string[],
): WeekPlan {
  // Historial de nombres de plato ya usados esta semana, por franja (solo
  // se guardan los últimos 2 días de cada una) — así "Almuerzo" no repite
  // lo mismo que ayer o antier, independiente de cómo el filtrado de
  // restricciones/proteína haya movido los índices ese día.
  const recentBySlot: Record<string, string[]> = {};

  const days: DayPlan[] = DAYS.map((day, dayIdx) => {
    let almuerzoLackedProtein = false;

    const meals: Meal[] = MEAL_STRUCTURE.map((slotDef, slotIdx) => {
      // OJO: nunca multiplicar dayIdx por 7 (o cualquier múltiplo de un
      // tamaño de pool real) — con 7 días de la semana, "dayIdx*7" es
      // siempre múltiplo de 7, así que para cualquier pool de tamaño 7 el
      // resultado de "% 7" da SIEMPRE el mismo índice sin importar el día
      // (bug real que hacía que Almuerzo cayera en el mismo plato toda la
      // semana). "dayIdx" solo (sin escalar) sí varía en 1 con cada día y
      // recorre cualquier tamaño de pool de forma pareja.
      const seed = dayIdx + slotIdx * 2;
      const requireAnimalProtein = slotDef.slot === "Cena" && almuerzoLackedProtein;
      const recentNames = recentBySlot[slotDef.slot] ?? [];
      const { template, substituted } = pickTemplate(slotDef.templates, level, restrictions, seed, requireAnimalProtein, recentNames);

      recentBySlot[slotDef.slot] = [template.nombre, ...recentNames].slice(0, 2);

      if (slotDef.slot === "Almuerzo" && !hasAnimalProtein(template)) {
        almuerzoLackedProtein = true;
      }

      const boost = MAIN_MEAL_BOOST[slotDef.slot] ?? 1;
      const mealBudget = targetCalories * slotDef.pct;
      const baseKcal = templateBaseKcal(template, boost);
      const rawScale = baseKcal > 0 ? mealBudget / baseKcal : 1;
      const scale = Math.min(MAX_SCALE, Math.max(MIN_SCALE, rawScale));

      const items: MealItem[] = template.items.map((i) => {
        const grams = Math.round((i.gramosBase * boost * scale) / 5) * 5;
        const kcal = Math.round((i.kcal100 * grams) / 100);
        const prot = Math.round((i.prot100 * grams) / 100);
        const carb = Math.round((i.carb100 * grams) / 100);
        const grasa = Math.round((i.grasa100 * grams) / 100);
        const fibra = Math.round((i.fibra100 * grams) / 100);
        return {
          food: { nombre: i.nombre },
          grams,
          kcal,
          prot,
          carb,
          grasa,
          fibra,
          substitutedFrom: substituted ? restrictions[0] : undefined,
        };
      });

      const totalKcal = items.reduce((s, i) => s + i.kcal, 0);
      return { name: slotDef.slot, items, totalKcal };
    });

    const totalKcal = meals.reduce((s, m) => s + m.totalKcal, 0);
    const allItems = meals.flatMap((m) => m.items);
    const macros: DayMacros = {
      prot: allItems.reduce((s, i) => s + i.prot, 0),
      carb: allItems.reduce((s, i) => s + i.carb, 0),
      grasa: allItems.reduce((s, i) => s + i.grasa, 0),
      fibra: allItems.reduce((s, i) => s + i.fibra, 0),
    };
    return { day, meals, totalKcal, macros };
  });

  return { days, targetCalories };
}
