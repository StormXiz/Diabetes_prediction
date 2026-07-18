import { createClient } from "@/lib/supabase/server";
import { DietsGalleryView } from "@/components/DietsGalleryView";

export default async function DietsPage() {
  const supabase = await createClient();
  // Pública: RLS permite SELECT de las dietas con is_published=true sin sesión.
  const { data: diets } = await supabase
    .from("diets")
    .select("id, title, slug, description, target_risk, image_url")
    .eq("is_published", true)
    .order("target_risk");

  return <DietsGalleryView diets={diets ?? []} />;
}
