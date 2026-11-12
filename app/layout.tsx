import type { Metadata } from "next";
import { Archivo, Atkinson_Hyperlegible_Next } from "next/font/google";
import "./globals.css";

// Archivo trae eje de ancho: los títulos van semicondensados, como la cabecera de un formulario.
const display = Archivo({ variable: "--font-display", subsets: ["latin"], axes: ["wdth"] });
const body = Atkinson_Hyperlegible_Next({ variable: "--font-body", subsets: ["latin"] });

export const metadata: Metadata = {
  title: { default: "Encuestas", template: "%s · Encuestas" },
  description: "Crea una encuesta, publícala con un enlace y descarga las respuestas. Código abierto.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="es" className={`${display.variable} ${body.variable}`}>
      <body>{children}</body>
    </html>
  );
}
