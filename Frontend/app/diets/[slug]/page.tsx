import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { DietDetailView } from "@/components/DietDetailView";

export default async function DietDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const supabase = await createClient();

  const { data: diet } = await supabase
    .from("diets")
    .select("id, title, description, target_risk, image_url")
    .eq("slug", slug)
    .eq("is_published", true)
    .single();

  if (!diet) notFound();

  const { data: foods } = await supabase
    .from("foods")
    .select("id, name, category, portion, notes")
    .eq("diet_id", diet.id);

  return <DietDetailView diet={diet} foods={foods ?? []} />;
}
