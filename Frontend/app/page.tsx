import Link from "next/link";
import { Reveal } from "@/components/Reveal";
import { StickyPredictButton } from "@/components/StickyPredictButton";

const RISK_FACTORS = [
  { title: "Sobrepeso / obesidad", desc: "Un IMC elevado es el factor de riesgo modificable más estudiado." },
  { title: "Sedentarismo", desc: "La falta de actividad física reduce la sensibilidad a la insulina." },
  { title: "Dieta poco saludable", desc: "Exceso de azúcares y ultraprocesados, pocas fibras y vegetales." },
  { title: "Hipertensión", desc: "La presión alta y la diabetes suelen aparecer juntas." },
  { title: "Colesterol alto", desc: "Otro marcador metabólico que eleva el riesgo cardiovascular asociado." },
  { title: "Edad y antecedentes familiares", desc: "El riesgo aumenta con la edad y si hay casos en la familia." },
];

const AFFECTATIONS = [
  { title: "Visión", desc: "El exceso de glucosa sostenido puede afectar los vasos de la retina." },
  { title: "Riñones", desc: "Los riñones filtran la sangre constantemente; el exceso de glucosa los sobrecarga." },
  { title: "Corazón", desc: "La diabetes eleva el riesgo cardiovascular junto a hipertensión y colesterol." },
  { title: "Nervios", desc: "La glucosa alta y sostenida puede afectar la sensibilidad, sobre todo en pies y manos." },
];

