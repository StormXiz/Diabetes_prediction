"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { ForestCanvasLoader } from "@/components/three/ForestCanvasLoader";
import { FactTicker } from "@/components/FactTicker";

function LoginForm() {
  const router = useRouter();
  const supabase = createClient();
  const searchParams = useSearchParams();
  const redirect = searchParams.get("redirect") ?? "/predict";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
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
    <main className="grid min-h-screen lg:grid-cols-2">
      <aside className="relative hidden overflow-hidden bg-slate-950 lg:block">
        <ForestCanvasLoader className="pointer-events-none absolute inset-0 opacity-80" />
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-tr from-emerald-950/60 via-slate-950/40 to-blue-950/60" />
        <div className="relative flex h-full flex-col justify-between p-12">
          <Link href="/" className="text-lg font-bold text-white">
            Diabetes<span className="text-emerald-400">Risk</span>
          </Link>
          <div>
            <h2 className="max-w-sm text-3xl font-bold leading-tight text-white">
              Conoce tu riesgo. Cambia tu rumbo.
            </h2>
            <div className="mt-4 max-w-sm">
              <FactTicker />
            </div>
            <ul className="mt-8 space-y-3">
              {[
                "Predicción por estilo de vida o datos clínicos",
                "Dietas según tu nivel de riesgo",
                "Asistente que te acompaña paso a paso",
              ].map((t) => (
                <li key={t} className="flex items-center gap-3 text-sm text-white/80">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#34d399" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                    <path d="M20 6 9 17l-5-5" />
                  </svg>
                  {t}
                </li>
              ))}
            </ul>
          </div>
          <p className="text-xs text-white/40">Orientación, no diagnóstico médico.</p>
        </div>
      </aside>

      <div className="flex items-center justify-center px-6 py-16 dark:bg-slate-950">
        <div className="w-full max-w-sm">
          <Link href="/" className="mb-8 inline-block text-lg font-bold text-slate-900 dark:text-white lg:hidden">
            Diabetes<span className="text-emerald-600 dark:text-emerald-400">Risk</span>
          </Link>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-50">Bienvenido de vuelta</h1>
          <p className="mt-2 text-slate-500 dark:text-slate-400">Inicia sesión para continuar.</p>

          <form onSubmit={handleSubmit} className="mt-8 space-y-5">
            <Field label="Email">
              <input
                type="email"
                required
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="tu@email.com"
                className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 placeholder:text-slate-400 transition-colors focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
              />
            </Field>
            <Field label="Contraseña">
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 pr-11 text-sm text-slate-900 placeholder:text-slate-400 transition-colors focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((s) => !s)}
                  aria-label={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
                  className="absolute right-3 top-1/2 -translate-y-1/2 cursor-pointer text-slate-400 transition-colors hover:text-slate-600 dark:hover:text-slate-200"
                >
                  {showPassword ? <EyeOff /> : <Eye />}
                </button>
              </div>
            </Field>

            {error && (
              <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600 dark:bg-red-950/40 dark:text-red-400">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full cursor-pointer rounded-xl bg-gradient-to-r from-emerald-600 to-blue-600 py-3 font-semibold text-white shadow-md transition-transform duration-200 ease-[cubic-bezier(0.16,1,0.3,1)] hover:scale-[1.01] active:scale-[0.98] disabled:opacity-50 disabled:hover:scale-100"
            >
              {loading ? "Entrando…" : "Iniciar sesión"}
            </button>
          </form>

          <p className="mt-8 text-center text-sm text-slate-500 dark:text-slate-400">
            ¿No tienes cuenta?{" "}
            <Link href="/register" className="font-semibold text-emerald-600 hover:underline dark:text-emerald-400">
              Regístrate
            </Link>
          </p>
        </div>
      </div>
    </main>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">{label}</span>
      {children}
    </label>
  );
}

function Eye() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

function EyeOff() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M9.88 9.88a3 3 0 1 0 4.24 4.24" />
      <path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68" />
      <path d="M6.61 6.61A13.526 13.526 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61" />
      <line x1="2" x2="22" y1="2" y2="22" />
    </svg>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginForm />
    </Suspense>
  );
}
