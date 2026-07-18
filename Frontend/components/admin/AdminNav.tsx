"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const LINKS = [
  { href: "/admin", label: "Resumen" },
  { href: "/admin/diets", label: "Dietas" },
];

export function AdminNav({ email }: { email: string }) {
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-10 border-b border-slate-200 bg-white/90 backdrop-blur">
      <div className="mx-auto max-w-6xl px-4 py-3 sm:px-6 sm:py-4">
        <div className="flex items-center justify-between gap-3">
          <Link href="/admin" className="whitespace-nowrap font-semibold text-slate-900">
            Panel admin
          </Link>
          <div className="flex items-center gap-4">
            <span className="hidden text-sm text-slate-400 sm:inline">{email}</span>
            <Link href="/" className="whitespace-nowrap text-sm font-medium text-blue-600 hover:underline">
              Volver al sitio
            </Link>
          </div>
        </div>
        <nav className="mt-3 flex items-center gap-1">
          {LINKS.map((link) => {
            const active = link.href === "/admin" ? pathname === "/admin" : pathname.startsWith(link.href);
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`rounded-full px-3.5 py-1.5 text-sm font-medium transition-colors duration-150 ${
                  active ? "bg-emerald-50 text-emerald-700" : "text-slate-500 hover:text-slate-800"
                }`}
              >
                {link.label}
              </Link>
            );
          })}
        </nav>
      </div>
    </header>
  );
}
