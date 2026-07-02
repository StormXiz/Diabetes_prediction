"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

function VerifyEmailForm() {
  const router = useRouter();
  const supabase = createClient();
  const searchParams = useSearchParams();
  const email = searchParams.get("email") ?? "";
  const redirect = searchParams.get("redirect") ?? "/predict";

  const [token, setToken] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const { error } = await supabase.auth.verifyOtp({
      email,
      token,
      type: "signup",
    });

    setLoading(false);
    if (error) {
      setError("Código incorrecto o expirado. Revisa tu email e inténtalo de nuevo.");
      return;
    }

    router.push(redirect);
  }

  async function handleResend() {
    setError(null);
    await supabase.auth.resend({ type: "signup", email });
  }

  return (
    <main className="flex min-h-screen items-center justify-center px-6">
      <div className="w-full max-w-sm rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
        <h1 className="text-2xl font-bold text-slate-900">Confirma tu cuenta</h1>
        <p className="mt-1 text-sm text-slate-500">
          Enviamos un código de 6 dígitos a <span className="font-medium">{email || "tu email"}</span>.
        </p>

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700">Código de verificación</label>
            <input
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              maxLength={6}
              required
              value={token}
              onChange={(e) => setToken(e.target.value.replace(/\D/g, ""))}
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-3 text-center text-2xl tracking-[0.5em] font-mono focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
              placeholder="000000"
            />
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}

          <button
            type="submit"
            disabled={loading || token.length !== 6}
            className="w-full rounded-lg bg-gradient-to-r from-emerald-600 to-blue-600 py-2.5 font-semibold text-white transition hover:opacity-90 disabled:opacity-50"
          >
            {loading ? "Verificando..." : "Verificar y entrar"}
          </button>
        </form>

        <button
          onClick={handleResend}
          className="mt-4 w-full text-center text-sm font-medium text-blue-600 hover:underline"
        >
          Reenviar código
        </button>
      </div>
    </main>
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense fallback={null}>
      <VerifyEmailForm />
    </Suspense>
  );
}
