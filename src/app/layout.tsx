import type { Metadata, Viewport } from "next";
import { Inter, Playfair_Display } from "next/font/google";
import { GalaBackground } from "@/components/layout/GalaBackground";
import { EVENT_NAME, EVENT_TAGLINE } from "@/lib/brand";
import "./globals.css";

// next/font descarga las fuentes en el build y las sirve desde nuestro dominio:
// el navegador del votante no hace ninguna petición a Google.
const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

const playfair = Playfair_Display({
  variable: "--font-playfair",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: EVENT_NAME,
    template: `%s · ${EVENT_NAME}`,
  },
  description: `${EVENT_TAGLINE} para las premiaciones del grupo.`,
};

export const viewport: Viewport = {
  themeColor: "#0b0e1a",
  colorScheme: "dark",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="es" className={`${inter.variable} ${playfair.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col font-sans">
        <GalaBackground />
        <div className="relative z-10 flex flex-1 flex-col">{children}</div>
      </body>
    </html>
  );
}
