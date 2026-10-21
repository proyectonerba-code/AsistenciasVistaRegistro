import type { Metadata, Viewport } from "next";
import { Inter, JetBrains_Mono, Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";

const jakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-jakarta",
  display: "swap",
});

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

const mono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
  display: "swap",
});

export const metadata: Metadata = {
  title: "NerWork · Control de Asistencia",
  description:
    "Registro de entrada y salida con verificación de ubicación. Sistema de control de asistencia NerWork.",
  robots: { index: false, follow: false },
  applicationName: "NerWork",
  appleWebApp: {
    capable: true,
    title: "NerWork",
    statusBarStyle: "default",
  },
  formatDetection: { telephone: false },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: "#DC2626",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es-MX" className={`${jakarta.variable} ${inter.variable} ${mono.variable}`}>
      <body className="min-h-screen antialiased">{children}</body>
    </html>
  );
}
