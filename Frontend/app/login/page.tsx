"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { ForestCanvasLoader } from "@/components/three/ForestCanvasLoader";

function LoginForm() {
  const router = useRouter();
  const supabase = createClient();
  const searchParams = useSearchParams();
  const redirect = searchParams.get("redirect") ?? "/predict";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const { error } = await supabase.auth.signInWithPassword({ email, password });

    setLoading(false);
    if (error) {
      if (error.message.toLowerCase().includes("email not confirmed")) {
        router.push(`/verify-email?email=${encodeURIComponent(email)}&redirect=${redirect}`);
        return;
      }
      setError("Email o contraseña incorrectos.");
      return;
    }

    router.push(redirect);
  }

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden px-6">
      <ForestCanvasLoader className="pointer-events-none absolute inset-0 opacity-90 blur-[1px] dark:opacity-60" />
      <div className="relative w-full max-w-sm rounded-2xl border border-slate-200 bg-white/90 p-8 shadow-sm backdrop-blur-sm dark:border-slate-800 dark:bg-slate-900/90">
        <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-50">Iniciar sesión</h1>

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">Email</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">Contraseña</label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
            />
          </div>

          {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg bg-gradient-to-r from-emerald-600 to-blue-600 py-2.5 font-semibold text-white transition hover:opacity-90 disabled:opacity-50"
          >
            {loading ? "Entrando..." : "Iniciar sesión"}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-slate-500 dark:text-slate-400">
          ¿No tienes cuenta?{" "}
          <Link href="/register" className="font-semibold text-blue-600 hover:underline dark:text-blue-400">
            Regístrate
          </Link>
        </p>
      </div>
    </main>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginForm />
    </Suspense>
  );
}
