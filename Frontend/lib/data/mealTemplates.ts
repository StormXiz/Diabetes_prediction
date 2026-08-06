// Platos curados a mano — no una selección algorítmica por fibra (eso daba
// cosas como "semillas de hinojo crudas" o "salvado de trigo crudo" como si
// fueran una comida). Cada plato es una combinación real de lo que alguien
// comería, con los macros reales de la Tabla de Composición de Alimentos de
// Ecuador 2021 (food_nutrition) para cada ingrediente — solo se escala la
// porción (gramos) para ajustar a las calorías del día, nunca se inventan
// valores nutricionales.

export type RiskLevel = "low" | "moderate" | "high";
export type MealSlot = "Desayuno" | "Media mañana" | "Almuerzo" | "Media tarde" | "Cena";

export type TemplateItem = {
  nombre: string; // nombre real tal como aparece en food_nutrition
  categoria: string; // para poder excluir por restricción (ej. "Lácteos")
  gramosBase: number; // porción realista de referencia (una persona, no escalada aún)
  kcal100: number;
  prot100: number;
  carb100: number;
  grasa100: number;
  fibra100: number;
};

export type MealTemplate = {
  nombre: string; // nombre del plato para mostrar
  items: TemplateItem[];
};

function item(
  nombre: string,
  categoria: string,
  gramosBase: number,
  kcal100: number,
  prot100: number,
  carb100: number,
  grasa100: number,
  fibra100: number,
): TemplateItem {
  return { nombre, categoria, gramosBase, kcal100, prot100, carb100, grasa100, fibra100 };
}

