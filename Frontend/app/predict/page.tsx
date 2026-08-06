import Link from "next/link";

export default function PredictSelectorPage() {
  return (
    <main className="mx-auto flex min-h-screen max-w-3xl flex-col items-center justify-center px-6 py-20 text-center">
      <p className="text-sm font-semibold uppercase tracking-widest text-emerald-600 dark:text-emerald-400">
        Elige tu módulo
      </p>
      <h1 className="mt-3 text-3xl font-bold text-slate-900 dark:text-slate-50 sm:text-4xl">
        ¿Qué datos tienes a mano?
      </h1>
      <p className="mt-3 max-w-md text-slate-500 dark:text-slate-400">
        Ambos dan una estimación orientativa, no un diagnóstico. Elige según los datos que tengas.
      </p>

      <div className="mt-10 grid w-full gap-5 sm:grid-cols-2">
        <ModuleCard
          href="/predict/lifestyle"
          title="Estilo de vida"
          desc="Sin exámenes médicos: IMC, presión, hábitos, actividad física."
        />
        <ModuleCard
          href="/predict/clinical"
          title="Datos clínicos"
          desc="Con laboratorio: HbA1c y glucosa en sangre. Más preciso."
        />
      </div>

      <p className="mt-10 max-w-md text-xs text-slate-400 dark:text-slate-500">
        Esta plataforma ofrece una estimación orientativa de riesgo, no un diagnóstico médico.
        Consulta siempre a un profesional de salud.
      </p>
    </main>
  );
}

function ModuleCard({ href, title, desc }: { href: string; title: string; desc: string }) {
  return (
    <Link
      href={href}
      className="group rounded-2xl border border-slate-200 bg-white p-7 text-left shadow-sm transition-all duration-200 ease-[cubic-bezier(0.16,1,0.3,1)] hover:-translate-y-0.5 hover:border-emerald-300 hover:shadow-md dark:border-slate-800 dark:bg-slate-900 dark:hover:border-emerald-700"
    >
      <h2 className="font-semibold text-slate-900 group-hover:text-emerald-700 dark:text-slate-100 dark:group-hover:text-emerald-400">{title}</h2>
      <p className="mt-2 text-sm leading-relaxed text-slate-500 dark:text-slate-400">{desc}</p>
      <span className="mt-4 inline-block text-sm font-semibold text-blue-600 dark:text-blue-400">Empezar →</span>
    </Link>
  );
}
