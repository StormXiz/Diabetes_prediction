// Iconos ilustrados con sombreado tipo "3D suave" (gradientes + sombra
// difusa), no modelos 3D reales — evita meter three.js para 9 iconos.
// `pickIcon` mapea el nombre del alimento (texto libre, lo escribe el admin)
// a la ilustración más parecida; si no reconoce nada, cae en un ícono
// genérico de plato/hoja.

type IconKey = "vegetable" | "fruit" | "fried" | "alcohol" | "protein" | "grain" | "sugar" | "dairy" | "generic";

const KEYWORDS: Record<Exclude<IconKey, "generic">, string[]> = {
  vegetable: ["verdura", "vegetal", "brócoli", "brocoli", "espinaca", "lechuga", "pimiento", "zanahoria", "acelga", "apio"],
  fruit: ["fruta", "manzana", "naranja", "plátano", "platano", "fresa", "pera", "uva", "mandarina", "kiwi"],
  fried: ["fritura", "frito", "papas fritas", "grasa saturada", "empanizado", "capeado", "aceite"],
  alcohol: ["alcohol", "cerveza", "vino", "licor", "cóctel", "coctel", "ron", "whisky", "tequila"],
  protein: ["pescado", "pollo", "carne", "proteína", "proteina", "huevo", "atún", "atun", "pavo", "salmón", "salmon"],
  grain: ["pan integral", "pan", "arroz", "cereal", "avena", "quinoa", "integral"],
  sugar: ["azúcar", "azucar", "dulce", "refresco", "soda", "gaseosa", "postre", "pastel", "galleta"],
  dairy: ["lácteo", "lacteo", "leche", "queso", "yogur", "yogurt"],
};

export function pickIcon(name: string): IconKey {
  const n = name.toLowerCase();
  for (const [key, words] of Object.entries(KEYWORDS) as [Exclude<IconKey, "generic">, string[]][]) {
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
      <g transform="translate(9,9)">{ICONS[key]}</g>
    </svg>
  );
}

// Cada ilustración usa 2-3 tonos + un highlight claro para simular volumen
// (luz arriba-izquierda), en vez de un solo color plano.
const ICONS: Record<IconKey, React.ReactNode> = {
  vegetable: (
    <g>
      <ellipse cx="13" cy="17" rx="10" ry="7.5" fill="#15803d" />
      <ellipse cx="13" cy="15.5" rx="10" ry="7.5" fill="#22c55e" />
      <ellipse cx="10" cy="12.5" rx="4" ry="3" fill="#86efac" opacity="0.8" />
      <rect x="11.5" y="1" width="3" height="8" rx="1.5" fill="#4d7c0f" />
    </g>
  ),
  fruit: (
    <g>
      <circle cx="13" cy="16" r="10" fill="#b91c1c" />
      <circle cx="13" cy="14.5" r="10" fill="#ef4444" />
      <circle cx="9.5" cy="10.5" r="3.5" fill="#fca5a5" opacity="0.85" />
      <path d="M13 4c0-2 1.5-3 3-3" stroke="#4d7c0f" strokeWidth="2" strokeLinecap="round" fill="none" />
      <ellipse cx="17" cy="2" rx="3" ry="1.6" fill="#4ade80" transform="rotate(-25 17 2)" />
    </g>
  ),
  fried: (
    <g>
      <rect x="2" y="10" width="22" height="16" rx="2" fill="#dc2626" />
      <rect x="4" y="12" width="4" height="14" rx="1" fill="#facc15" />
      <rect x="9" y="9" width="4" height="17" rx="1" fill="#fde047" />
      <rect x="14" y="11" width="4" height="15" rx="1" fill="#facc15" />
      <rect x="19" y="8" width="4" height="18" rx="1" fill="#fde047" />
    </g>
  ),
  alcohol: (
    <g>
      <path d="M9 2h6v5l3 4v15a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2V11l3-4V2Z" fill="#7f1d1d" />
      <path d="M9 2h6v5l3 4v3H6v-3l3-4V2Z" fill="#991b1b" />
      <rect x="6" y="17" width="12" height="9" rx="1.5" fill="#fca5a5" opacity="0.9" />
      <rect x="8" y="2" width="4" height="4" fill="#57534e" />
    </g>
  ),
  protein: (
    <g>
      <ellipse cx="13" cy="15" rx="11" ry="9" fill="#b45309" />
      <ellipse cx="13" cy="13.5" rx="11" ry="8" fill="#d97706" />
      <ellipse cx="9" cy="10" rx="4" ry="2.5" fill="#fbbf24" opacity="0.8" />
    </g>
  ),
  grain: (
    <g>
      <rect x="2" y="12" width="22" height="10" rx="5" fill="#a16207" />
      <rect x="2" y="10" width="22" height="10" rx="5" fill="#ca8a04" />
      <ellipse cx="9" cy="13" rx="5" ry="2" fill="#fde68a" opacity="0.85" />
    </g>
  ),
  sugar: (
    <g>
      <rect x="6" y="6" width="14" height="20" rx="3" fill="#be185d" />
      <rect x="6" y="4" width="14" height="20" rx="3" fill="#ec4899" />
      <rect x="9" y="1" width="8" height="4" rx="1.5" fill="#9d174d" />
      <ellipse cx="10" cy="10" rx="3" ry="4" fill="#f9a8d4" opacity="0.8" />
    </g>
  ),
  dairy: (
    <g>
      <path d="M9 2h8l1 6v16a2 2 0 0 1-2 2h-6a2 2 0 0 1-2-2V8l1-6Z" fill="#1d4ed8" />
      <path d="M9 2h8l1 6H8l1-6Z" fill="#3b82f6" />
      <ellipse cx="11" cy="14" rx="3.5" ry="6" fill="#bfdbfe" opacity="0.8" />
    </g>
  ),
  generic: (
    <g>
      <circle cx="13" cy="14" r="11" fill="#475569" />
      <circle cx="13" cy="12.5" r="11" fill="#64748b" />
      <ellipse cx="9" cy="9" rx="4" ry="2.6" fill="#cbd5e1" opacity="0.8" />
    </g>
  ),
};