export default function Home() {
  return (
    <main className="overflow-x-hidden bg-white">
      <StickyPredictButton />

      {/* 1. HERO */}
      <section className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden px-6 text-center">
        <div
          aria-hidden
          className="pointer-events-none absolute -top-32 left-1/2 h-[560px] w-[560px] -translate-x-1/2 rounded-full bg-gradient-to-br from-emerald-100 via-blue-100 to-transparent blur-3xl"
        />
        <p className="relative text-sm font-semibold uppercase tracking-[0.3em] text-emerald-600">
          Orientación · Machine Learning · Prevención
        </p>
        <h1 className="relative mt-4 text-6xl font-extrabold tracking-tight text-slate-900 sm:text-8xl">
          Diabetes
        </h1>
        <p className="relative mt-6 max-w-xl text-lg text-slate-600">
          Entiende tus factores de riesgo de diabetes tipo 2 y recibe una estimación orientativa,
          en minutos.
        </p>
        <div className="relative mt-10 flex flex-wrap items-center justify-center gap-3">
          <Link
            href="/predict"
            className="rounded-full bg-gradient-to-r from-emerald-600 to-blue-600 px-7 py-3.5 font-semibold text-white shadow-md transition-transform duration-200 ease-[cubic-bezier(0.16,1,0.3,1)] hover:scale-[1.03] active:scale-[0.97]"
          >
            Predecir mi riesgo
          </Link>
          <Link
            href="#que-es"
            className="rounded-full border border-slate-300 px-7 py-3.5 font-semibold text-slate-700 transition-colors hover:bg-slate-50"
          >
            Saber más
          </Link>
        </div>

        <div className="absolute bottom-10 flex flex-col items-center gap-2 text-slate-400">
          <span className="text-xs uppercase tracking-widest">Desplázate</span>
          <svg width="20" height="28" viewBox="0 0 20 28" fill="none" className="animate-bounce">
            <rect x="1" y="1" width="18" height="26" rx="9" stroke="currentColor" strokeWidth="1.5" />
            <circle cx="10" cy="9" r="2.5" fill="currentColor" />
          </svg>
        </div>
      </section>

      {/* 2. QUÉ ES LA DIABETES */}
      <section id="que-es" className="mx-auto max-w-4xl px-6 py-28">
        <Reveal>
          <p className="text-sm font-semibold uppercase tracking-widest text-blue-600">
            01 · Lo básico
          </p>
          <h2 className="mt-3 text-3xl font-bold text-slate-900 sm:text-4xl">
            ¿Qué es la diabetes tipo 2?
          </h2>
        </Reveal>
        <Reveal delay={0.1} className="mt-6">
          <p className="text-lg leading-relaxed text-slate-600">
            El cuerpo usa una hormona llamada <strong className="text-slate-800">insulina</strong>{" "}
            para ayudar a que la glucosa (el azúcar de la sangre) entre a las células y se use como
            energía. En la diabetes tipo 2, el cuerpo deja de responder bien a la insulina —o no
            produce suficiente— y la glucosa se acumula en la sangre en vez de entrar a las
            células.
          </p>
        </Reveal>
      </section>

      {/* 3. CÓMO SE DESARROLLA */}
      <section className="bg-gradient-to-b from-slate-50 to-white px-6 py-28">
        <div className="mx-auto grid max-w-5xl items-center gap-12 lg:grid-cols-2">
          <div>
            <Reveal>
              <p className="text-sm font-semibold uppercase tracking-widest text-emerald-600">
                02 · El mecanismo
              </p>
              <h2 className="mt-3 text-3xl font-bold text-slate-900 sm:text-4xl">
                ¿Cómo se desarrolla?
              </h2>
            </Reveal>
            <Reveal delay={0.1} className="mt-6 space-y-4 text-lg leading-relaxed text-slate-600">
              <p>
                Con el tiempo, las células empiezan a "ignorar" cada vez más a la insulina —esto se
                llama <strong className="text-slate-800">resistencia a la insulina</strong>. El
                páncreas intenta compensar produciendo más, hasta que ya no puede seguir el ritmo.
              </p>
              <p>
                Ese proceso suele ser gradual y silencioso: puede pasar por una etapa de{" "}
                <strong className="text-slate-800">prediabetes</strong> —glucosa más alta de lo
                normal, pero aún no en rango diabético— antes de convertirse en diabetes tipo 2.
              </p>
            </Reveal>
          </div>

          <Reveal delay={0.15}>
            <GlucoseDiagram />
          </Reveal>
        </div>
      </section>

      {/* 4. FACTORES DE RIESGO / CONCIENTIZACIÓN */}
      <section className="mx-auto max-w-5xl px-6 py-28">
        <Reveal className="text-center">
          <p className="text-sm font-semibold uppercase tracking-widest text-blue-600">
            03 · Concientización
          </p>
          <h2 className="mt-3 text-3xl font-bold text-slate-900 sm:text-4xl">
            Factores de riesgo que sí puedes influir
          </h2>
        </Reveal>

        {/* Tabaco y alcohol: tratamiento especial pedido en el plan */}
        <div className="mt-14 grid gap-6 sm:grid-cols-2">
          <Reveal delay={0.05}>
            <AwarenessCard
              icon={<CigaretteIcon />}
              title="Tabaco"
              text="Fumar empeora la resistencia a la insulina y suma riesgo cardiovascular al de la diabetes."
            />
          </Reveal>
          <Reveal delay={0.1}>
            <AwarenessCard
              icon={<BottleIcon />}
              title="Alcohol en exceso"
              text="El consumo excesivo y frecuente de alcohol dificulta el control del azúcar en sangre."
            />
          </Reveal>
        </div>

        <div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {RISK_FACTORS.map((f, i) => (
            <Reveal key={f.title} delay={0.05 * i}>
              <div className="h-full rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                <h3 className="font-semibold text-slate-900">{f.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-slate-500">{f.desc}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      {/* 5. AFECTACIONES */}
      <section className="bg-slate-50 px-6 py-28">
        <div className="mx-auto max-w-5xl">
          <Reveal className="text-center">
            <p className="text-sm font-semibold uppercase tracking-widest text-emerald-600">
              04 · Por qué importa
            </p>
            <h2 className="mt-3 text-3xl font-bold text-slate-900 sm:text-4xl">
              Qué puede afectar si no se controla
            </h2>
            <p className="mx-auto mt-4 max-w-2xl text-slate-600">
              No para alarmar, sino para explicar por qué vale la pena conocer tu riesgo a tiempo.
            </p>
          </Reveal>

          <div className="mt-14 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {AFFECTATIONS.map((a, i) => (
              <Reveal key={a.title} delay={0.06 * i}>
                <div className="h-full rounded-2xl bg-white p-6 text-center shadow-sm">
                  <h3 className="font-semibold text-slate-900">{a.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-slate-500">{a.desc}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* 6. DISCLAIMER + CTA FINAL */}
      <section className="px-6 py-28">
        <Reveal className="mx-auto max-w-2xl rounded-3xl border border-emerald-100 bg-gradient-to-br from-emerald-50 to-blue-50 p-10 text-center">
          <p className="text-lg font-semibold text-slate-800">
            No somos un diagnóstico. Somos una herramienta de orientación.
          </p>
          <p className="mt-2 text-slate-600">
            Consulta siempre a un profesional de salud para cualquier decisión médica.
          </p>
          <Link
            href="/predict"
            className="mt-8 inline-block rounded-full bg-gradient-to-r from-emerald-600 to-blue-600 px-8 py-4 font-semibold text-white shadow-md transition-transform duration-200 ease-[cubic-bezier(0.16,1,0.3,1)] hover:scale-[1.03] active:scale-[0.97]"
          >
            Predecir mi riesgo
          </Link>
        </Reveal>
      </section>
    </main>
  );
}

function AwarenessCard({ icon, title, text }: { icon: React.ReactNode; title: string; text: string }) {
  return (
    <div className="flex items-center gap-5 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="relative flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-red-50 text-red-500">
        {icon}
      </div>
      <div>
        <h3 className="font-semibold text-slate-900">{title}</h3>
        <p className="mt-1 text-sm leading-relaxed text-slate-500">{text}</p>
      </div>
    </div>
  );
}

function CigaretteIcon() {
  return (
    <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
      <rect x="3" y="12" width="18" height="5" rx="1" stroke="currentColor" strokeWidth="1.6" />
      <rect x="21" y="12" width="4" height="5" rx="1" fill="currentColor" opacity="0.5" />
      <line x1="2" y1="24" x2="24" y2="4" stroke="currentColor" strokeWidth="1.8" />
    </svg>
  );
}

function BottleIcon() {
  return (
    <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
      <path
        d="M11 2h6v4l2 3v14a2 2 0 0 1-2 2h-6a2 2 0 0 1-2-2V9l2-3V2Z"
        stroke="currentColor"
        strokeWidth="1.6"
      />
      <line x1="9" y1="13" x2="19" y2="13" stroke="currentColor" strokeWidth="1.4" />
      <line x1="2" y1="24" x2="24" y2="4" stroke="currentColor" strokeWidth="1.8" />
    </svg>
  );
}

function GlucoseDiagram() {
  // Ilustración propia (SVG + CSS), sin activos externos: 3 "moléculas" de
  // glucosa intentando entrar a una célula bloqueada por resistencia a la
  // insulina. Sustituye a los activos de Higgsfield mientras no se generen.
  return (
    <div className="relative mx-auto aspect-square w-full max-w-sm rounded-[2.5rem] bg-gradient-to-br from-emerald-50 to-blue-50 p-10">
      <svg viewBox="0 0 200 200" className="h-full w-full">
        <circle cx="100" cy="100" r="55" fill="white" stroke="#0891b2" strokeWidth="2" />
        <text x="100" y="105" textAnchor="middle" fontSize="11" fill="#0f172a" fontWeight="600">
          célula
        </text>
        {[
          [30, 40],
          [170, 50],
          [25, 150],
          [175, 155],
        ].map(([cx, cy], i) => (
          <g key={i}>
            <circle cx={cx} cy={cy} r="12" fill="#059669" opacity="0.85" />
            <text x={cx} y={cy + 4} textAnchor="middle" fontSize="9" fill="white" fontWeight="700">
              G
            </text>
          </g>
        ))}
        <circle cx="100" cy="100" r="55" fill="none" stroke="#dc2626" strokeWidth="2" strokeDasharray="6 6" />
      </svg>
      <p className="mt-2 text-center text-xs text-slate-500">
        Glucosa (G) acumulándose fuera de la célula por resistencia a la insulina.
      </p>
    </div>
  );
}
