import Link from "next/link";
import { db } from "@/lib/cloudflare";
import { contarPorEstado, leerPedidos, type PedidoConItems } from "@/lib/datos";
import { fechaCorta, linkWhatsApp, pesos } from "@/lib/formato";
import { textoPedido } from "@/lib/pedido";
import { requerirSesion } from "@/lib/sesion";
import { ESTADOS, NOMBRE_ESTADO, type EstadoPedido } from "@/lib/tipos";
import { cambiarEstado } from "../../acciones";
import { BotonSeguro, FormAccion, Refrescar } from "../../componentes";

type Filtro = EstadoPedido | "activos" | "todos";
const FILTROS: Filtro[] = ["activos", ...ESTADOS, "todos"];
const NOMBRE_FILTRO: Record<Filtro, string> = { activos: "Por resolver", todos: "Todos", ...NOMBRE_ESTADO };

export default async function Pedidos({ searchParams }: PageProps<"/admin/pedidos">) {
  await requerirSesion();
  const pedido = (await searchParams).estado;
  const filtro: Filtro = FILTROS.includes(pedido as Filtro) ? (pedido as Filtro) : "activos";
  const DB = await db();
  const [pedidos, cuenta] = await Promise.all([leerPedidos(DB, filtro), contarPorEstado(DB)]);
  const numero = (f: Filtro) =>
    f === "activos" ? cuenta.nuevo + cuenta.preparado : f === "todos" ? null : cuenta[f];

  return (
    <main>
      <Refrescar segundos={30} />
      <h1>Pedidos</h1>
      <nav className="filtros">
        {FILTROS.map((f) => (
          <Link key={f} href={`/admin/pedidos?estado=${f}`} className={f === filtro ? "activo" : ""}>
            {NOMBRE_FILTRO[f]}
            {numero(f) !== null && <span className="cuenta">{numero(f)}</span>}
          </Link>
        ))}
      </nav>
      {pedidos.length === 0 ? (
        <p className="vacio">No hay pedidos acá.</p>
      ) : (
        <ul className="pedidos">
          {pedidos.map((p) => (
            <TarjetaPedido key={p.id} p={p} />
          ))}
        </ul>
      )}
    </main>
  );
}

function TarjetaPedido({ p }: { p: PedidoConItems }) {
  const aviso =
    p.estado === "preparado"
      ? `Hola ${p.cliente_nombre}! Tu pedido #${p.id} ya está listo.`
      : `Hola ${p.cliente_nombre}! Recibimos tu pedido:\n${textoPedido(p)}`;
  const boton = (estado: EstadoPedido, texto: string, clase = "boton") => (
    <FormAccion accion={cambiarEstado} ocultos={{ id: p.id, estado }}>
      <button className={clase}>{texto}</button>
    </FormAccion>
  );

  return (
    <li className={`tarjeta pedido estado-${p.estado}`}>
      <div className="pedido-cabeza">
        <strong>
          #{p.id} · {p.cliente_nombre}
        </strong>
        <span className={`estado estado-${p.estado}`}>{NOMBRE_ESTADO[p.estado]}</span>
      </div>
      <p className="ayuda">
        {fechaCorta(p.creado)} · {p.entrega === "envio" ? <>Envío a <strong>{p.direccion}</strong></> : "Retira en el local"}
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
      {p.nota && <p className="nota">“{p.nota}”</p>}
      <div className="acciones">
        <a className="boton whatsapp" href={linkWhatsApp(p.cliente_telefono, aviso)} target="_blank" rel="noopener noreferrer">
          WhatsApp
        </a>
        {p.estado === "nuevo" && boton("preparado", "Preparado", "boton-principal")}
        {p.estado === "preparado" && boton("entregado", "Entregado", "boton-principal")}
        {p.estado === "preparado" && boton("nuevo", "Volver a nuevo")}
        {p.estado === "entregado" && boton("preparado", "Volver a preparado")}
        {(p.estado === "nuevo" || p.estado === "preparado") && (
          <FormAccion accion={cambiarEstado} ocultos={{ id: p.id, estado: "cancelado" }}>
            <BotonSeguro className="boton peligro" pregunta="¿Cancelar? Vuelve el stock">
              Cancelar
            </BotonSeguro>
          </FormAccion>
        )}
      </div>
    </li>
  );
}
