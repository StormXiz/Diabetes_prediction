import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "DiabetesRisk — Orientación sobre riesgo de diabetes tipo 2",
  description:
    "Estima tu riesgo de diabetes tipo 2 con Machine Learning. Herramienta de orientación, no un diagnóstico médico.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body className="min-h-screen antialiased">{children}</body>
    </html>
  );
}
