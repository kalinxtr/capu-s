"use server";

import { refresh } from "next/cache";
import { db, env, excedido, ipCliente } from "@/lib/cloudflare";
import { leerAjustes } from "@/lib/datos";
import { linkWhatsApp, normalizarTelefono } from "@/lib/formato";
import { leerPedido, textoPedido } from "@/lib/pedido";

export type PedidoCreado = {
  ok: true;
  id: number;
  token: string;
  total: number;
  items: { nombre: string; cantidad: number; precio: number }[];
  /** Link para que el cliente le avise al local por WhatsApp (si el local cargó su número). */
  whatsapp: string | null;
};
export type ResultadoPedido = PedidoCreado | { ok: false; error: string } | null;

const AGOTADO = "Alguna paleta se agotó mientras elegías. Ya actualizamos la lista: revisá y volvé a pedir.";

/**
 * Crea el pedido y descuenta el stock en un solo batch de D1 (atómico).
 * Los precios salen de la base, nunca del formulario. Si algún producto quedaría con
 * stock negativo, el CHECK de la tabla hace fallar el batch completo: no queda nada a medias.
 */
export async function crearPedido(_prev: ResultadoPedido, form: FormData): Promise<ResultadoPedido> {
  const leido = leerPedido(form.entries());
  if (!leido.ok) return leido;
  const d = leido.datos;

  const { LIMITE_PEDIDOS } = await env();
  if (await excedido(LIMITE_PEDIDOS, await ipCliente())) {
    return { ok: false, error: "Hiciste muchos pedidos seguidos. Esperá un minuto y probá de nuevo." };
  }

  const DB = await db();
  const ids = d.lineas.map((l) => l.productoId);
  const { results: productos } = await DB.prepare(
    `SELECT p.id, s.nombre AS sabor, p.nombre, p.precio, p.stock
     FROM productos p JOIN sabores s ON s.id = p.sabor_id
     WHERE p.activo = 1 AND s.activo = 1 AND p.id IN (${ids.map(() => "?").join(",")})`,
  )
    .bind(...ids)
    .all<{ id: number; sabor: string; nombre: string; precio: number; stock: number }>();
  const porId = new Map(productos.map((p) => [p.id, p]));

  // Chequeo amable antes del batch (el batch igual vuelve a verificar con el CHECK).
  for (const l of d.lineas) {
    const p = porId.get(l.productoId);
    if (!p || p.stock < l.cantidad) {
      refresh();
      return { ok: false, error: AGOTADO };
    }
  }

  const items = d.lineas.map((l) => {
    const p = porId.get(l.productoId)!;
    return { productoId: p.id, nombre: `${p.sabor} · ${p.nombre}`, precio: p.precio, cantidad: l.cantidad };
  });
  const total = items.reduce((t, i) => t + i.precio * i.cantidad, 0);
  const token = crypto.randomUUID();
  const ahora = Date.now();

  let id: number;
  try {
    const res = await DB.batch([
      DB.prepare(
        `INSERT INTO pedidos (token, cliente_nombre, cliente_telefono, entrega, direccion, nota, total, estado, creado, actualizado)
         VALUES (?, ?, ?, ?, ?, ?, ?, 'nuevo', ?, ?) RETURNING id`,
      ).bind(token, d.nombre, normalizarTelefono(d.telefono), d.entrega, d.direccion, d.nota, total, ahora, ahora),
      ...items.flatMap((i) => [
        DB.prepare("UPDATE productos SET stock = stock - ? WHERE id = ?").bind(i.cantidad, i.productoId),
        DB.prepare(
          `INSERT INTO pedido_items (pedido_id, producto_id, nombre, precio, cantidad)
           SELECT id, ?, ?, ?, ? FROM pedidos WHERE token = ?`,
        ).bind(i.productoId, i.nombre, i.precio, i.cantidad, token),
      ]),
    ]);
    id = (res[0].results[0] as { id: number }).id;
  } catch (e) {
    if (/CHECK constraint failed/i.test(mensajeDe(e))) {
      refresh();
      return { ok: false, error: AGOTADO };
    }
    throw e;
  }

  refresh();
  const ajustes = await leerAjustes(DB);
  const texto = textoPedido({ id, cliente_nombre: d.nombre, entrega: d.entrega, direccion: d.direccion, nota: d.nota, total, items });
  return {
    ok: true,
    id,
    token,
    total,
    items: items.map(({ nombre, cantidad, precio }) => ({ nombre, cantidad, precio })),
    whatsapp: ajustes.whatsapp ? linkWhatsApp(ajustes.whatsapp, `Hola! Hice este pedido:\n${texto}`) : null,
  };
}

function mensajeDe(e: unknown): string {
  let t = "";
  for (let x: unknown = e; x && t.length < 2000; x = (x as { cause?: unknown }).cause) t += " " + String(x);
  return t;
}
