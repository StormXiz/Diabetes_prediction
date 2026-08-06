// Ilustraciones de alimentos reales (no fotos: se evaluó descargar fotos de
// internet, pero eso arriesga licencias/derechos de autor y una mezcla
// inconsistente de fondos/iluminación entre ~50 imágenes distintas — en su
// lugar, cada alimento tiene su propia silueta reconocible, no un blob
// genérico por categoría como antes. `pickIcon` primero intenta un match
// ESPECÍFICO por alimento exacto (los ~25 que arma el motor de dietas real,
// en lib/data/mealTemplates.ts) y solo cae a una categoría genérica si el
// nombre no coincide con ninguno — así cualquier alimento que un admin
// escriba a mano en la tabla `foods` sigue mostrando algo razonable.

type SpecificKey =
  | "pollo" | "res" | "cerdo" | "pescado" | "huevo" | "leguminosa"
  | "avena" | "arroz" | "quinua" | "pan" | "camote"
  | "brocoli" | "espinaca" | "zanahoria" | "tomate" | "aguacate"
  | "manzana" | "pera" | "banano" | "papaya" | "naranja"
  | "leche" | "yogur";

type CategoryKey = "vegetable" | "fruit" | "fried" | "alcohol" | "protein" | "grain" | "sugar" | "dairy" | "generic";

type IconKey = SpecificKey | CategoryKey;

// Orden importa: se evalúa de arriba a abajo, la primera coincidencia gana.
// Los alimentos reales del motor de dietas van primero (match más específico).
const SPECIFIC_KEYWORDS: [SpecificKey, string[]][] = [
  ["pollo", ["pollo", "gallina"]],
  ["res", ["res,", " res ", "carne de res", "bovino"]],
  ["cerdo", ["cerdo", "chancho", "puerco", "tocino"]],
  ["pescado", ["pescado", "tilapia", "atún", "atun", "salmón", "salmon", "trucha", "corvina", "dorado"]],
  ["huevo", ["huevo"]],
  ["leguminosa", ["lenteja", "fréjol", "frejol", "garbanzo", "haba", "arveja", "chocho"]],
  ["avena", ["avena"]],
  ["quinua", ["quinua", "quinoa"]],
  ["arroz", ["arroz", "cebada"]],
  ["pan", ["pan,", "pan integral", "pan de", "tostada"]],
  ["camote", ["camote", "papa", "yuca", "plátano", "platano"]],
  ["brocoli", ["brócoli", "brocoli", "coliflor"]],
  ["espinaca", ["espinaca", "lechuga", "acelga", "col", "verdura de hoja"]],
  ["zanahoria", ["zanahoria"]],
  ["tomate", ["tomate", "pimiento", "pimentón", "pimenton"]],
  ["aguacate", ["aguacate", "palta"]],
  ["manzana", ["manzana"]],
  ["pera", ["pera,", "pera "]],
  ["banano", ["banano", "guineo", "plátano seda"]],
  ["papaya", ["papaya", "sandía", "sandia", "melón", "melon"]],
  ["naranja", ["naranja", "mandarina", "toronja", "limón", "limon"]],
  ["leche", ["leche"]],
  ["yogur", ["yogur", "yogurt"]],
];

const CATEGORY_KEYWORDS: [CategoryKey, string[]][] = [
  ["fried", ["fritura", "frito", "papas fritas", "grasa saturada", "empanizado", "capeado", "aceite"]],
  ["alcohol", ["alcohol", "cerveza", "vino", "licor", "cóctel", "coctel", "ron", "whisky", "tequila"]],
  ["sugar", ["azúcar", "azucar", "dulce", "refresco", "soda", "gaseosa", "postre", "pastel", "galleta"]],
  ["protein", ["proteína", "proteina", "carne", "embutido"]],
  ["grain", ["cereal", "integral", "trigo"]],
  ["dairy", ["lácteo", "lacteo", "queso"]],
  ["fruit", ["fruta"]],
  ["vegetable", ["verdura", "vegetal"]],
];