const DESAYUNO: Record<RiskLevel, MealTemplate[]> = {
  low: [
    {
      nombre: "Avena con leche, manzana y canela",
      items: [
        item("Avena, molida, Quaker", "Cereales, tubérculos y plátanos", 50, 372.9, 15.5, 64.0, 6.1, 10.9),
        item("Leche de vaca, descremada (1% grasa), fluida, con vitamina A y D", "Lácteos", 200, 42.17, 3.37, 4.99, 0.97, 0.0),
        item("Manzana, con cáscara, importada", "Frutas", 130, 57.81, 0.26, 13.81, 0.17, 2.4),
      ],
    },
    {
      nombre: "Huevos revueltos con tomate y pan integral",
      items: [
        item("Huevo de gallina, entero, crudo", "Carnes y embutidos", 130, 142.86, 12.58, 0.77, 9.94, 0.0),
        item("Tomate, rojo, riñon, crudo, promedio", "Vegetales", 60, 24.3, 0.8, 4.6, 0.3, 1.2),
        item("Pan, integral, de trigo", "Cereales, tubérculos y plátanos", 60, 253.55, 12.3, 43.1, 3.55, 6.0),
      ],
    },
    {
      nombre: "Yogur natural con banano",
      items: [
        item("Yogurt, natural, leche descremada, bajo en grasa", "Lácteos", 250, 55.26, 5.73, 7.68, 0.18, 0.0),
        item("Banano, guineo, plátano seda", "Frutas", 130, 98.69, 1.09, 22.84, 0.33, 2.6),
      ],
    },
    {
      // Sin lácteos ni huevo — para intolerancia a la lactosa combinada con
      // restricciones de carne/pescado (ej. vegano).
      nombre: "Avena con agua, manzana y pan integral",
      items: [
        item("Avena, molida, Quaker", "Cereales, tubérculos y plátanos", 45, 372.9, 15.5, 64.0, 6.1, 10.9),
        item("Pan, integral, de trigo", "Cereales, tubérculos y plátanos", 40, 253.55, 12.3, 43.1, 3.55, 6.0),
        item("Manzana, con cáscara, importada", "Frutas", 130, 57.81, 0.26, 13.81, 0.17, 2.4),
      ],
    },
  ],
  moderate: [
    {
      nombre: "Avena con leche, manzana y canela",
      items: [
        item("Avena, molida, Quaker", "Cereales, tubérculos y plátanos", 45, 372.9, 15.5, 64.0, 6.1, 10.9),
        item("Leche de vaca, descremada (1% grasa), fluida, con vitamina A y D", "Lácteos", 180, 42.17, 3.37, 4.99, 0.97, 0.0),
        item("Manzana, con cáscara, importada", "Frutas", 120, 57.81, 0.26, 13.81, 0.17, 2.4),
      ],
    },
    {
      nombre: "Huevo con espinaca, tomate y pan integral",
      items: [
        item("Huevo de gallina, entero, crudo", "Carnes y embutidos", 120, 142.86, 12.58, 0.77, 9.94, 0.0),
        item("Espinaca, escurrida, cocida, sin sal", "Vegetales", 80, 29.22, 2.97, 3.75, 0.26, 2.4),
        item("Pan, integral, de trigo", "Cereales, tubérculos y plátanos", 40, 253.55, 12.3, 43.1, 3.55, 6.0),
      ],
    },
    {
      nombre: "Yogur natural con pera",
      items: [
        item("Yogurt, natural, leche descremada, bajo en grasa", "Lácteos", 220, 55.26, 5.73, 7.68, 0.18, 0.0),
        item("Pera, importada, sin cáscara", "Frutas", 120, 64.44, 0.38, 15.46, 0.12, 3.1),
      ],
    },
    {
      nombre: "Avena con agua, manzana y pan integral",
      items: [
        item("Avena, molida, Quaker", "Cereales, tubérculos y plátanos", 40, 372.9, 15.5, 64.0, 6.1, 10.9),
        item("Pan, integral, de trigo", "Cereales, tubérculos y plátanos", 35, 253.55, 12.3, 43.1, 3.55, 6.0),
        item("Manzana, con cáscara, importada", "Frutas", 120, 57.81, 0.26, 13.81, 0.17, 2.4),
      ],
    },
  ],
  high: [
    {
      nombre: "Huevos con espinaca, aguacate y pan integral",
      items: [
        item("Huevo de gallina, entero, crudo", "Carnes y embutidos", 120, 142.86, 12.58, 0.77, 9.94, 0.0),
        item("Espinaca, escurrida, cocida, sin sal", "Vegetales", 80, 29.22, 2.97, 3.75, 0.26, 2.4),
        item("Aguacate, sin cáscara, promedio", "Frutas", 50, 174.06, 2.0, 8.53, 14.66, 6.7),
        item("Pan, integral, de trigo", "Cereales, tubérculos y plátanos", 30, 253.55, 12.3, 43.1, 3.55, 6.0),
      ],
    },
    {
      nombre: "Yogur natural con pera",
      items: [
        item("Yogurt, natural, leche descremada, bajo en grasa", "Lácteos", 200, 55.26, 5.73, 7.68, 0.18, 0.0),
        item("Pera, importada, sin cáscara", "Frutas", 110, 64.44, 0.38, 15.46, 0.12, 3.1),
      ],
    },
    {
      nombre: "Avena con leche y manzana",
      items: [
        item("Avena, molida, Quaker", "Cereales, tubérculos y plátanos", 35, 372.9, 15.5, 64.0, 6.1, 10.9),
        item("Leche de vaca, descremada (1% grasa), fluida, con vitamina A y D", "Lácteos", 180, 42.17, 3.37, 4.99, 0.97, 0.0),
        item("Manzana, con cáscara, importada", "Frutas", 110, 57.81, 0.26, 13.81, 0.17, 2.4),
      ],
    },
    {
      nombre: "Avena con agua, manzana y pan integral",
      items: [
        item("Avena, molida, Quaker", "Cereales, tubérculos y plátanos", 30, 372.9, 15.5, 64.0, 6.1, 10.9),
        item("Pan, integral, de trigo", "Cereales, tubérculos y plátanos", 30, 253.55, 12.3, 43.1, 3.55, 6.0),
        item("Manzana, con cáscara, importada", "Frutas", 110, 57.81, 0.26, 13.81, 0.17, 2.4),
      ],
    },
  ],
};

