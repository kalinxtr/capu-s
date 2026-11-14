import { notFound } from "next/navigation";
import { db } from "@/lib/cloudflare";
import { leerAjustes, pedidoPorToken } from "@/lib/datos";
import { fechaCorta, pesos } from "@/lib/formato";
import { NOMBRE_ESTADO } from "@/lib/tipos";

export const metadata = { robots: { index: false } };

/** Link privado del cliente para ver su pedido (como el link de cancelación de Lavadito). */
export default async function VerPedido({ params }: PageProps<"/pedido/[token]">) {
  const { token } = await params;
  const DB = await db();
  const [p, ajustes] = await Promise.all([pedidoPorToken(DB, token), leerAjustes(DB)]);
  if (!p) notFound();

  return (
    <main className="publico">
      <header className="cabecera">
        <h1>{ajustes.nombre_local}</h1>
      </header>
      <section className="confirmacion">
        <h2>Pedido #{p.id}</h2>
        <p className={`estado estado-${p.estado}`}>{NOMBRE_ESTADO[p.estado]}</p>
        <p className="ayuda">
          {p.cliente_nombre} · {fechaCorta(p.creado)} · {p.entrega === "envio" ? `Envío a ${p.direccion}` : "Retiro en el local"}
        </p>
        <ul className="resumen">
          {p.items.map((i) => (
            <li key={i.producto_id}>
              <span>
                {i.cantidad} × {i.nombre}
              </span>
              <span>{pesos(i.precio * i.cantidad)}</span>
            </li>
          ))}
          <li className="total">
            <span>Total</span>
            <span>{pesos(p.total)}</span>
          </li>
        </ul>
        <a href="/" className="boton-secundario">
          Volver a la lista
        </a>
      </section>
    </main>
  );
}
