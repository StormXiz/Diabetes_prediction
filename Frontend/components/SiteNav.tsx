"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ThemeToggle } from "@/components/ThemeToggle";
import { useTheme } from "@/components/ThemeProvider";

const LINKS = [
  { href: "/", label: "Inicio" },
  { href: "/predict", label: "Predecir" },
  { href: "/diets", label: "Dietas" },
];

/**
 * Barra de navegación global (landing, predict, result, diets). Sin login:
 * toda la app es pública, no hay rutas protegidas ni panel de admin.
 */
export function SiteNav() {
  const pathname = usePathname();
  const { isDark, toggle } = useTheme();

  return (
    <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/90 backdrop-blur transition-colors duration-200 dark:border-slate-800 dark:bg-slate-950/90">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-1 px-3 py-2.5 sm:gap-3 sm:px-6 sm:py-3">
        <Link
          href="/"
          className="shrink-0 whitespace-nowrap text-sm font-semibold text-slate-900 dark:text-slate-50 sm:text-base"
        >
          Diabetes<span className="text-emerald-600 dark:text-emerald-400">Risk</span>
        </Link>

        <nav className="flex items-center gap-0.5 sm:gap-1">
          {LINKS.map((link) => {
            const active = link.href === "/" ? pathname === "/" : pathname.startsWith(link.href);
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`whitespace-nowrap rounded-full px-2 py-1 text-xs font-medium transition-colors duration-150 sm:px-3.5 sm:py-1.5 sm:text-sm ${
                  active
                    ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400"
                    : "text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-100"
                }`}
              >
                {link.label}
              </Link>
            );
          })}
        </nav>

        <div className="flex shrink-0 items-center gap-2 sm:gap-3">
          <ThemeToggle isDark={isDark} onToggle={toggle} />
        </div>
      </div>
    </header>
  );
}