const ALMUERZO: Record<RiskLevel, MealTemplate[]> = {
  low: [
    {
      nombre: "Pollo a la plancha con arroz integral y brócoli",
      items: [
        item("Pollo, pechuga, sin piel, a la parrilla, cocida", "Carnes y embutidos", 120, 143.19, 28.98, 0.0, 3.03, 0.0),
        item("Arroz integral, grano largo cocido", "Cereales, tubérculos y plátanos", 150, 122.01, 2.74, 25.58, 0.97, 1.6),
        item("Brócoli, cocido, sin sal", "Vegetales", 100, 41.93, 2.38, 7.18, 0.41, 3.3),
      ],
    },
    {
      nombre: "Pescado al horno con camote y espinaca",
      items: [
        item("Tilapia, fresca, asada", "Pescados y mariscos", 130, 128.45, 26.15, 0.0, 2.65, 0.0),
        item("Camote, con cáscara, cocido", "Cereales, tubérculos y plátanos", 120, 77.62, 1.37, 17.72, 0.14, 2.5),
        item("Espinaca, escurrida, cocida, sin sal", "Vegetales", 80, 29.22, 2.97, 3.75, 0.26, 2.4),
      ],
    },
    {
      nombre: "Lentejas guisadas con arroz y tomate",
      items: [
        item("Lenteja, germinada, cocida, sin sal", "Leguminosas", 150, 124.25, 8.8, 21.25, 0.45, 5.0),
        item("Arroz blanco grano largo, cocido", "Cereales, tubérculos y plátanos", 100, 125.96, 2.69, 28.17, 0.28, 0.4),
        item("Tomate, rojo, riñon, crudo, promedio", "Vegetales", 50, 24.3, 0.8, 4.6, 0.3, 1.2),
      ],
    },
    {
      nombre: "Res guisada con arroz y brócoli",
      items: [
        item("Res, corte aguja, (mandril para estofado), cocida", "Carnes y embutidos", 120, 191.02, 32.41, 0.0, 6.82, 0.0),
        item("Arroz blanco grano largo, cocido", "Cereales, tubérculos y plátanos", 130, 125.96, 2.69, 28.17, 0.28, 0.4),
        item("Brócoli, cocido, sin sal", "Vegetales", 100, 41.93, 2.38, 7.18, 0.41, 3.3),
      ],
    },
    {
      nombre: "Lomo de cerdo con camote y espinaca",
      items: [
        item("Cerdo, carne magra, (lomo, espaldilla y costilla), cocida", "Carnes y embutidos", 120, 201.15, 28.62, 0.0, 9.63, 0.0),
        item("Camote, con cáscara, cocido", "Cereales, tubérculos y plátanos", 120, 77.62, 1.37, 17.72, 0.14, 2.5),
        item("Espinaca, escurrida, cocida, sin sal", "Vegetales", 70, 29.22, 2.97, 3.75, 0.26, 2.4),
      ],
    },
    {
      nombre: "Pollo con arroz y ensalada de tomate",
      items: [
        item("Pollo, pechuga, sin piel, a la parrilla, cocida", "Carnes y embutidos", 120, 143.19, 28.98, 0.0, 3.03, 0.0),
        item("Arroz blanco grano largo, cocido", "Cereales, tubérculos y plátanos", 150, 125.96, 2.69, 28.17, 0.28, 0.4),
        item("Tomate, rojo, riñon, crudo, promedio", "Vegetales", 60, 24.3, 0.8, 4.6, 0.3, 1.2),
      ],
    },
    {
      nombre: "Atún con arroz integral y zanahoria",
      items: [
        item("Atún, en agua, enlatado, sin sal", "Pescados y mariscos", 110, 109.42, 25.51, 0.0, 0.82, 0.0),
        item("Arroz integral, grano largo cocido", "Cereales, tubérculos y plátanos", 130, 122.01, 2.74, 25.58, 0.97, 1.6),
        item("Zanahoria, sin cáscara, escurrida, cocida, sin sal, cubos", "Vegetales", 90, 37.54, 0.76, 8.22, 0.18, 3.0),
      ],
    },
  ],
  moderate: [
    {
      nombre: "Pollo a la plancha con quinua y brócoli",
      items: [
        item("Pollo, pechuga, sin piel, a la parrilla, cocida", "Carnes y embutidos", 130, 143.19, 28.98, 0.0, 3.03, 0.0),
        item("Quinua, cocida", "Cereales, tubérculos y plátanos", 120, 120.08, 4.4, 21.3, 1.92, 2.8),
        item("Brócoli, cocido, sin sal", "Vegetales", 100, 41.93, 2.38, 7.18, 0.41, 3.3),
      ],
    },
    {
      nombre: "Atún con fréjol y tomate",
      items: [
        item("Atún, en agua, enlatado, sin sal", "Pescados y mariscos", 100, 109.42, 25.51, 0.0, 0.82, 0.0),
        item("Fréjol, negro, grano seco, cocido, sin sal", "Leguminosas", 120, 135.14, 8.86, 23.71, 0.54, 8.7),
        item("Tomate, rojo, riñon, crudo, promedio", "Vegetales", 60, 24.3, 0.8, 4.6, 0.3, 1.2),
      ],
    },
    {
      nombre: "Pescado al horno con camote y vegetales salteados",
      items: [
        item("Tilapia, fresca, asada", "Pescados y mariscos", 140, 128.45, 26.15, 0.0, 2.65, 0.0),
        item("Camote, con cáscara, cocido", "Cereales, tubérculos y plátanos", 110, 77.62, 1.37, 17.72, 0.14, 2.5),
        item("Brócoli, cocido, sin sal", "Vegetales", 100, 41.93, 2.38, 7.18, 0.41, 3.3),
      ],
    },
    {
      nombre: "Lentejas con quinua y vegetales",
      items: [
        item("Lenteja, germinada, cocida, sin sal", "Leguminosas", 150, 124.25, 8.8, 21.25, 0.45, 5.0),
        item("Quinua, cocida", "Cereales, tubérculos y plátanos", 120, 120.08, 4.4, 21.3, 1.92, 2.8),
        item("Brócoli, cocido, sin sal", "Vegetales", 100, 41.93, 2.38, 7.18, 0.41, 3.3),
      ],
    },
    {
      nombre: "Res guisada con quinua y brócoli",
      items: [
        item("Res, corte aguja, (mandril para estofado), cocida", "Carnes y embutidos", 110, 191.02, 32.41, 0.0, 6.82, 0.0),
        item("Quinua, cocida", "Cereales, tubérculos y plátanos", 110, 120.08, 4.4, 21.3, 1.92, 2.8),
        item("Brócoli, cocido, sin sal", "Vegetales", 100, 41.93, 2.38, 7.18, 0.41, 3.3),
      ],
    },
    {
      nombre: "Lomo de cerdo con camote y vegetales salteados",
      items: [
        item("Cerdo, carne magra, (lomo, espaldilla y costilla), cocida", "Carnes y embutidos", 110, 201.15, 28.62, 0.0, 9.63, 0.0),
        item("Camote, con cáscara, cocido", "Cereales, tubérculos y plátanos", 100, 77.62, 1.37, 17.72, 0.14, 2.5),
        item("Zanahoria, sin cáscara, escurrida, cocida, sin sal, cubos", "Vegetales", 80, 37.54, 0.76, 8.22, 0.18, 3.0),
      ],
    },
    {
      nombre: "Lomo de cerdo con quinua y ensalada de tomate",
      items: [
        item("Cerdo, carne magra, (lomo, espaldilla y costilla), cocida", "Carnes y embutidos", 110, 201.15, 28.62, 0.0, 9.63, 0.0),
        item("Quinua, cocida", "Cereales, tubérculos y plátanos", 110, 120.08, 4.4, 21.3, 1.92, 2.8),
        item("Tomate, rojo, riñon, crudo, promedio", "Vegetales", 60, 24.3, 0.8, 4.6, 0.3, 1.2),
      ],
    },
  ],
  high: [
    {
      nombre: "Pescado al horno con vegetales y quinua",
      items: [
        item("Tilapia, fresca, asada", "Pescados y mariscos", 140, 128.45, 26.15, 0.0, 2.65, 0.0),
        item("Quinua, cocida", "Cereales, tubérculos y plátanos", 100, 120.08, 4.4, 21.3, 1.92, 2.8),
        item("Brócoli, cocido, sin sal", "Vegetales", 130, 41.93, 2.38, 7.18, 0.41, 3.3),
      ],
    },
    {
      nombre: "Pollo con camote y ensalada de vegetales",
      items: [
        item("Pollo, pechuga, sin piel, a la parrilla, cocida", "Carnes y embutidos", 130, 143.19, 28.98, 0.0, 3.03, 0.0),
        item("Camote, con cáscara, cocido", "Cereales, tubérculos y plátanos", 100, 77.62, 1.37, 17.72, 0.14, 2.5),
        item("Espinaca, escurrida, cocida, sin sal", "Vegetales", 100, 29.22, 2.97, 3.75, 0.26, 2.4),
      ],
    },
    {
      nombre: "Lentejas con arroz integral y brócoli",
      items: [
        item("Lenteja, germinada, cocida, sin sal", "Leguminosas", 160, 124.25, 8.8, 21.25, 0.45, 5.0),
        item("Arroz integral, grano largo cocido", "Cereales, tubérculos y plátanos", 100, 122.01, 2.74, 25.58, 0.97, 1.6),
        item("Brócoli, cocido, sin sal", "Vegetales", 120, 41.93, 2.38, 7.18, 0.41, 3.3),
      ],
    },
    {
      nombre: "Res guisada con vegetales y quinua",
      items: [
        item("Res, corte aguja, (mandril para estofado), cocida", "Carnes y embutidos", 110, 191.02, 32.41, 0.0, 6.82, 0.0),
        item("Quinua, cocida", "Cereales, tubérculos y plátanos", 90, 120.08, 4.4, 21.3, 1.92, 2.8),
        item("Brócoli, cocido, sin sal", "Vegetales", 120, 41.93, 2.38, 7.18, 0.41, 3.3),
      ],
    },
    {
      nombre: "Lomo de cerdo con camote y ensalada de vegetales",
      items: [
        item("Cerdo, carne magra, (lomo, espaldilla y costilla), cocida", "Carnes y embutidos", 100, 201.15, 28.62, 0.0, 9.63, 0.0),
        item("Camote, con cáscara, cocido", "Cereales, tubérculos y plátanos", 90, 77.62, 1.37, 17.72, 0.14, 2.5),
        item("Espinaca, escurrida, cocida, sin sal", "Vegetales", 100, 29.22, 2.97, 3.75, 0.26, 2.4),
      ],
    },
    {
      nombre: "Atún con quinua y espinaca",
      items: [
        item("Atún, en agua, enlatado, sin sal", "Pescados y mariscos", 110, 109.42, 25.51, 0.0, 0.82, 0.0),
        item("Quinua, cocida", "Cereales, tubérculos y plátanos", 100, 120.08, 4.4, 21.3, 1.92, 2.8),
        item("Espinaca, escurrida, cocida, sin sal", "Vegetales", 110, 29.22, 2.97, 3.75, 0.26, 2.4),
      ],
    },
    {
      nombre: "Pollo con arroz integral y zanahoria",
      items: [
        item("Pollo, pechuga, sin piel, a la parrilla, cocida", "Carnes y embutidos", 120, 143.19, 28.98, 0.0, 3.03, 0.0),
        item("Arroz integral, grano largo cocido", "Cereales, tubérculos y plátanos", 100, 122.01, 2.74, 25.58, 0.97, 1.6),
        item("Zanahoria, sin cáscara, escurrida, cocida, sin sal, cubos", "Vegetales", 110, 37.54, 0.76, 8.22, 0.18, 3.0),
      ],
    },
  ],
};

