import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "La Paletería",
  description: "Paletas heladas: mirá qué hay y hacé tu pedido.",
};

export const viewport: Viewport = { themeColor: "#fff7ef", width: "device-width", initialScale: 1 };

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="es-AR">
      <body>{children}</body>
    </html>
  );
}
