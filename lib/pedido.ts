import { pesos, telefonoValido } from "./formato";
import type { Entrega, PedidoItem } from "./tipos";

export const MAX_POR_PRODUCTO = 99;
export const MAX_ITEMS = 50;

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
export function leerPedido(entradas: Entradas): { ok: true; datos: DatosPedido } | { ok: false; error: string } {
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
  if (nombre.length < 2 || nombre.length > 60) return { ok: false, error: "Escribí tu nombre." };

  const telefono = texto(campos.get("telefono"));
  if (!telefonoValido(telefono)) return { ok: false, error: "Revisá el teléfono: con código de área." };

  const entregaTxt = texto(campos.get("entrega"));
  if (entregaTxt !== "retiro" && entregaTxt !== "envio") return { ok: false, error: "Elegí retiro o envío." };
  const entrega: Entrega = entregaTxt;

  const direccionTxt = texto(campos.get("direccion"));
  if (entrega === "envio" && direccionTxt.length < 4) return { ok: false, error: "Escribí la dirección de envío." };
  if (direccionTxt.length > 160) return { ok: false, error: "La dirección es demasiado larga." };

  const notaTxt = texto(campos.get("nota"));
  if (notaTxt.length > 300) return { ok: false, error: "La nota es demasiado larga." };

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