const CENA: Record<RiskLevel, MealTemplate[]> = {
  low: [
    {
      nombre: "Ensalada de atún con tomate y aguacate",
      items: [
        item("Atún, en agua, enlatado, promedio", "Pescados y mariscos", 180, 121.21, 23.62, 0.0, 2.97, 0.0),
        item("Tomate, rojo, riñon, crudo, promedio", "Vegetales", 100, 24.3, 0.8, 4.6, 0.3, 1.2),
        item("Aguacate, sin cáscara, promedio", "Frutas", 90, 174.06, 2.0, 8.53, 14.66, 6.7),
      ],
    },
    {
      nombre: "Pollo con camote y vegetales",
      items: [
        item("Pollo, pechuga, sin piel, a la parrilla, cocida", "Carnes y embutidos", 140, 143.19, 28.98, 0.0, 3.03, 0.0),
        item("Camote, con cáscara, cocido", "Cereales, tubérculos y plátanos", 120, 77.62, 1.37, 17.72, 0.14, 2.5),
        item("Espinaca, escurrida, cocida, sin sal", "Vegetales", 70, 29.22, 2.97, 3.75, 0.26, 2.4),
      ],
    },
    {
      nombre: "Tortilla de huevo con pan integral y vegetales",
      items: [
        item("Huevo de gallina, entero, crudo", "Carnes y embutidos", 150, 142.86, 12.58, 0.77, 9.94, 0.0),
        item("Pan, integral, de trigo", "Cereales, tubérculos y plátanos", 30, 253.55, 12.3, 43.1, 3.55, 6.0),
        item("Espinaca, escurrida, cocida, sin sal", "Vegetales", 100, 29.22, 2.97, 3.75, 0.26, 2.4),
        item("Tomate, rojo, riñon, crudo, promedio", "Vegetales", 70, 24.3, 0.8, 4.6, 0.3, 1.2),
      ],
    },
    {
      nombre: "Lentejas con arroz y ensalada",
      items: [
        item("Lenteja, germinada, cocida, sin sal", "Leguminosas", 150, 124.25, 8.8, 21.25, 0.45, 5.0),
        item("Arroz blanco grano largo, cocido", "Cereales, tubérculos y plátanos", 90, 125.96, 2.69, 28.17, 0.28, 0.4),
        item("Tomate, rojo, riñon, crudo, promedio", "Vegetales", 60, 24.3, 0.8, 4.6, 0.3, 1.2),
      ],
    },
    {
      nombre: "Res a la plancha con camote y espinaca",
      items: [
        item("Res, corte aguja, (mandril para estofado), cocida", "Carnes y embutidos", 130, 191.02, 32.41, 0.0, 6.82, 0.0),
        item("Camote, con cáscara, cocido", "Cereales, tubérculos y plátanos", 100, 77.62, 1.37, 17.72, 0.14, 2.5),
        item("Espinaca, escurrida, cocida, sin sal", "Vegetales", 80, 29.22, 2.97, 3.75, 0.26, 2.4),
      ],
    },
    {
      nombre: "Lomo de cerdo con vegetales salteados",
      items: [
        item("Cerdo, carne magra, (lomo, espaldilla y costilla), cocida", "Carnes y embutidos", 130, 201.15, 28.62, 0.0, 9.63, 0.0),
        item("Zanahoria, sin cáscara, escurrida, cocida, sin sal, cubos", "Vegetales", 80, 37.54, 0.76, 8.22, 0.18, 3.0),
        item("Brócoli, cocido, sin sal", "Vegetales", 90, 41.93, 2.38, 7.18, 0.41, 3.3),
      ],
    },
    {
      nombre: "Cerdo con quinua y brócoli",
      items: [
        item("Cerdo, carne magra, (lomo, espaldilla y costilla), cocida", "Carnes y embutidos", 120, 201.15, 28.62, 0.0, 9.63, 0.0),
        item("Quinua, cocida", "Cereales, tubérculos y plátanos", 90, 120.08, 4.4, 21.3, 1.92, 2.8),
        item("Brócoli, cocido, sin sal", "Vegetales", 90, 41.93, 2.38, 7.18, 0.41, 3.3),
      ],
    },
  ],
  moderate: [
    {
      nombre: "Pescado con camote y brócoli",
      items: [
        item("Tilapia, fresca, asada", "Pescados y mariscos", 150, 128.45, 26.15, 0.0, 2.65, 0.0),
        item("Camote, con cáscara, cocido", "Cereales, tubérculos y plátanos", 100, 77.62, 1.37, 17.72, 0.14, 2.5),
        item("Brócoli, cocido, sin sal", "Vegetales", 100, 41.93, 2.38, 7.18, 0.41, 3.3),
      ],
    },
    {
      nombre: "Atún con camote y vegetales salteados",
      items: [
        item("Atún, en agua, enlatado, sin sal", "Pescados y mariscos", 150, 109.42, 25.51, 0.0, 0.82, 0.0),
        item("Camote, con cáscara, cocido", "Cereales, tubérculos y plátanos", 90, 77.62, 1.37, 17.72, 0.14, 2.5),
        item("Espinaca, escurrida, cocida, sin sal", "Vegetales", 100, 29.22, 2.97, 3.75, 0.26, 2.4),
        item("Zanahoria, sin cáscara, escurrida, cocida, sin sal, cubos", "Vegetales", 80, 37.54, 0.76, 8.22, 0.18, 3.0),
      ],
    },
    {
      nombre: "Lentejas con arroz y ensalada de tomate",
      items: [
        item("Lenteja, germinada, cocida, sin sal", "Leguminosas", 170, 124.25, 8.8, 21.25, 0.45, 5.0),
        item("Arroz blanco grano largo, cocido", "Cereales, tubérculos y plátanos", 80, 125.96, 2.69, 28.17, 0.28, 0.4),
        item("Tomate, rojo, riñon, crudo, promedio", "Vegetales", 70, 24.3, 0.8, 4.6, 0.3, 1.2),
      ],
    },
    {
      nombre: "Res con camote y brócoli",
      items: [
        item("Res, corte aguja, (mandril para estofado), cocida", "Carnes y embutidos", 120, 191.02, 32.41, 0.0, 6.82, 0.0),
        item("Camote, con cáscara, cocido", "Cereales, tubérculos y plátanos", 90, 77.62, 1.37, 17.72, 0.14, 2.5),
        item("Brócoli, cocido, sin sal", "Vegetales", 100, 41.93, 2.38, 7.18, 0.41, 3.3),
      ],
    },
    {
      nombre: "Lomo de cerdo con vegetales y ensalada de tomate",
      items: [
        item("Cerdo, carne magra, (lomo, espaldilla y costilla), cocida", "Carnes y embutidos", 120, 201.15, 28.62, 0.0, 9.63, 0.0),
        item("Espinaca, escurrida, cocida, sin sal", "Vegetales", 100, 29.22, 2.97, 3.75, 0.26, 2.4),
        item("Tomate, rojo, riñon, crudo, promedio", "Vegetales", 70, 24.3, 0.8, 4.6, 0.3, 1.2),
      ],
    },
    {
      nombre: "Pollo con quinua y espinaca",
      items: [
        item("Pollo, pechuga, sin piel, a la parrilla, cocida", "Carnes y embutidos", 120, 143.19, 28.98, 0.0, 3.03, 0.0),
        item("Quinua, cocida", "Cereales, tubérculos y plátanos", 100, 120.08, 4.4, 21.3, 1.92, 2.8),
        item("Espinaca, escurrida, cocida, sin sal", "Vegetales", 100, 29.22, 2.97, 3.75, 0.26, 2.4),
      ],
    },
    {
      nombre: "Huevo con aguacate y ensalada de tomate",
      items: [
        item("Huevo de gallina, entero, crudo", "Carnes y embutidos", 130, 142.86, 12.58, 0.77, 9.94, 0.0),
        item("Aguacate, sin cáscara, promedio", "Frutas", 60, 174.06, 2.0, 8.53, 14.66, 6.7),
        item("Tomate, rojo, riñon, crudo, promedio", "Vegetales", 80, 24.3, 0.8, 4.6, 0.3, 1.2),
      ],
    },
  ],
  high: [
    {
      nombre: "Huevo con pan integral y espinaca",
      items: [
        item("Huevo de gallina, entero, crudo", "Carnes y embutidos", 130, 142.86, 12.58, 0.77, 9.94, 0.0),
        item("Pan, integral, de trigo", "Cereales, tubérculos y plátanos", 25, 253.55, 12.3, 43.1, 3.55, 6.0),
        item("Espinaca, escurrida, cocida, sin sal", "Vegetales", 120, 29.22, 2.97, 3.75, 0.26, 2.4),
        item("Aguacate, sin cáscara, promedio", "Frutas", 40, 174.06, 2.0, 8.53, 14.66, 6.7),
      ],
    },
    {
      nombre: "Pescado con camote y vegetales al vapor",
      items: [
        item("Tilapia, fresca, asada", "Pescados y mariscos", 150, 128.45, 26.15, 0.0, 2.65, 0.0),
        item("Camote, con cáscara, cocido", "Cereales, tubérculos y plátanos", 80, 77.62, 1.37, 17.72, 0.14, 2.5),
        item("Brócoli, cocido, sin sal", "Vegetales", 130, 41.93, 2.38, 7.18, 0.41, 3.3),
      ],
    },
    {
      nombre: "Lentejas con arroz integral y vegetales",
      items: [
        item("Lenteja, germinada, cocida, sin sal", "Leguminosas", 150, 124.25, 8.8, 21.25, 0.45, 5.0),
        item("Arroz integral, grano largo cocido", "Cereales, tubérculos y plátanos", 80, 122.01, 2.74, 25.58, 0.97, 1.6),
        item("Brócoli, cocido, sin sal", "Vegetales", 100, 41.93, 2.38, 7.18, 0.41, 3.3),
      ],
    },
    {
      nombre: "Res con vegetales al vapor",
      items: [
        item("Res, corte aguja, (mandril para estofado), cocida", "Carnes y embutidos", 110, 191.02, 32.41, 0.0, 6.82, 0.0),
        item("Brócoli, cocido, sin sal", "Vegetales", 130, 41.93, 2.38, 7.18, 0.41, 3.3),
        item("Camote, con cáscara, cocido", "Cereales, tubérculos y plátanos", 60, 77.62, 1.37, 17.72, 0.14, 2.5),
      ],
    },
    {
      nombre: "Lomo de cerdo con espinaca y aguacate",
      items: [
        item("Cerdo, carne magra, (lomo, espaldilla y costilla), cocida", "Carnes y embutidos", 110, 201.15, 28.62, 0.0, 9.63, 0.0),
        item("Espinaca, escurrida, cocida, sin sal", "Vegetales", 100, 29.22, 2.97, 3.75, 0.26, 2.4),
        item("Aguacate, sin cáscara, promedio", "Frutas", 40, 174.06, 2.0, 8.53, 14.66, 6.7),
      ],
    },
    {
      nombre: "Atún con quinua y ensalada de tomate",
      items: [
        item("Atún, en agua, enlatado, sin sal", "Pescados y mariscos", 110, 109.42, 25.51, 0.0, 0.82, 0.0),
        item("Quinua, cocida", "Cereales, tubérculos y plátanos", 90, 120.08, 4.4, 21.3, 1.92, 2.8),
        item("Tomate, rojo, riñon, crudo, promedio", "Vegetales", 70, 24.3, 0.8, 4.6, 0.3, 1.2),
      ],
    },
    {
      nombre: "Pollo con espinaca y camote",
      items: [
        item("Pollo, pechuga, sin piel, a la parrilla, cocida", "Carnes y embutidos", 110, 143.19, 28.98, 0.0, 3.03, 0.0),
        item("Espinaca, escurrida, cocida, sin sal", "Vegetales", 110, 29.22, 2.97, 3.75, 0.26, 2.4),
        item("Camote, con cáscara, cocido", "Cereales, tubérculos y plátanos", 70, 77.62, 1.37, 17.72, 0.14, 2.5),
      ],
    },
  ],
};

