import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { DietEditor } from "@/components/admin/DietEditor";

export default async function EditDietPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: diet } = await supabase
    .from("diets")
    .select("id, title, slug, description, target_risk, is_published, image_url")
    .eq("id", id)
    .single();

  if (!diet) notFound();

  const { data: foods } = await supabase
    .from("foods")
    .select("id, name, category, portion, notes")
    .eq("diet_id", id);

  return (
    <div className="space-y-6">
      <div>
        <Link href="/admin/diets" className="text-sm font-medium text-blue-600 hover:underline">
          ← Todas las dietas
        </Link>
        <h1 className="mt-3 text-2xl font-bold text-slate-900">Editar dieta</h1>
      </div>
      <DietEditor mode="edit" diet={diet} foods={foods ?? []} />
    </div>
  );
}
