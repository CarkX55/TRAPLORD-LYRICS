import type { Metadata } from "next";
import { Outfit, Space_Grotesk } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";

const outfit = Outfit({
  variable: "--font-outfit",
  subsets: ["latin"],
  weight: ["300", "400", "500", "700", "800"],
});

const spaceGrotesk = Space_Grotesk({
  variable: "--font-space-grotesk",
  subsets: ["latin"],
  weight: ["300", "400", "500", "700"],
});

export const metadata: Metadata = {
  title: "TrapGhost — Generador de Letras de Trap con Sabor",
  description: "Crea letras de trap con el estilo exacto de cada artista. Controla el ratio Spanglish con precisión matemática y verificación en tiempo real.",
  keywords: ["trap", "letras", "spanglish", "ghostwriter", "rap", "AI", "generador"],
  authors: [{ name: "TrapGhost" }],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" suppressHydrationWarning className="dark">
      <body
        className={`${outfit.variable} ${spaceGrotesk.variable} antialiased bg-background text-foreground min-h-screen flex flex-col`}
      >
        {children}
        <Toaster />
      </body>
    </html>
  );
}
