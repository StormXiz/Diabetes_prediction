"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

const STORAGE_KEY = "site-theme";

type ThemeContextValue = { isDark: boolean; toggle: () => void; ready: boolean };
const ThemeContext = createContext<ThemeContextValue | null>(null);

/**
 * Tema global claro/oscuro para todo el sitio público. Aplica/quita la clase
 * "dark" en <html> (ver el script inline en layout.tsx que evita el flash
 * antes de hidratar) y persiste la preferencia. /admin no lo usa — sigue
 * siempre en claro con su propio nav.
 */
export function ThemeProvider({ children }: { children: ReactNode }) {
  const [isDark, setIsDark] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setIsDark(document.documentElement.classList.contains("dark"));
    setReady(true);
  }, []);

  useEffect(() => {
    if (!ready) return;
    document.documentElement.classList.toggle("dark", isDark);
    window.localStorage.setItem(STORAGE_KEY, isDark ? "dark" : "light");
  }, [isDark, ready]);

  return (
    <ThemeContext.Provider value={{ isDark, toggle: () => setIsDark((v) => !v), ready }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme debe usarse dentro de <ThemeProvider>");
  return ctx;
}
