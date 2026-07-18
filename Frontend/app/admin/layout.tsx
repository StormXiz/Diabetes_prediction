import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { AdminNav } from "@/components/admin/AdminNav";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login?redirect=/admin");

  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();

  // Igual que antes: el middleware (proxy.ts) ya filtra por rol, esto es la
  // segunda capa de verificación EN SERVIDOR [PLAN_MAESTRO sec 12]. Vive en el
  // layout para cubrir automáticamente cualquier ruta nueva bajo /admin/*.
  if (profile?.role !== "admin") redirect("/");

  return (
    <div className="min-h-screen bg-white">
      <AdminNav email={user.email ?? ""} />
      <main className="mx-auto max-w-6xl px-6 py-10">{children}</main>
    </div>
  );
}
