"use client";

import { useReducedMotion } from "motion/react";

export function PublishToggle({
  checked,
  onChange,
  disabled,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  disabled?: boolean;
}) {
  const shouldReduceMotion = useReducedMotion();

  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={`relative h-7 w-12 shrink-0 rounded-full transition-colors duration-150 disabled:opacity-50 ${
        checked ? "bg-emerald-600" : "bg-slate-200"
      }`}
    >
      <span
        className="absolute top-0.5 left-0.5 h-6 w-6 rounded-full bg-white shadow-sm"
        style={{
          transform: checked ? "translateX(20px)" : "translateX(0)",
          transition: shouldReduceMotion ? "none" : "transform 180ms cubic-bezier(0.16,1,0.3,1)",
        }}
      />
    </button>
  );
}