export function pickIcon(name: string): IconKey {
  const n = name.toLowerCase();
  for (const [key, words] of SPECIFIC_KEYWORDS) {
    if (words.some((w) => n.includes(w))) return key;
  }
  for (const [key, words] of CATEGORY_KEYWORDS) {
    if (words.some((w) => n.includes(w))) return key;
  }
  return "generic";
}

const TONE_GLOW = {
  good: { stop: "#6ee7b7", fade: "rgba(16,185,129,0)" },
  bad: { stop: "#fca5a5", fade: "rgba(220,38,38,0)" },
} as const;

export function FoodIcon({ name, tone }: { name: string; tone: "good" | "bad" }) {
  const key = pickIcon(name);
  const glow = TONE_GLOW[tone];
  const gid = `glow-${tone}-${key}`;

  return (
    <svg width="44" height="44" viewBox="0 0 44 44" aria-hidden className="shrink-0">
      <defs>
        <radialGradient id={gid} cx="50%" cy="45%" r="60%">
          <stop offset="0%" stopColor={glow.stop} stopOpacity="0.55" />
          <stop offset="100%" stopColor={glow.fade} />
        </radialGradient>
      </defs>
      <circle cx="22" cy="22" r="21" fill={`url(#${gid})`} />
      <g transform="translate(6,6)">{ICONS[key]}</g>
    </svg>
  );
}

