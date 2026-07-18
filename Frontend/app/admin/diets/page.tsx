import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { DietRow } from "@/components/admin/DietRow";
import { EmptyState } from "@/components/admin/EmptyState";

export default async function AdminDietsPage() {
  const supabase = await createClient();
  // RLS: admin ve todas las dietas (publicadas o no), no solo las públicas.
  const { data: diets } = await supabase
    .from("diets")
    .select("id, title, slug, target_risk, is_published, image_url")
    .order("target_risk");

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Dietas</h1>
          <p className="mt-1 text-slate-500">Contenido que se recomienda según el riesgo de cada resultado.</p>
        </div>
        <Link
          href="/admin/diets/new"
          className="shrink-0 rounded-full bg-gradient-to-r from-emerald-600 to-blue-600 px-6 py-3 text-center font-semibold text-white shadow-md transition-transform duration-200 ease-[cubic-bezier(0.16,1,0.3,1)] hover:scale-[1.03] active:scale-[0.97]"
        >
          Nueva dieta
        </Link>
      </div>

      {!diets || diets.length === 0 ? (
        <EmptyState
          title="Todavía no has creado ninguna dieta"
          description="Sin dietas publicadas, /result no puede recomendar nada tras una predicción. Crea la primera para cada nivel de riesgo."
          action={
            <Link
              href="/admin/diets/new"
              className="mt-1 rounded-full bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white transition-transform duration-200 ease-[cubic-bezier(0.16,1,0.3,1)] hover:scale-[1.02] active:scale-[0.97]"
            >
              Crear la primera dieta
            </Link>
          }
        />
      ) : (
        <ul className="space-y-3">
          {diets.map((diet) => (
            <DietRow key={diet.id} diet={diet} />
          ))}
        </ul>
      )}
    </div>
  );
}
