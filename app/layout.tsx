import type { Metadata, Viewport } from "next";
import { Fraunces } from "next/font/google";
import "./globals.css";

// Solo para títulos. Se baja en el build y se sirve como archivo estático (no suma peso al Worker).
const fraunces = Fraunces({
  subsets: ["latin"],
  weight: "600",
  display: "swap",
  variable: "--fuente-fraunces",
  fallback: ["Georgia", "serif"],
});

// Sin D1 acá: el layout raíz también envuelve páginas que Next prerenderiza en el build.
export const metadata: Metadata = {
  title: { default: "Capu's", template: "%s · Capu's" },
  description: "Pizzas: mirá qué hay y hacé tu pedido.",
  icons: { icon: [{ url: "/favicon.ico", sizes: "48x48" }, { url: "/icon.svg", type: "image/svg+xml" }], apple: "/apple-touch-icon.png" },
  twitter: { card: "summary_large_image" },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  colorScheme: "light dark",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#fff7ef" },
    { media: "(prefers-color-scheme: dark)", color: "#1c1310" },
  ],
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="es-AR" className={fraunces.variable}>
      <body>{children}</body>
    </html>
  );
}
