import type { Metadata, Viewport } from "next";
import { Schibsted_Grotesk, Unbounded } from "next/font/google";
import { LightBeams } from "@/components/layout/LightBeams";
import { EVENT_NAME, EVENT_TAGLINE } from "@/lib/brand";
import "./globals.css";

// next/font descarga las fuentes en el build y las sirve desde nuestro dominio:
// el navegador del votante no hace ninguna petición a Google.
// Solo dos familias (CLAUDE.md §9): Unbounded para títulos, números, etiquetas,
// botones y códigos; Schibsted Grotesk para el texto.
const unbounded = Unbounded({
  variable: "--font-unbounded",
  subsets: ["latin"],
  weight: ["600", "700", "800"],
});

const schibsted = Schibsted_Grotesk({
  variable: "--font-schibsted",
  subsets: ["latin"],
  weight: ["400", "600", "700"],
  style: ["normal", "italic"],
});

export const metadata: Metadata = {
  title: {
    default: EVENT_NAME,
    template: `%s · ${EVENT_NAME}`,
  },
  description: `${EVENT_TAGLINE} para las premiaciones del grupo.`,
};

export const viewport: Viewport = {
  themeColor: "#e9e1d3",
  colorScheme: "light",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="es" className={`${unbounded.variable} ${schibsted.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col font-sans">
        <LightBeams />
        <div className="relative z-10 flex flex-1 flex-col">{children}</div>
      </body>
    </html>
  );
}
