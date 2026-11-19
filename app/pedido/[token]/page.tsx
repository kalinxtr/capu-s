import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ajustesActuales, pedidoDelToken, type PedidoConItems } from "@/lib/datos";
import { fechaCorta, linkWhatsApp, pesos } from "@/lib/formato";
import { mensajeAlLocal } from "@/lib/mensajes";
import { pasosDelPedido, textoEstadoCliente } from "@/lib/pedido";
import { NOMBRE_ESTADO } from "@/lib/tipos";
import { CompartirLink, LimpiarBorrador, Refrescar } from "../../compartidos";
import { LogoPizza } from "../../LogoPizza";

export async function generateMetadata({ params }: PageProps<"/pedido/[token]">): Promise<Metadata> {
  const { token } = await params;
  const [p, a] = await Promise.all([pedidoDelToken(token), ajustesActuales()]);
  return {
    title: { absolute: p ? `Pedido #${p.id} · ${a.nombre_local}` : "Pedido" },
    robots: { index: false },
  };
}

/** Link privado del cliente: es la confirmación al pedir (`?nuevo=1`) y después muestra cómo va. */
export default async function VerPedido({ params, searchParams }: PageProps<"/pedido/[token]">) {
  const { token } = await params;
  const nuevo = (await searchParams).nuevo === "1";
  const [p, ajustes] = await Promise.all([pedidoDelToken(token), ajustesActuales()]);
  if (!p) notFound();
  const enCurso = p.estado === "nuevo" || p.estado === "preparado";

  return (
    <main className="publico">
      <header className="cabecera cabecera-chica">
        <Link href="/" className="marca">
          <LogoPizza tamano={32} />
          <span className="marca-nombre">{ajustes.nombre_local}</span>
        </Link>
      </header>

      <section className="confirmacion" aria-labelledby="titulo-pedido">
        {nuevo ? (
          <>
            <LimpiarBorrador />
            <h1 id="titulo-pedido" className="confirmacion-titulo">
              ¡Recibimos tu pedido!
            </h1>
            <p className="numero-pedido">Pedido #{p.id}</p>
            <p className="ayuda">Guardá este link para ver cómo va.</p>
          </>
        ) : (
          <h1 id="titulo-pedido" className="confirmacion-titulo">
            Pedido #{p.id}
          </h1>
        )}

        <PasosPedido p={p} />

        <p className="detalle-pedido">
          {p.cliente_nombre} · {fechaCorta(p.creado)} ·{" "}
          {p.entrega === "envio" ? `Envío a ${p.direccion}` : "Retiro en el local"}
        </p>
        {p.entrega === "retiro" && ajustes.texto_retiro && (
          <p className="retiro">
            <strong>Dónde retirar:</strong> {ajustes.texto_retiro}
          </p>
        )}

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
        {p.nota && <p className="nota">“{p.nota}”</p>}

        <div className="acciones-confirmacion">
          {ajustes.whatsapp && (
            <a
              className={nuevo ? "boton-principal" : "boton-secundario"}
              href={linkWhatsApp(ajustes.whatsapp, mensajeAlLocal(p, nuevo))}
              target="_blank"
              rel="noopener noreferrer"
            >
              {nuevo ? "Avisar por WhatsApp" : "Escribir al local"}
            </a>
          )}
          <CompartirLink ruta={`/pedido/${token}`} titulo={`Pedido #${p.id}`} />
          <Link href="/" className="boton-secundario">
            Hacer otro pedido
          </Link>
        </div>
      </section>

      {enCurso && <Refrescar segundos={45} />}
    </main>
  );
}

function PasosPedido({ p }: { p: PedidoConItems }) {
  const pasos = pasosDelPedido(p.estado, p.entrega);
  return (
    <div className="estado-pedido">
      {pasos.length ? (
        <ol className="pasos" aria-label="Estado del pedido">
          {pasos.map((paso) => (
            <li key={paso.nombre} className={`paso paso-${paso.estado}`} aria-current={paso.estado === "actual" ? "step" : undefined}>
              <span className="paso-punto" aria-hidden />
              {paso.nombre}
            </li>
          ))}
        </ol>
      ) : (
        <p className="chip estado-cancelado">{NOMBRE_ESTADO.cancelado}</p>
      )}
      <p className="estado-texto">{textoEstadoCliente(p.estado, p.entrega)}</p>
    </div>
  );
}