const SNACK: Record<RiskLevel, MealTemplate[]> = {
  low: [
    { nombre: "Manzana", items: [item("Manzana, con cáscara, importada", "Frutas", 150, 57.81, 0.26, 13.81, 0.17, 2.4)] },
    { nombre: "Yogur natural", items: [item("Yogurt, natural, leche descremada, bajo en grasa", "Lácteos", 150, 55.26, 5.73, 7.68, 0.18, 0.0)] },
    { nombre: "Naranja", items: [item("Naranja, dulce, común", "Frutas", 150, 51.84, 0.94, 11.75, 0.12, 2.4)] },
  ],
  moderate: [
    { nombre: "Pera", items: [item("Pera, importada, sin cáscara", "Frutas", 130, 64.44, 0.38, 15.46, 0.12, 3.1)] },
    { nombre: "Yogur natural", items: [item("Yogurt, natural, leche descremada, bajo en grasa", "Lácteos", 130, 55.26, 5.73, 7.68, 0.18, 0.0)] },
    { nombre: "Papaya", items: [item("Papaya, lechosa, madura, pulpa", "Frutas", 150, 42.94, 0.61, 9.81, 0.14, 1.8)] },
  ],
  high: [
    { nombre: "Papaya", items: [item("Papaya, lechosa, madura, pulpa", "Frutas", 130, 42.94, 0.61, 9.81, 0.14, 1.8)] },
    { nombre: "Pera", items: [item("Pera, importada, sin cáscara", "Frutas", 110, 64.44, 0.38, 15.46, 0.12, 3.1)] },
    { nombre: "Yogur natural (porción pequeña)", items: [item("Yogurt, natural, leche descremada, bajo en grasa", "Lácteos", 110, 55.26, 5.73, 7.68, 0.18, 0.0)] },
  ],
};

