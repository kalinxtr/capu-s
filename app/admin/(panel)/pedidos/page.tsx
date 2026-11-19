import type { Metadata } from "next";
import { headers } from "next/headers";
import Link from "next/link";
import { db } from "@/lib/cloudflare";
import { ajustesActuales, cuentaPedidos, leerPedidos, type PedidoConItems } from "@/lib/datos";
import { fechaCorta, haceCuanto, linkMapa, linkTelefono, linkWhatsApp, origenSitio, pesos, telefonoLegible } from "@/lib/formato";
import { mensajeAlCliente } from "@/lib/mensajes";
import { aPreparar } from "@/lib/pedido";
import { requerirSesion } from "@/lib/sesion";
import { ESTADOS, NOMBRE_ESTADO, type EstadoPedido } from "@/lib/tipos";
import { Refrescar } from "../../../compartidos";
import { cambiarEstado } from "../../acciones";
import { BotonSeguro, FormAccion } from "../../_componentes/formularios";
import { BotonEstado, MarcaNueva, RegistrarVistos } from "../../_componentes/pedidos";

type Filtro = EstadoPedido | "activos" | "todos";
const FILTROS: Filtro[] = ["activos", ...ESTADOS, "todos"];
const NOMBRE_FILTRO: Record<Filtro, string> = { activos: "Por resolver", todos: "Todos", ...NOMBRE_ESTADO };
const LIMITE = 100;

export async function generateMetadata(): Promise<Metadata> {
  await requerirSesion();
  const c = await cuentaPedidos();
  return { title: c.nuevo ? `(${c.nuevo}) Pedidos` : "Pedidos" };
}

export default async function Pedidos({ searchParams }: PageProps<"/admin/pedidos">) {
  await requerirSesion();
  const pedido = (await searchParams).estado;
  const filtro: Filtro = FILTROS.includes(pedido as Filtro) ? (pedido as Filtro) : "activos";
  const [pedidos, cuenta, ajustes, h] = await Promise.all([
    leerPedidos(await db(), filtro, LIMITE),
    cuentaPedidos(),
    ajustesActuales(),
    headers(),
  ]);
  const origen = origenSitio(h.get("host"));
  const ahora = Date.now();
  const numero = (f: Filtro) => (f === "activos" ? cuenta.nuevo + cuenta.preparado : f === "todos" ? null : cuenta[f]);

  const nuevos = pedidos.filter((p) => p.estado === "nuevo");
  const produccion = (filtro === "activos" || filtro === "nuevo") && nuevos.length > 0 ? aPreparar(nuevos) : [];

  return (
    <main>
      <Refrescar segundos={30} oculta={60} />
      <RegistrarVistos maxId={Math.max(0, ...pedidos.map((p) => p.id))} />
      <h1>Pedidos</h1>
      <nav className="filtros" aria-label="Filtrar pedidos">
        {FILTROS.map((f) => (
          <Link key={f} href={`/admin/pedidos?estado=${f}`} aria-current={f === filtro ? "page" : undefined}>
            {NOMBRE_FILTRO[f]}
            {numero(f) !== null && <span className="cuenta">{numero(f)}</span>}
          </Link>
        ))}
      </nav>

      {produccion.length > 0 && (
        <details className="tarjeta a-preparar" open>
          <summary>
            Para preparar · {produccion.reduce((t, x) => t + x.cantidad, 0)} pizzas de {nuevos.length}{" "}
            {nuevos.length === 1 ? "pedido nuevo" : "pedidos nuevos"}
          </summary>
          <ul className="resumen">
            {produccion.map((x) => (
              <li key={x.nombre}>
                <span>{x.nombre}</span>
                <strong>{x.cantidad}</strong>
              </li>
            ))}
          </ul>
        </details>
      )}

      {pedidos.length === 0 ? (
        <p className="vacio">{filtro === "activos" ? "No hay pedidos por resolver. ¡Todo al día!" : "No hay pedidos acá."}</p>
      ) : (
        <ul className="pedidos">
          {pedidos.map((p) => (
            <TarjetaPedido
              key={p.id}
              p={p}
              ahora={ahora}
              whatsapp={linkWhatsApp(
                p.cliente_telefono,
                mensajeAlCliente(p, { textoRetiro: ajustes.texto_retiro, link: `${origen}/pedido/${p.token}` }),
              )}
            />
          ))}
        </ul>
      )}
      {pedidos.length === LIMITE && <p className="ayuda centrado">Mostrando los últimos {LIMITE} pedidos.</p>}
    </main>
  );
}

function TarjetaPedido({ p, ahora, whatsapp }: { p: PedidoConItems; ahora: number; whatsapp: string }) {
  return (
    <li id={`pedido-${p.id}`} className={`tarjeta pedido estado-${p.estado}`}>
      <div className="pedido-cabeza">
        <strong className="pedido-titulo">
          #{p.id} · {p.cliente_nombre}
        </strong>
        <MarcaNueva id={p.id} />
        <span className={`chip estado-${p.estado}`}>{NOMBRE_ESTADO[p.estado]}</span>
      </div>
      <p className="pedido-meta">
        <time dateTime={new Date(p.creado).toISOString()} title={fechaCorta(p.creado)}>
          {haceCuanto(p.creado, ahora)}
        </time>
        {" · "}
        <a href={linkTelefono(p.cliente_telefono)}>{telefonoLegible(p.cliente_telefono)}</a>
      </p>
      <p className="pedido-meta">
        {p.entrega === "envio" ? (
          <>
            Envío a{" "}
            <a href={linkMapa(p.direccion ?? "")} target="_blank" rel="noopener noreferrer">
              <strong>{p.direccion}</strong>
            </a>
          </>
        ) : (
          "Retira en el local"
        )}
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
        <a className="boton whatsapp" href={whatsapp} target="_blank" rel="noopener noreferrer">
          WhatsApp
        </a>
        {p.estado === "nuevo" && <BotonEstado id={p.id} estado="preparado" texto="Preparado" principal deshacerA="nuevo" />}
        {p.estado === "preparado" && (
          <>
            <BotonEstado id={p.id} estado="entregado" texto="Entregado" principal deshacerA="preparado" />
            <BotonEstado id={p.id} estado="nuevo" texto="Volver a nuevo" />
          </>
        )}
        {p.estado === "entregado" && <BotonEstado id={p.id} estado="preparado" texto="Volver a preparado" />}
        {(p.estado === "nuevo" || p.estado === "preparado") && (
          <FormAccion accion={cambiarEstado} ocultos={{ id: p.id, estado: "cancelado" }} className="cancelar">
            <BotonSeguro className="boton peligro" pregunta="¿Cancelar? Vuelve el stock">
              Cancelar
            </BotonSeguro>
          </FormAccion>
        )}
      </div>
    </li>
  );
}
