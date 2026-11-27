import type { Metadata, Viewport } from "next";
import { headers } from "next/headers";
import { connection } from "next/server";
import { db } from "@/lib/cloudflare";
import { ajustesActuales, leerCatalogo } from "@/lib/datos";
import { origenSitio } from "@/lib/formato";
import { LogoCapus } from "./LogoCapus";
import { Pedir } from "./Pedir";

// La página de pedidos es siempre oscura (fondo de logos): la barra del navegador, igual.
export const viewport: Viewport = { colorScheme: "dark", themeColor: "#0e0907" };

export async function generateMetadata(): Promise<Metadata> {
  await connection();
  const [a, h] = await Promise.all([ajustesActuales(), headers()]);
  return {
    metadataBase: new URL(origenSitio(h.get("host"))),
    title: { absolute: a.nombre_local },
    description: "Pizzas: mirá qué hay y hacé tu pedido.",
    openGraph: {
      title: a.nombre_local,
      description: "Mirá qué hay y hacé tu pedido.",
      images: [{ url: "/og.png", width: 1200, height: 630, alt: a.nombre_local }],
      locale: "es_AR",
      type: "website",
    },
  };
}

export default async function Inicio() {
  await connection(); // el stock cambia todo el tiempo: siempre se lee de la base
  const [{ sabores, productos }, ajustes] = await Promise.all([leerCatalogo(await db()), ajustesActuales()]);
  const secciones = sabores
    .map((s) => ({ id: s.id, nombre: s.nombre, productos: productos.filter((p) => p.sabor_id === s.id) }))
    .filter((s) => s.productos.length > 0);

  return (
    <main className="publico con-fondo">
      <header className="cabecera cabecera-logo">
        <h1>
          <LogoCapus ancho={260} alt={ajustes.nombre_local} prioridad />
        </h1>
        <p className="bajada">Elegí cuántas querés, hacé tu pedido y coordinamos por WhatsApp.</p>
        {ajustes.texto_retiro && (
          <p className="retiro">
            <strong>Retiro:</strong> {ajustes.texto_retiro}
          </p>
        )}
      </header>
      {secciones.length === 0 ? (
        <p className="vacio">Por ahora no hay pizzas cargadas. Volvé más tarde.</p>
      ) : (
        <Pedir
          secciones={secciones.map((s) => ({
            ...s,
            // La prueba de humo lee estas claves, en este orden, del payload de la página.
            productos: s.productos.map((p) => ({ id: p.id, nombre: p.nombre, precio: p.precio, stock: p.stock, imagen: p.imagen })),
          }))}
          textoRetiro={ajustes.texto_retiro}
        />
      )}
    </main>
  );
}