export const MEAL_STRUCTURE: { slot: MealSlot; pct: number; templates: Record<RiskLevel, MealTemplate[]> }[] = [
  { slot: "Desayuno", pct: 0.25, templates: DESAYUNO },
  { slot: "Media mañana", pct: 0.05, templates: SNACK },
  { slot: "Almuerzo", pct: 0.35, templates: ALMUERZO },
  { slot: "Media tarde", pct: 0.05, templates: SNACK },
  { slot: "Cena", pct: 0.30, templates: CENA },
];

export const RESTRICTABLE_CATEGORIES = [
  "Lácteos",
  "Pescados y mariscos",
  "Carnes y embutidos",
  "Leguminosas",
  "Cereales, tubérculos y plátanos",
  "Frutas",
  "Vegetales",
];

// Todos los ingredientes reales (ya cocidos/listos para comer, tal como
// aparecen en los platos curados de arriba) que existen para un nivel de
// riesgo, sin duplicados. El chatbot los usa para sugerir alimentos o
// sustitutos — a diferencia de lib/data/curatedFoods.ts (generado ordenando
// food_nutrition.json por fibra, sin filtrar si el alimento es algo que
// alguien comería tal cual, ej. "lenteja cruda" o "salvado de trigo crudo"),
// esto garantiza que toda sugerencia del chat sea un ingrediente que YA
// forma parte de un plato real de la app.
export function allTemplateItems(level: RiskLevel): TemplateItem[] {
  const seen = new Map<string, TemplateItem>();
  for (const slotDef of MEAL_STRUCTURE) {
    for (const template of slotDef.templates[level]) {
      for (const it of template.items) {
        if (!seen.has(it.nombre)) seen.set(it.nombre, it);
      }
    }
  }
  return [...seen.values()];
}
