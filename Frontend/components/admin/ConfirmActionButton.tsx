"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Borrar es irreversible, así que en vez de un modal (la salida perezosa)
 * el botón se convierte en su propia confirmación durante unos segundos.
 * Micro-interacción <200ms con el mismo easing que StickyPredictButton.
 */
export function ConfirmActionButton({
  onConfirm,
  label = "Borrar",
  confirmLabel = "¿Seguro? Borrar",
  className = "",
}: {
  onConfirm: () => void | Promise<void>;
  label?: string;
  confirmLabel?: string;
  className?: string;
}) {
  const [confirming, setConfirming] = useState(false);
  const [pending, setPending] = useState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
  }, []);

  async function handleClick() {
    if (!confirming) {
      setConfirming(true);
      timeoutRef.current = setTimeout(() => setConfirming(false), 3000);
      return;
    }
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    setPending(true);
    await onConfirm();
    setPending(false);
    setConfirming(false);
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={pending}
      className={`rounded-full px-3.5 py-1.5 text-xs font-semibold transition-all duration-150 ease-[cubic-bezier(0.16,1,0.3,1)] active:scale-[0.96] disabled:opacity-50 ${
        confirming ? "bg-red-600 text-white" : "bg-slate-100 text-slate-500 hover:bg-red-50 hover:text-red-600"
      } ${className}`}
    >
      {pending ? "Borrando..." : confirming ? confirmLabel : label}
    </button>
  );
}
