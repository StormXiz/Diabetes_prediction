"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

// Debe calzar con "Email OTP length" en Supabase (Authentication > Emails >
// Confirm sign up). Si cambias ese valor en el dashboard, cambia este también.
const OTP_LENGTH = 8;

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
      <div className="w-full max-w-sm rounded-2xl border border-slate-200 bg-white p-8 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-50">Confirma tu cuenta</h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          Enviamos un código de {OTP_LENGTH} dígitos a <span className="font-medium text-slate-700 dark:text-slate-300">{email || "tu email"}</span>.
        </p>

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">Código de verificación</label>
            <input
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              maxLength={OTP_LENGTH}
              required
              value={token}
              onChange={(e) => setToken(e.target.value.replace(/\D/g, ""))}
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-3 text-center text-xl tracking-[0.35em] font-mono focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
              placeholder={"0".repeat(OTP_LENGTH)}
            />
          </div>

          {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}

          <button
            type="submit"
            disabled={loading || token.length !== OTP_LENGTH}
            className="w-full rounded-lg bg-gradient-to-r from-emerald-600 to-blue-600 py-2.5 font-semibold text-white transition hover:opacity-90 disabled:opacity-50"
          >
            {loading ? "Verificando..." : "Verificar y entrar"}
          </button>
        </form>

        <button
          onClick={handleResend}
          className="mt-4 w-full text-center text-sm font-medium text-blue-600 hover:underline dark:text-blue-400"
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
