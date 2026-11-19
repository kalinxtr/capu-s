import { MAX_POR_PRODUCTO } from "./pedido";
import type { Entrega } from "./tipos";

/** Lo que el cliente va eligiendo y sus datos, guardados solo en su navegador. Todo puro, sin DOM. */

export const CLAVE_ELECCION = "pizzeria:eleccion"; // sessionStorage
export const CLAVE_CLIENTE = "pizzeria:cliente"; // localStorage
export const STOCK_BAJO = 3;

export type Eleccion = Record<number, number>;

function json(t: string | null): unknown {
  if (!t) return null;
  try {
    return JSON.parse(t);
  } catch {
    return null;
  }
}

const esObjeto = (x: unknown): x is Record<string, unknown> => typeof x === "object" && x !== null && !Array.isArray(x);

/** Lee la elección guardada. Se queda solo con ids y cantidades válidas. */
export function leerEleccion(t: string | null): Eleccion {
  const x = json(t);
  const e: Eleccion = {};
  if (!esObjeto(x)) return e;
  for (const [k, v] of Object.entries(x)) {
    const id = Number(k);
    if (/^\d{1,9}$/.test(k) && id > 0 && Number.isInteger(v) && (v as number) >= 1 && (v as number) <= MAX_POR_PRODUCTO) {
      e[id] = v as number;
    }
  }
  return e;
}

export type Recorte = { id: number; nombre: string; pedidas: number; quedan: number };

/**
 * Ajusta la elección al stock actual. Los productos que ya no están (archivados) se descartan sin aviso.
 * Si no cambió nada devuelve la misma referencia, para no volver a renderizar.
 */
export function recortarEleccion(
  e: Eleccion,
  productos: { id: number; nombre: string; stock: number }[],
): { eleccion: Eleccion; recortes: Recorte[]; cambio: boolean } {
  const porId = new Map(productos.map((p) => [p.id, p]));
  const nueva: Eleccion = {};
  const recortes: Recorte[] = [];
  let cambio = false;
  for (const [k, pedidas] of Object.entries(e)) {
    const p = porId.get(Number(k));
    if (!p) {
      cambio = true;
      continue;
    }
    const n = Math.min(pedidas, p.stock);
    if (n !== pedidas) {
      cambio = true;
      recortes.push({ id: p.id, nombre: p.nombre, pedidas, quedan: n });
    }
    if (n > 0) nueva[p.id] = n;
  }
  return cambio ? { eleccion: nueva, recortes, cambio } : { eleccion: e, recortes, cambio };
}

export function textoRecorte(r: Recorte): string {
  if (r.quedan === 0) return `${r.nombre} se agotó y la sacamos de tu pedido.`;
  if (r.quedan === 1) return `${r.nombre}: quedaba 1, te dejamos 1.`;
  return `${r.nombre}: quedaban ${r.quedan}, te dejamos ${r.quedan}.`;
}

export type DatosCliente = { nombre: string; telefono: string; entrega: Entrega; direccion: string };

/** Datos del cliente recordados en su celular. Si algo no cuadra, se ignoran. */
export function leerDatosCliente(t: string | null): DatosCliente | null {
  const x = json(t);
  if (!esObjeto(x)) return null;
  const { nombre, telefono, entrega, direccion } = x;
  if (typeof nombre !== "string" || typeof telefono !== "string" || typeof direccion !== "string") return null;
  if (entrega !== "retiro" && entrega !== "envio") return null;
  return { nombre: nombre.slice(0, 60), telefono: telefono.slice(0, 30), entrega, direccion: direccion.slice(0, 160) };
}

export function textoStock(stock: number): { texto: string; bajo: boolean } {
  if (stock <= 0) return { texto: "Agotado", bajo: false };
  if (stock === 1) return { texto: "¡Última!", bajo: true };
  if (stock <= STOCK_BAJO) return { texto: `¡Últimas ${stock}!`, bajo: true };
  return { texto: `Quedan ${stock}`, bajo: false };
}
