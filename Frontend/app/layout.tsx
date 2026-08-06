import type { Metadata } from "next";
import { Figtree } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/components/ThemeProvider";
import { SiteNav } from "@/components/SiteNav";
import { FloatingChatWidget } from "@/components/FloatingChatWidget";

const figtree = Figtree({
  subsets: ["latin"],
  variable: "--font-figtree",
  display: "swap",
});

export const metadata: Metadata = {
  title: "DiabetesRisk — Orientación sobre riesgo de diabetes tipo 2",
  description:
    "Estima tu riesgo de diabetes tipo 2 con Machine Learning. Herramienta de orientación, no un diagnóstico médico.",
};

// Se ejecuta antes de que React hidrate, para que <html> ya tenga la clase
// "dark" correcta desde el primer pintado (sin flash de tema equivocado).
// /admin nunca guarda "dark" en localStorage (su UI no expone el toggle),
// así que esto no le afecta en la práctica.
const THEME_INIT_SCRIPT = `
try {
  if (localStorage.getItem('site-theme') === 'dark') {
    document.documentElement.classList.add('dark');
  }
} catch (e) {}
`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" suppressHydrationWarning className={figtree.variable}>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
      </head>
      <body className="min-h-screen bg-white font-sans text-slate-900 antialiased transition-colors duration-200 dark:bg-slate-950 dark:text-slate-100">
        <ThemeProvider>
          <SiteNav />
          {children}
          <FloatingChatWidget />
        </ThemeProvider>
      </body>
    </html>
  );
}
