import "server-only";
import { cache } from "react";
import { db } from "./cloudflare";
import type { Ajustes, EstadoPedido, Pedido, PedidoItem, Producto, Sabor } from "./tipos";

/** Consultas de lectura. Las escrituras viven en las Server Actions. */

export async function leerAjustes(DB: D1Database): Promise<Ajustes> {
  const a = await DB.prepare("SELECT nombre_local, whatsapp, texto_retiro FROM ajustes WHERE id = 1").first<Ajustes>();
  return a ?? { nombre_local: "La Paletería", whatsapp: null, texto_retiro: null };
}

/** Sabores y productos. Sin `todos`, solo lo activo (para la página pública). */
export async function leerCatalogo(DB: D1Database, todos = false) {
  const filtroSabor = todos ? "" : "WHERE activo = 1";
  const filtroProd = todos ? "" : "WHERE p.activo = 1 AND s.activo = 1";
  const [sabores, productos] = await DB.batch([
    DB.prepare(`SELECT id, nombre, orden, activo FROM sabores ${filtroSabor} ORDER BY orden, id`),
    DB.prepare(
      `SELECT p.id, p.sabor_id, p.nombre, p.precio, p.stock, p.imagen, p.orden, p.activo
       FROM productos p JOIN sabores s ON s.id = p.sabor_id ${filtroProd} ORDER BY p.orden, p.id`,
    ),
  ]);
  return { sabores: sabores.results as Sabor[], productos: productos.results as Producto[] };
}

export type PedidoConItems = Pedido & { items: PedidoItem[] };

async function conItems(DB: D1Database, pedidos: Pedido[]): Promise<PedidoConItems[]> {
  if (!pedidos.length) return [];
  const ids = pedidos.map((p) => p.id);
  const { results } = await DB.prepare(
    `SELECT pedido_id, producto_id, nombre, precio, cantidad FROM pedido_items
     WHERE pedido_id IN (${ids.map(() => "?").join(",")}) ORDER BY id`,
  )
    .bind(...ids)
    .all<PedidoItem>();
  return pedidos.map((p) => ({ ...p, items: results.filter((i) => i.pedido_id === p.id) }));
}

const COLUMNAS_PEDIDO =
  "id, token, cliente_nombre, cliente_telefono, entrega, direccion, nota, total, estado, creado, actualizado";

/** Pedidos del admin. "activos" = nuevos y preparados (lo que todavía hay que resolver). */
export async function leerPedidos(DB: D1Database, filtro: EstadoPedido | "activos" | "todos", limite = 100) {
  const donde =
    filtro === "todos" ? "" : filtro === "activos" ? "WHERE estado IN ('nuevo', 'preparado')" : "WHERE estado = ?";
  const st = DB.prepare(`SELECT ${COLUMNAS_PEDIDO} FROM pedidos ${donde} ORDER BY creado DESC LIMIT ${limite}`);
  const { results } = await (filtro === "todos" || filtro === "activos" ? st : st.bind(filtro)).all<Pedido>();
  return conItems(DB, results);
}

export async function contarPorEstado(DB: D1Database): Promise<Record<EstadoPedido, number>> {
  const { results } = await DB.prepare("SELECT estado, count(*) AS n FROM pedidos GROUP BY estado").all<{
    estado: EstadoPedido;
    n: number;
  }>();
  const r = { nuevo: 0, preparado: 0, entregado: 0, cancelado: 0 };
  for (const f of results) r[f.estado] = f.n;
  return r;
}

export async function pedidoPorToken(DB: D1Database, token: string): Promise<PedidoConItems | null> {
  if (!/^[0-9a-f-]{36}$/.test(token)) return null;
  const p = await DB.prepare(`SELECT ${COLUMNAS_PEDIDO} FROM pedidos WHERE token = ?`).bind(token).first<Pedido>();
  return p ? (await conItems(DB, [p]))[0] : null;
}

// Versiones memorizadas por request (React `cache`): la metadata y la página no consultan dos veces.
export const ajustesActuales = cache(async () => leerAjustes(await db()));
export const cuentaPedidos = cache(async () => contarPorEstado(await db()));
export const pedidoDelToken = cache(async (token: string) => pedidoPorToken(await db(), token));