// Cada ilustración es una silueta reconocible del alimento real (no una
// forma abstracta por categoría), en 2-3 tonos + un highlight claro arriba-
// izquierda para dar volumen. Canvas interno de 32x32 (viewBox del padre
// menos el translate de 6,6 por lado).
const ICONS: Record<IconKey, React.ReactNode> = {
  // --- Proteínas específicas ---
  pollo: ( // muslo/pierna de pollo — silueta clásica reconocible
    <g>
      <path d="M18 3c4 0 7 3 7 7 0 5-4 8-4 12 0 3-2 5-5 5s-5-2-5-5c0-1 .5-2 1.5-2.5C10 18 9 15 9 12 9 7 13 3 18 3Z" fill="#b45309" />
      <path d="M18 3c4 0 7 3 7 7 0 4.5-3.3 7.5-4 11 .3-3.2-.8-5.7-3-6.5-3-1.1-4.3-3.8-4-6.5.4-3 2-5 4-5Z" fill="#d97706" />
      <ellipse cx="14" cy="8" rx="3.2" ry="2.2" fill="#fbbf24" opacity="0.85" />
      <path d="M16 22c-.5 2-.2 4 1 5.5" stroke="#f3e8d8" strokeWidth="2.5" strokeLinecap="round" fill="none" />
    </g>
  ),
  res: ( // corte de carne roja con veteado
    <g>
      <path d="M4 12c0-4 4-7 10-7s14 2 14 8-8 9-15 9c-5.5 0-9-4-9-10Z" fill="#9f1239" />
      <path d="M5 12c0-3.5 4-6 9-6s13 2 13 7-7.5 8-14 8c-5 0-8-3.5-8-9Z" fill="#be123c" />
      <ellipse cx="10" cy="9" rx="3.5" ry="2.2" fill="#fda4af" opacity="0.85" />
      <path d="M9 15c3 1 8 1.5 12 .5M8 19c3.5 1.3 9 1.5 13 0" stroke="#fecdd3" strokeWidth="1.4" strokeLinecap="round" opacity="0.8" fill="none" />
    </g>
  ),
  cerdo: ( // corte de cerdo, rosado, con hueso
    <g>
      <path d="M5 14c0-5 5-9 11-9s12 3 12 9-6 10-13 10c-6 0-10-4.5-10-10Z" fill="#db7093" />
      <path d="M6 14c0-4.3 4.3-7.5 9.5-7.5S27 8.5 27 14s-5.2 8.5-11.5 8.5c-5.3 0-9.5-3.8-9.5-8.5Z" fill="#f0a4b8" />
      <ellipse cx="12" cy="10.5" rx="3.5" ry="2.2" fill="#fbcfe0" opacity="0.9" />
      <circle cx="24" cy="16" r="2.6" fill="#fdf2f8" stroke="#db7093" strokeWidth="1" />
    </g>
  ),
  pescado: ( // pez con cola y aleta
    <g>
      <path d="M4 15c4-6 12-9 18-6 3 1.5 5.5 4 6.5 6.5-1 2.5-3.5 5-6.5 6.5-6 3-14 0-18-6Z" fill="#0e7490" />
      <path d="M5 15c3.5-5.2 10.8-7.8 16-5 2.6 1.4 4.7 3.4 5.5 5.5-.9 2-3 4-5.5 5.4-5.2 2.8-12.5.2-16-5Z" fill="#0891b2" />
      <path d="M28.5 15 33 10v10l-4.5-5Z" fill="#0e7490" />
      <circle cx="9" cy="13.5" r="1.4" fill="#f0fdff" />
      <ellipse cx="12" cy="11" rx="4" ry="2" fill="#67e8f9" opacity="0.7" />
    </g>
  ),
  huevo: ( // huevo con yema
    <g>
      <path d="M16 3C10 3 6 13 6 20a10 10 0 0 0 20 0c0-7-4-17-10-17Z" fill="#e2e8f0" />
      <path d="M16 4C11 4 7.5 13.5 7.5 20a8.5 8.5 0 0 0 17 0c0-6.5-3.5-16-8.5-16Z" fill="#f8fafc" />
      <circle cx="16" cy="21" r="6" fill="#f59e0b" />
      <circle cx="16" cy="21" r="4.6" fill="#fbbf24" />
      <ellipse cx="14" cy="19" rx="1.6" ry="1" fill="#fde68a" opacity="0.9" />
    </g>
  ),
  leguminosa: ( // vaina de fréjol abierta, con los granos a la vista
    <g>
      <path d="M3 20c-1-8 4-16 12-18 3.5-.8 5 1 3.5 3.5-1 1.7-1 3 .5 3.5 6 2 9 7 8 12.5-1.5 8-9 10-16 6-4.5-2.6-7.4-3.2-8-7.5Z" fill="#166534" />
      <path d="M4 19.3c-.9-7 3.6-14 10.8-15.8 2.9-.7 4.1.7 3 2.8-.9 1.5-1 2.9.4 3.5 5.4 1.9 8 6.6 7.1 11.3-1.3 7-8 8.7-14.2 5.3-4-2.3-6.4-3-7.1-7.1Z" fill="#22c55e" />
      <circle cx="11.5" cy="12.5" r="3" fill="#a16207" />
      <circle cx="17" cy="16.5" r="3.2" fill="#ca8a04" />
      <circle cx="12.5" cy="20" r="3" fill="#a16207" />
      <ellipse cx="10.3" cy="11" rx="1" ry=".6" fill="#fde68a" opacity="0.85" />
    </g>
  ),
  // --- Cereales y carbohidratos ---
  avena: ( // tazón con avena y granos
    <g>
      <path d="M4 15h24l-2 9a4 4 0 0 1-4 3H10a4 4 0 0 1-4-3l-2-9Z" fill="#a16207" />
      <ellipse cx="16" cy="15" rx="12" ry="4" fill="#eab308" />
      <ellipse cx="16" cy="14" rx="12" ry="4" fill="#fde047" />
      <circle cx="11" cy="13.5" r="1.3" fill="#fef9c3" />
      <circle cx="16" cy="12.5" r="1.3" fill="#fef9c3" />
      <circle cx="21" cy="14" r="1.3" fill="#fef9c3" />
    </g>
  ),
  arroz: ( // tazón de arroz
    <g>
      <path d="M4 15h24l-2 9a4 4 0 0 1-4 3H10a4 4 0 0 1-4-3l-2-9Z" fill="#94a3b8" />
      <ellipse cx="16" cy="15" rx="12" ry="4" fill="#f1f5f9" />
      <ellipse cx="16" cy="14" rx="12" ry="4" fill="#ffffff" />
      <ellipse cx="11" cy="13.5" rx="1.6" ry=".8" fill="#e2e8f0" />
      <ellipse cx="16.5" cy="12.7" rx="1.6" ry=".8" fill="#e2e8f0" />
      <ellipse cx="21" cy="14" rx="1.6" ry=".8" fill="#e2e8f0" />
    </g>
  ),
  quinua: ( // tazón de quinua (granos redondos claros)
    <g>
      <path d="M4 15h24l-2 9a4 4 0 0 1-4 3H10a4 4 0 0 1-4-3l-2-9Z" fill="#ca8a04" />
      <ellipse cx="16" cy="15" rx="12" ry="4" fill="#fef3c7" />
      <ellipse cx="16" cy="14" rx="12" ry="4" fill="#fffbeb" />
      <circle cx="11" cy="13.5" r="1" fill="#eab308" />
      <circle cx="15" cy="12.3" r="1" fill="#eab308" />
      <circle cx="19" cy="13.8" r="1" fill="#eab308" />
      <circle cx="22" cy="12.8" r="1" fill="#eab308" />
    </g>
  ),
  pan: ( // pan de molde integral
    <g>
      <path d="M5 14c0-6 4.5-10 11-10s11 4 11 10v9a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2v-9Z" fill="#92400e" />
      <path d="M6 15c0-5.5 4.2-9 10-9s10 3.5 10 9v7a1.5 1.5 0 0 1-1.5 1.5h-17A1.5 1.5 0 0 1 6 22v-7Z" fill="#c2703d" />
      <path d="M8 24h16M8 20.5h16" stroke="#92400e" strokeWidth="1.3" strokeLinecap="round" opacity="0.5" />
      <ellipse cx="12" cy="11" rx="3.5" ry="2" fill="#e8b384" opacity="0.8" />
    </g>
  ),
  camote: ( // tubérculo alargado
    <g>
      <path d="M5 20c-1-5 2-11 8-13 5-1.7 11 0 14 5 2.5 4.3.5 10-4 13-6 4-16.5 1-18-5Z" fill="#9a3412" />
      <path d="M6 19c-.8-4.3 1.8-9.4 7-11.2 4.4-1.5 9.5 0 12 4.3 2.1 3.7.4 8.6-3.4 11.1-5.2 3.4-14.5.9-15.6-4.2Z" fill="#c2410c" />
      <ellipse cx="11" cy="12" rx="4.5" ry="2.6" fill="#fb923c" opacity="0.75" />
    </g>
  ),
  // --- Vegetales ---
  brocoli: ( // brócoli con floretes + tallo
    <g>
      <rect x="14" y="20" width="4" height="9" rx="1.5" fill="#4d7c0f" />
      <circle cx="12" cy="14" r="6" fill="#14532d" />
      <circle cx="20" cy="14" r="6" fill="#14532d" />
      <circle cx="16" cy="10" r="7" fill="#166534" />
      <circle cx="12" cy="13.5" r="5.2" fill="#16a34a" />
      <circle cx="20" cy="13.5" r="5.2" fill="#16a34a" />
      <circle cx="16" cy="9.5" r="6" fill="#22c55e" />
      <circle cx="13.5" cy="7.5" r="2" fill="#86efac" opacity="0.8" />
    </g>
  ),
  espinaca: ( // manojo de hojas
    <g>
      <path d="M16 28c-1-8-6-11-10-16 6-1 12 2 14 9 2-7 8-10 14-9-4 5-9 8-10 16h-8Z" fill="#166534" />
      <path d="M16 27c-1-7-5.3-10-9-14.3 5.3-.7 10.4 1.9 12 8 1.6-6.1 6.7-8.7 12-8-3.7 4.3-8 7.3-9 14.3h-6Z" fill="#22c55e" />
      <path d="M16 27V13" stroke="#4d7c0f" strokeWidth="1.4" opacity="0.6" />
    </g>
  ),
  zanahoria: ( // zanahoria con hojas
    <g>
      <path d="M18 6c2-3 6-4 8-3-1 3-4 5-7 5l-1-2Z" fill="#4d7c0f" />
      <path d="M13 4c1-3 5-5 8-4-.5 3.3-3.3 6-6.5 6.3L13 4Z" fill="#65a30d" />
      <path d="M17 9c3 0 4.5 2 4 5L15 29c-.3 1.7-2.7 1.7-3 0L6 14c-.6-3 1-5 4-5h7Z" fill="#c2410c" />
      <path d="M17.3 10.3c2.4 0 3.5 1.6 3.1 3.9l-5.6 15.6c-.2 1.3-2 1.3-2.3 0L7 14.2c-.5-2.3.6-3.9 3-3.9h7.3Z" fill="#ea580c" />
      <ellipse cx="11.5" cy="13" rx="2.2" ry="4.5" fill="#fb923c" opacity="0.6" />
    </g>
  ),
  tomate: ( // tomate con cáliz de estrella
    <g>
      <circle cx="16" cy="18" r="11" fill="#991b1b" />
      <circle cx="16" cy="16.5" r="11" fill="#dc2626" />
      <ellipse cx="12" cy="12.5" rx="3.6" ry="2.4" fill="#f87171" opacity="0.85" />
      <path d="M16 5.5 17.6 8.5 21 8.8 18.4 11 19.2 14.4 16 12.6 12.8 14.4 13.6 11 11 8.8 14.4 8.5Z" fill="#4d7c0f" />
    </g>
  ),
  aguacate: ( // mitad de aguacate con pepa
    <g>
      <path d="M16 3c6.5 0 10 6.5 10 13.5S22.5 29 16 29 6 23.5 6 16.5 9.5 3 16 3Z" fill="#365314" />
      <path d="M16 4c6 0 9 6.2 9 12.7S21.6 28 16 28s-9-4.8-9-11.3S10 4 16 4Z" fill="#65a30d" />
      <path d="M16 6.5c5 0 7.3 5.4 7.3 10.6S20.6 25.5 16 25.5s-7.3-3.9-7.3-8.4S11 6.5 16 6.5Z" fill="#d9f99d" />
      <circle cx="16" cy="17.5" r="4.6" fill="#78350f" />
      <circle cx="16" cy="17.5" r="4.6" fill="#92400e" opacity="0.9" />
      <ellipse cx="14.3" cy="15.8" rx="1.4" ry="1" fill="#c2703d" opacity="0.7" />
    </g>
  ),
  // --- Frutas ---
  manzana: (
    <g>
      <circle cx="15" cy="18" r="11" fill="#b91c1c" />
      <circle cx="15" cy="16.5" r="11" fill="#ef4444" />
      <ellipse cx="11" cy="12.5" rx="3.8" ry="2.4" fill="#fca5a5" opacity="0.85" />
      <path d="M15 4c0-2 1.5-3 3-3" stroke="#4d7c0f" strokeWidth="2" strokeLinecap="round" fill="none" />
      <ellipse cx="19.5" cy="2.3" rx="3" ry="1.6" fill="#4ade80" transform="rotate(-25 19.5 2.3)" />
    </g>
  ),
  pera: ( // silueta bulbosa distinta de la manzana
    <g>
      <path d="M16 3c1.5 2 1 4.5-.5 6.5C12 12.5 10 17 10 21a8 8 0 0 0 16 0c0-4-2-8.5-5.5-11.5C19 8 18.5 5 20 3c-1.3-.8-2.7-.8-4 0Z" fill="#65a30d" />
      <path d="M16 5c1 1.7.6 3.6-.6 5.2C12.3 13 10.8 17 10.8 21a7.2 7.2 0 0 0 14.4 0c0-4-1.9-7.9-5-10.6-2.5-2.1-3.2-3.9-2.2-5.6-.7-.5-1.3-.4-2 .2Z" fill="#a3e635" />
      <ellipse cx="13.5" cy="18" rx="3" ry="4" fill="#d9f99d" opacity="0.7" />
      <rect x="15" y="1" width="2" height="4" rx="1" fill="#4d7c0f" />
    </g>
  ),
  banano: ( // curva amarilla clásica
    <g>
      <path d="M5 22c1 4 6 7 12 6 8-1.3 13-7 13.5-13.5.2-2-2-3-3-1.3-2 5.5-6.5 9.8-12 10.8-3.7.7-7-.3-9-3.5-1-1.6-3-1-1.5 1.5Z" fill="#a16207" />
      <path d="M6 21c1 3.6 5.6 6.2 11 5.2 7.3-1.3 12-6.6 12.5-12.5.1-1.3-1.1-1.9-1.8-.8-2.2 5.6-6.6 9.5-11.7 10.4-3.5.6-6.7-.4-8.6-3.3-.7-1-1.8-.4-1.4 1Z" fill="#facc15" />
      <path d="M9 23.5c2 1.6 5 2.2 8 1.5" stroke="#fef9c3" strokeWidth="1.3" strokeLinecap="round" opacity="0.8" />
      <path d="M27 8.5c1-1.5 2-1.7 3-1" stroke="#4d7c0f" strokeWidth="1.8" strokeLinecap="round" />
    </g>
  ),
  papaya: ( // óvalo alargado, pulpa naranja
    <g>
      <path d="M16 4c7 0 11 6 11 12.5S23 29 16 29 5 23 5 16.5 9 4 16 4Z" fill="#c2410c" />
      <path d="M16 5.5c6.3 0 9.8 5.4 9.8 11S22.3 27.5 16 27.5s-9.8-5.4-9.8-11S9.7 5.5 16 5.5Z" fill="#fb923c" />
      <ellipse cx="16" cy="16.5" rx="4.5" ry="3.2" fill="#fef08a" />
      <circle cx="14.5" cy="16" r=".7" fill="#78350f" />
      <circle cx="16.5" cy="17.5" r=".7" fill="#78350f" />
      <circle cx="17.8" cy="15.5" r=".7" fill="#78350f" />
      <ellipse cx="12" cy="10.5" rx="3" ry="1.8" fill="#fdba74" opacity="0.8" />
    </g>
  ),
  naranja: (
    <g>
      <circle cx="16" cy="17" r="11" fill="#c2410c" />
      <circle cx="16" cy="15.5" r="11" fill="#f97316" />
      <ellipse cx="12" cy="11.5" rx="3.6" ry="2.4" fill="#fdba74" opacity="0.85" />
      <ellipse cx="16" cy="4" rx="2.4" ry="1.6" fill="#4ade80" />
    </g>
  ),
  // --- Lácteos ---
  leche: (
    <g>
      <path d="M9 2h14l2 8v16a2 2 0 0 1-2 2H9a2 2 0 0 1-2-2V10l2-8Z" fill="#1d4ed8" />
      <path d="M9 2h14l1.6 6.5H7.4L9 2Z" fill="#3b82f6" />
      <path d="M8.5 9h15v18.5a1.5 1.5 0 0 1-1.5 1.5h-12A1.5 1.5 0 0 1 8.5 27.5V9Z" fill="#eff6ff" />
      <ellipse cx="12.5" cy="14" rx="2.6" ry="5" fill="#bfdbfe" opacity="0.8" />
    </g>
  ),
  yogur: ( // tarro más ancho que la leche, con cuchara
    <g>
      <path d="M9 5h14l1.5 7v13a2 2 0 0 1-2 2H9.5a2 2 0 0 1-2-2V12L9 5Z" fill="#7e22ce" />
      <path d="M9 5h14l1.2 5.5H7.8L9 5Z" fill="#a855f7" />
      <path d="M8.3 11h15.4v14.5a1.5 1.5 0 0 1-1.5 1.5h-12.4a1.5 1.5 0 0 1-1.5-1.5V11Z" fill="#faf5ff" />
      <ellipse cx="12" cy="15" rx="2.4" ry="4" fill="#e9d5ff" opacity="0.8" />
      <path d="M25 3c1.5 1 2 2.5 1 5l-1.5 4" stroke="#a855f7" strokeWidth="1.6" strokeLinecap="round" fill="none" />
    </g>
  ),
  // --- Categorías genéricas (fallback si no coincide un alimento específico) ---
  vegetable: (
    <g>
      <ellipse cx="15" cy="19" rx="11" ry="8" fill="#15803d" />
      <ellipse cx="15" cy="17" rx="11" ry="8" fill="#22c55e" />
      <ellipse cx="11" cy="13.5" rx="4.5" ry="3.2" fill="#86efac" opacity="0.8" />
      <rect x="13" y="1" width="3" height="9" rx="1.5" fill="#4d7c0f" />
    </g>
  ),
  fruit: (
    <g>
      <circle cx="15" cy="18" r="11" fill="#b91c1c" />
      <circle cx="15" cy="16.5" r="11" fill="#ef4444" />
      <ellipse cx="11" cy="12.5" rx="3.8" ry="2.4" fill="#fca5a5" opacity="0.85" />
      <path d="M15 4c0-2 1.5-3 3-3" stroke="#4d7c0f" strokeWidth="2" strokeLinecap="round" fill="none" />
    </g>
  ),
  fried: (
    <g>
      <rect x="2" y="11" width="24" height="17" rx="2.5" fill="#dc2626" />
      <rect x="5" y="13" width="4.5" height="15" rx="1.2" fill="#facc15" />
      <rect x="11" y="10" width="4.5" height="18" rx="1.2" fill="#fde047" />
      <rect x="17" y="12" width="4.5" height="16" rx="1.2" fill="#facc15" />
      <rect x="23" y="9" width="4.5" height="19" rx="1.2" fill="#fde047" />
    </g>
  ),
  alcohol: (
    <g>
      <path d="M10 2h8v6l3.5 4.5v16a2.2 2.2 0 0 1-2.2 2.2H8.7A2.2 2.2 0 0 1 6.5 28.5v-16L10 8V2Z" fill="#7f1d1d" />
      <path d="M10 2h8v6l3 4v3H7v-3l3-4V2Z" fill="#991b1b" />
      <rect x="6.5" y="19" width="14" height="10" rx="1.5" fill="#fca5a5" opacity="0.9" />
    </g>
  ),
  protein: (
    <g>
      <ellipse cx="15" cy="16" rx="12" ry="10" fill="#b45309" />
      <ellipse cx="15" cy="14" rx="12" ry="9" fill="#d97706" />
      <ellipse cx="10" cy="10.5" rx="4.5" ry="2.8" fill="#fbbf24" opacity="0.8" />
    </g>
  ),
  grain: (
    <g>
      <rect x="2" y="13" width="24" height="11" rx="5.5" fill="#a16207" />
      <rect x="2" y="11" width="24" height="11" rx="5.5" fill="#ca8a04" />
      <ellipse cx="10" cy="14.5" rx="5.5" ry="2.2" fill="#fde68a" opacity="0.85" />
    </g>
  ),
  sugar: (
    <g>
      <rect x="7" y="6" width="15" height="22" rx="3.2" fill="#be185d" />
      <rect x="7" y="4" width="15" height="22" rx="3.2" fill="#ec4899" />
      <rect x="10" y="1" width="9" height="4.5" rx="1.6" fill="#9d174d" />
      <ellipse cx="11.5" cy="11" rx="3.2" ry="4.3" fill="#f9a8d4" opacity="0.8" />
    </g>
  ),
  dairy: (
    <g>
      <path d="M9 2h14l2 8v16a2 2 0 0 1-2 2H9a2 2 0 0 1-2-2V10l2-8Z" fill="#1d4ed8" />
      <path d="M9 2h14l1.6 6.5H7.4L9 2Z" fill="#3b82f6" />
      <ellipse cx="12.5" cy="14" rx="3 " ry="5.5" fill="#bfdbfe" opacity="0.8" />
    </g>
  ),
  generic: (
    <g>
      <circle cx="15" cy="16" r="12" fill="#475569" />
      <circle cx="15" cy="14.5" r="12" fill="#64748b" />
      <ellipse cx="10" cy="10.5" rx="4.5" ry="3" fill="#cbd5e1" opacity="0.8" />
    </g>
  ),
};
