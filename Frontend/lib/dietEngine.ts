import { DIET_POOLS, type PoolFood } from "@/lib/data/dietPools";
import type { RiskLevel } from "@/lib/data/diet_guidance";

const DAYS = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo"];

type PoolName = keyof typeof DIET_POOLS;

const POOL_CATEGORY: Record<PoolName, string> = {
  vegetales: "Vegetales",
  frutas: "Frutas",
  carbohidratos: "Cereales, tubérculos y plátanos",
  leguminosas: "Leguminosas",
  pescados: "Pescados y mariscos",
  carnes_magras: "Carnes y embutidos",
  lacteos: "Lácteos",
  frutos_secos: "Grasas y frutos secos",
};

// Categorías que un usuario puede excluir por restricción (intolerancia, alergia,
// preferencia). Todas mapean 1:1 a categorías reales de food_nutrition, así que
// nunca inventamos un alimento "sin lactosa" — sustituimos por otra categoría real.
export const RESTRICTABLE_CATEGORIES = Object.values(POOL_CATEGORY);

type MealRole = "protein" | "carb" | "veg" | "fruit" | "dairy" | "snack";

type MealStructure = { name: string; pct: number; roles: { role: MealRole; pct: number }[] };

const MEAL_STRUCTURE: MealStructure[] = [
  { name: "Desayuno", pct: 0.25, roles: [
    { role: "dairy", pct: 0.35 }, { role: "carb", pct: 0.35 }, { role: "fruit", pct: 0.30 },
  ] },
  { name: "Media mañana", pct: 0.05, roles: [{ role: "snack", pct: 1 }] },
  { name: "Almuerzo", pct: 0.35, roles: [
    { role: "protein", pct: 0.4 }, { role: "carb", pct: 0.3 }, { role: "veg", pct: 0.3 },
  ] },
  { name: "Media tarde", pct: 0.05, roles: [{ role: "snack", pct: 1 }] },
  { name: "Cena", pct: 0.30, roles: [
    { role: "protein", pct: 0.45 }, { role: "veg", pct: 0.45 }, { role: "carb", pct: 0.10 },
  ] },
];

export type MealItem = {
  food: PoolFood;
  grams: number;
  kcal: number;
  role: MealRole;
  pool: PoolName;
  substitutedFrom?: string;
};
export type Meal = { name: string; items: MealItem[]; totalKcal: number };
export type DayPlan = { day: string; meals: Meal[]; totalKcal: number };
export type WeekPlan = { days: DayPlan[]; targetCalories: number };

function poolAllowed(pool: PoolName, restrictions: string[]): boolean {
  return !restrictions.includes(POOL_CATEGORY[pool]);
}

function proteinPools(level: RiskLevel): PoolName[] {
  if (level === "high") return ["pescados", "leguminosas"];
  if (level === "moderate") return ["pescados", "leguminosas", "carnes_magras"];
  return ["carnes_magras", "pescados", "leguminosas"];
}

function poolsForRole(role: MealRole, level: RiskLevel, restrictions: string[]): { pools: PoolName[]; substitutedFrom?: string } {
  let candidates: PoolName[];
  let substitutedFrom: string | undefined;

  switch (role) {
    case "protein":
      candidates = proteinPools(level);
      break;
    case "carb":
      candidates = ["carbohidratos"];
      break;
    case "veg":
      candidates = ["vegetales"];
      break;
    case "fruit":
      candidates = ["frutas"];
      break;
    case "dairy":
      candidates = ["lacteos"];
      break;
    case "snack":
      candidates = ["frutas", "frutos_secos"];
      break;
  }

  const allowed = candidates.filter((p) => poolAllowed(p, restrictions));
  if (allowed.length === 0) {
    // Todas las opciones naturales de este rol están restringidas — se sustituye
    // por la mejor alternativa disponible, y se marca para que la UI lo explique.
    substitutedFrom = POOL_CATEGORY[candidates[0]];
    const fallback: PoolName[] = role === "dairy" ? ["frutos_secos", "leguminosas"] : ["vegetales"];
    const fallbackAllowed = fallback.filter((p) => poolAllowed(p, restrictions));
    return { pools: fallbackAllowed.length ? fallbackAllowed : ["vegetales"], substitutedFrom };
  }
  return { pools: allowed };
}

function gramsForBudget(kcalBudget: number, kcalPer100g: number): number {
  if (!kcalPer100g || kcalPer100g <= 0) return 100;
  const grams = (kcalBudget / kcalPer100g) * 100;
  return Math.round(Math.min(400, Math.max(20, grams)) / 5) * 5;
}

export function generateWeeklyPlan(
  targetCalories: number,
  level: RiskLevel,
  restrictions: string[],
): WeekPlan {
  const days: DayPlan[] = DAYS.map((day, dayIdx) => {
    const meals: Meal[] = MEAL_STRUCTURE.map((structure, mealIdx) => {
      const mealBudget = targetCalories * structure.pct;
      const items: MealItem[] = structure.roles.map((r, roleIdx) => {
        const { pools, substitutedFrom } = poolsForRole(r.role, level, restrictions);
        const seed = dayIdx * 11 + mealIdx * 5 + roleIdx * 3;
        const pool = pools[seed % pools.length];
        const list = DIET_POOLS[pool];
        const food = list[seed % list.length];
        const kcalBudget = mealBudget * r.pct;
        const kcalPer100 = food.kcal ?? 100;
        const grams = gramsForBudget(kcalBudget, kcalPer100);
        const kcal = Math.round((kcalPer100 * grams) / 100);
        return { food, grams, kcal, role: r.role, pool, substitutedFrom };
      });
      const totalKcal = items.reduce((s, i) => s + i.kcal, 0);
      return { name: structure.name, items, totalKcal };
    });
    const totalKcal = meals.reduce((s, m) => s + m.totalKcal, 0);
    return { day, meals, totalKcal };
  });

  return { days, targetCalories };
}
