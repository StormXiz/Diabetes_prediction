// Cliente Supabase para Client Components (navegador).
// Usa la anon/publishable key: es pública a propósito, la seguridad real la
// da el RLS de Postgres [PLAN_MAESTRO sec 12], no el secreto de esta clave.
import { createBrowserClient } from "@supabase/ssr";
import type { Database } from "./database.types";

export function createClient() {
  return createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
