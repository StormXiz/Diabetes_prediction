import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export default async function AdminPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login?redirect=/admin");

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  // Igual que en /predict: el middleware ya filtra, esto es la segunda capa
  // de verificación de rol EN SERVIDOR [PLAN_MAESTRO sec 12] — nunca basta
  // con esconder un botón en el cliente.
  if (profile?.role !== "admin") redirect("/");

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-4 px-6 text-center">
      <h1 className="text-2xl font-bold text-slate-900">Panel de administración</h1>
      <p className="max-w-md text-slate-600">
        CRUD de dietas/alimentos y estadísticas llegan en la Fase 7. Esta pantalla ya confirma que
        el control de rol admin funciona de verdad en el servidor.
      </p>
    </main>
  );
}
