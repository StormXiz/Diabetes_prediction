import { createClient } from "@/lib/supabase/server";
import { parseDashboardStats } from "@/lib/admin";
import { DashboardStory } from "@/components/admin/DashboardStory";

export default async function AdminPage() {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("admin_dashboard_stats");

  if (error || data === null) {
    return (
      <div className="rounded-2xl border border-red-100 bg-red-50 p-6 text-center text-sm text-red-700">
        No se pudieron cargar las estadísticas del panel
        {error ? `: ${error.message}` : "."}
      </div>
    );
  }

  return <DashboardStory stats={parseDashboardStats(data)} />;
}
