import { pesos, telefonoValido } from "./formato";
import type { Entrega, EstadoPedido, PedidoItem } from "./tipos";

export const MAX_POR_PRODUCTO = 99;
export const MAX_ITEMS = 50;

/** Campo del formulario público al que apunta un error (para enfocarlo). */
export type CampoPedido = "nombre" | "telefono" | "direccion" | "nota";

export type Linea = { productoId: number; cantidad: number };

export type DatosPedido = {
  nombre: string;
  telefono: string;
  entrega: Entrega;
  direccion: string | null;
  nota: string | null;
  lineas: Linea[];
};

type Entradas = Iterable<[string, FormDataEntryValue]>;

const texto = (v: FormDataEntryValue | undefined) => (typeof v === "string" ? v.trim() : "");

/**
 * Lee y valida el formulario público. Las cantidades llegan como `cant_<productoId>`.
 * Devuelve un error legible para el cliente o los datos limpios.
 * Los precios NO vienen del cliente: se leen de la base al crear el pedido.
 */
export function leerPedido(
  entradas: Entradas,
): { ok: true; datos: DatosPedido } | { ok: false; error: string; campo?: CampoPedido } {
  const campos = new Map<string, FormDataEntryValue>();
  const lineas: Linea[] = [];
  for (const [k, v] of entradas) {
    const m = /^cant_(\d{1,9})$/.exec(k);
    if (!m) {
      campos.set(k, v);
      continue;
    }
    const cantidad = Number(texto(v));
    if (!Number.isInteger(cantidad) || cantidad < 0 || cantidad > MAX_POR_PRODUCTO) {
      return { ok: false, error: "Revisá las cantidades." };
    }
    if (cantidad > 0) lineas.push({ productoId: Number(m[1]), cantidad });
  }

  if (!lineas.length) return { ok: false, error: "Elegí al menos una paleta." };
  if (lineas.length > MAX_ITEMS) return { ok: false, error: "Son demasiados productos para un pedido." };

  const nombre = texto(campos.get("nombre"));
  if (nombre.length < 2 || nombre.length > 60) return { ok: false, error: "Escribí tu nombre.", campo: "nombre" };

  const telefono = texto(campos.get("telefono"));
  if (!telefonoValido(telefono)) return { ok: false, error: "Revisá el teléfono: con código de área.", campo: "telefono" };

  const entregaTxt = texto(campos.get("entrega"));
  if (entregaTxt !== "retiro" && entregaTxt !== "envio") return { ok: false, error: "Elegí retiro o envío." };
  const entrega: Entrega = entregaTxt;

  const direccionTxt = texto(campos.get("direccion"));
  if (entrega === "envio" && direccionTxt.length < 4) {
    return { ok: false, error: "Escribí la dirección de envío.", campo: "direccion" };
  }
  if (direccionTxt.length > 160) return { ok: false, error: "La dirección es demasiado larga.", campo: "direccion" };

  const notaTxt = texto(campos.get("nota"));
  if (notaTxt.length > 300) return { ok: false, error: "La nota es demasiado larga.", campo: "nota" };

  return {
    ok: true,
    datos: {
      nombre,
      telefono,
      entrega,
      direccion: entrega === "envio" ? direccionTxt : null,
      nota: notaTxt || null,
      lineas,
    },
  };
}

/** Texto del pedido para mandar por WhatsApp (del cliente al local, o del local al cliente). */
export function textoPedido(p: {
  id: number;
  cliente_nombre: string;
  entrega: Entrega;
  direccion: string | null;
  nota: string | null;
  total: number;
  items: Pick<PedidoItem, "nombre" | "cantidad" | "precio">[];
}): string {
  const lineas = [
    `Pedido #${p.id} · ${p.cliente_nombre}`,
    ...p.items.map((i) => `• ${i.cantidad} × ${i.nombre} (${pesos(i.precio * i.cantidad)})`),
    `Total: ${pesos(p.total)}`,
    p.entrega === "envio" ? `Envío a: ${p.direccion}` : "Retiro en el local",
  ];
  if (p.nota) lineas.push(`Nota: ${p.nota}`);
  return lineas.join("\n");
}

export type Paso = { nombre: string; estado: "hecho" | "actual" | "pendiente" };

/** Línea de pasos que ve el cliente. Un pedido cancelado no tiene pasos. */
export function pasosDelPedido(estado: EstadoPedido, entrega: Entrega): Paso[] {
  if (estado === "cancelado") return [];
  const nombres = ["Recibido", entrega === "retiro" ? "Listo para retirar" : "Listo para enviar", "Entregado"];
  const actual = { nuevo: 0, preparado: 1, entregado: 2 }[estado];
  return nombres.map((nombre, i) => ({ nombre, estado: i < actual ? "hecho" : i === actual ? "actual" : "pendiente" }));
}

/** Qué le pasa al pedido, en una frase para el cliente. */
export function textoEstadoCliente(estado: EstadoPedido, entrega: Entrega): string {
  switch (estado) {
    case "nuevo":
      return "Ya lo recibimos. Te escribimos por WhatsApp cuando esté listo.";
    case "preparado":
      return entrega === "retiro" ? "¡Está listo! Ya podés pasar a retirarlo." : "¡Está listo! En breve sale para tu dirección.";
    case "entregado":
      return "Entregado. ¡Gracias por tu pedido!";
    case "cancelado":
      return "Este pedido fue cancelado. Si tenés dudas, escribinos.";
  }
}

/** Cuántas de cada producto hay que preparar, sumando varios pedidos. */
export function aPreparar(pedidos: { items: Pick<PedidoItem, "nombre" | "cantidad">[] }[]): { nombre: string; cantidad: number }[] {
  const suma = new Map<string, number>();
  for (const p of pedidos) for (const i of p.items) suma.set(i.nombre, (suma.get(i.nombre) ?? 0) + i.cantidad);
  return [...suma]
    .map(([nombre, cantidad]) => ({ nombre, cantidad }))
    .sort((a, b) => b.cantidad - a.cantidad || a.nombre.localeCompare(b.nombre, "es"));
}
