import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export default async function PredictPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // El middleware ya bloquea esto sin sesión; este check es la segunda capa
  // (defensa en profundidad) por si algún día cambia el matcher.
  if (!user) redirect("/login?redirect=/predict");

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-4 px-6 text-center">
      <h1 className="text-2xl font-bold text-slate-900">Sesión verificada ✓</h1>
      <p className="max-w-md text-slate-600">
        Aquí irán los formularios de los dos módulos de predicción (Fase 6): estilo de vida y
        clínico, conectados a la API FastAPI ya desplegada.
      </p>
      <p className="max-w-md text-xs text-slate-400">
        Esta plataforma ofrece una estimación orientativa de riesgo, no un diagnóstico médico.
      </p>
    </main>
  );
}
