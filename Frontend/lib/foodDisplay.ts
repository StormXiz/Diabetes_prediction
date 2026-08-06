// Los nombres en food_nutrition.json (Tabla de Composición de Alimentos de
// Ecuador 2021) siguen el formato "Alimento, descriptor1, descriptor2, ..."
// (ej. "Tilapia, fresca, asada" / "Res, corte aguja, (mandril para
// estofado), cocida") — correcto para buscar el dato nutricional exacto,
// pero verboso para mostrárselo a alguien en su plan de comidas. Esto
// recorta al nombre principal (antes de la primera coma) para MOSTRAR,
// mientras el resto del código sigue usando el nombre completo para
// emparejar el ícono correcto y las macros reales.
export function displayFoodName(fullName: string): string {
  const comma = fullName.indexOf(",");
  return (comma === -1 ? fullName : fullName.slice(0, comma)).trim();
}
