"use server";

import { refresh } from "next/cache";
import { redirect } from "next/navigation";
import { db, env, excedido, ipCliente } from "@/lib/cloudflare";
import { parsePesos, telefonoValido } from "@/lib/formato";
import { cerrarSesion, claveCorrecta, exigirSesion, iniciarSesion } from "@/lib/sesion";
import { ESTADOS, type EstadoPedido, type Resultado } from "@/lib/tipos";

// ───────────────────────── Sesión ─────────────────────────

export async function ingresar(_prev: Resultado, form: FormData): Promise<Resultado> {
  const { LIMITE_INGRESO } = await env();
  if (await excedido(LIMITE_INGRESO, await ipCliente())) {
    return { ok: false, error: "Demasiados intentos. Esperá un minuto." };
  }
  const clave = String(form.get("clave") ?? "");
  if (!clave || !(await claveCorrecta(clave))) return { ok: false, error: "Clave incorrecta." };
  await iniciarSesion();
  redirect("/admin/pedidos");
}

export async function salir() {
  await cerrarSesion();
  redirect("/admin/ingresar");
}

// ───────────────────────── Ayudas ─────────────────────────

const ok = (mensaje?: string): Resultado => ({ ok: true, mensaje });
const error = (e: string): Resultado => ({ ok: false, error: e });

function entero(form: FormData, campo: string, min = 0, max = 1_000_000): number | null {
  const v = String(form.get(campo) ?? "").trim();
  if (!/^-?\d+$/.test(v)) return null;
  const n = Number(v);
  return Number.isSafeInteger(n) && n >= min && n <= max ? n : null;
}

function texto(form: FormData, campo: string, max: number): string {
  return String(form.get(campo) ?? "").trim().slice(0, max);
}

// ───────────────────────── Pedidos ─────────────────────────

/**
 * Cambia el estado de un pedido. Cancelar (solo desde nuevo o preparado) devuelve el stock
 * en el mismo batch, y solo si el pedido todavía no estaba cancelado: dos clics no lo devuelven dos veces.
 */
export async function cambiarEstado(_prev: Resultado, form: FormData): Promise<Resultado> {
  await exigirSesion();
  const id = entero(form, "id", 1);
  const estado = String(form.get("estado")) as EstadoPedido;
  if (!id || !ESTADOS.includes(estado)) return error("Pedido o estado inválido.");
  const DB = await db();
  const ahora = Date.now();

  if (estado === "cancelado") {
    const [, r] = await DB.batch([
      DB.prepare(
        `UPDATE productos SET stock = stock + (
           SELECT sum(cantidad) FROM pedido_items WHERE pedido_id = ?1 AND producto_id = productos.id)
         WHERE id IN (SELECT producto_id FROM pedido_items WHERE pedido_id = ?1)
           AND EXISTS (SELECT 1 FROM pedidos WHERE id = ?1 AND estado IN ('nuevo', 'preparado'))`,
      ).bind(id),
      DB.prepare(
        "UPDATE pedidos SET estado = 'cancelado', actualizado = ? WHERE id = ? AND estado IN ('nuevo', 'preparado')",
      ).bind(ahora, id),
    ]);
    refresh();
    return r.meta.changes ? ok(`Pedido #${id} cancelado. El stock volvió.`) : error("Ese pedido ya no se puede cancelar.");
  }

  const r = await DB.prepare(
    "UPDATE pedidos SET estado = ?, actualizado = ? WHERE id = ? AND estado IN ('nuevo', 'preparado', 'entregado')",
  )
    .bind(estado, ahora, id)
    .run();
  refresh();
  return r.meta.changes ? ok() : error("Un pedido cancelado no se puede reabrir.");
}

// ───────────────────────── Sabores ─────────────────────────

export async function crearSabor(_prev: Resultado, form: FormData): Promise<Resultado> {
  await exigirSesion();
  const nombre = texto(form, "nombre", 40);
  if (nombre.length < 2) return error("Escribí el nombre del sabor.");
  const DB = await db();
  await DB.prepare("INSERT INTO sabores (nombre, orden) SELECT ?, coalesce(max(orden), 0) + 1 FROM sabores")
    .bind(nombre)
    .run();
  refresh();
  return ok(`Sabor "${nombre}" agregado.`);
}

export async function editarSabor(_prev: Resultado, form: FormData): Promise<Resultado> {
  await exigirSesion();
  const id = entero(form, "id", 1);
  const nombre = texto(form, "nombre", 40);
  const orden = entero(form, "orden", 0, 9999);
  if (!id || nombre.length < 2 || orden === null) return error("Revisá el nombre y el orden.");
  await (await db()).prepare("UPDATE sabores SET nombre = ?, orden = ? WHERE id = ?").bind(nombre, orden, id).run();
  refresh();
  return ok("Guardado.");
}

/** Archivar o reactivar: nunca se borra (los pedidos viejos lo nombran). */
export async function activarSabor(_prev: Resultado, form: FormData): Promise<Resultado> {
  await exigirSesion();
  const id = entero(form, "id", 1);
  const activo = entero(form, "activo", 0, 1);
  if (!id || activo === null) return error("Sabor inválido.");
  await (await db()).prepare("UPDATE sabores SET activo = ? WHERE id = ?").bind(activo, id).run();
  refresh();
  return ok();
}

// ───────────────────────── Productos ─────────────────────────

export async function crearProducto(_prev: Resultado, form: FormData): Promise<Resultado> {
  await exigirSesion();
  const saborId = entero(form, "sabor_id", 1);
  const nombre = texto(form, "nombre", 60);
  const precio = parsePesos(String(form.get("precio") ?? ""));
  const stock = entero(form, "stock", 0, 100_000) ?? 0;
  if (!saborId || nombre.length < 2) return error("Escribí el nombre del producto.");
  if (precio === null) return error("Escribí el precio.");
  await (await db())
    .prepare(
      `INSERT INTO productos (sabor_id, nombre, precio, stock, orden)
       SELECT ?1, ?2, ?3, ?4, coalesce(max(orden), 0) + 1 FROM productos WHERE sabor_id = ?1`,
    )
    .bind(saborId, nombre, precio, stock)
    .run();
  refresh();
  return ok(`"${nombre}" agregado.`);
}

export async function editarProducto(_prev: Resultado, form: FormData): Promise<Resultado> {
  await exigirSesion();
  const id = entero(form, "id", 1);
  const nombre = texto(form, "nombre", 60);
  const precio = parsePesos(String(form.get("precio") ?? ""));
  if (!id || nombre.length < 2 || precio === null) return error("Revisá el nombre y el precio.");
  await (await db()).prepare("UPDATE productos SET nombre = ?, precio = ? WHERE id = ?").bind(nombre, precio, id).run();
  refresh();
  return ok("Guardado.");
}

/** Suma o resta stock (botones + y −). Nunca baja de 0. */
export async function ajustarStock(_prev: Resultado, form: FormData): Promise<Resultado> {
  await exigirSesion();
  const id = entero(form, "id", 1);
  const delta = entero(form, "delta", -100_000, 100_000);
  if (!id || !delta) return error("Ajuste inválido.");
  await (await db()).prepare("UPDATE productos SET stock = max(0, stock + ?) WHERE id = ?").bind(delta, id).run();
  refresh();
  return ok();
}

/** Fija el stock a un número exacto (después de contar el freezer). */
export async function fijarStock(_prev: Resultado, form: FormData): Promise<Resultado> {
  await exigirSesion();
  const id = entero(form, "id", 1);
  const stock = entero(form, "stock", 0, 100_000);
  if (!id || stock === null) return error("Escribí un número de 0 en adelante.");
  await (await db()).prepare("UPDATE productos SET stock = ? WHERE id = ?").bind(stock, id).run();
  refresh();
  return ok();
}

export async function activarProducto(_prev: Resultado, form: FormData): Promise<Resultado> {
  await exigirSesion();
  const id = entero(form, "id", 1);
  const activo = entero(form, "activo", 0, 1);
  if (!id || activo === null) return error("Producto inválido.");
  await (await db()).prepare("UPDATE productos SET activo = ? WHERE id = ?").bind(activo, id).run();
  refresh();
  return ok();
}

const TIPOS_FOTO: Record<string, string> = { "image/webp": "webp", "image/jpeg": "jpg", "image/png": "png" };
/** El cuerpo de una Server Action tiene 1 MB de tope en Next; en base64 la foto ocupa un 33 % más. */
const MAX_FOTO = 700 * 1024;

/** Sube la foto a R2 (el navegador ya la achicó) y borra la anterior. */
export async function subirFoto(_prev: Resultado, form: FormData): Promise<Resultado> {
  await exigirSesion();
  const id = entero(form, "id", 1);
  // La foto llega como data URL (base64), ya achicada por el navegador. Con OpenNext en Workers,
  // un archivo binario dentro de una Server Action se pierde al decodificar (ver obsidian/Stack.md).
  const m = /^data:(image\/(?:webp|jpeg|png));base64,([A-Za-z0-9+/]+=*)$/.exec(String(form.get("foto") ?? ""));
  if (!id || !m) return error("Elegí una foto (JPG, PNG o WebP).");
  const tipo = m[1];
  const ext = TIPOS_FOTO[tipo];
  const bytes = Uint8Array.from(atob(m[2]), (c) => c.charCodeAt(0));
  if (bytes.length === 0) return error("Elegí una foto.");
  if (bytes.length > MAX_FOTO) return error("La foto pesa demasiado.");

  const { DB, IMAGENES } = await env();
  const anterior = await DB.prepare("SELECT imagen FROM productos WHERE id = ?").bind(id).first<{ imagen: string | null }>();
  if (!anterior) return error("Ese producto no existe.");
  const clave = `productos/${crypto.randomUUID()}.${ext}`;
  await IMAGENES.put(clave, bytes, { httpMetadata: { contentType: tipo } });
  await DB.prepare("UPDATE productos SET imagen = ? WHERE id = ?").bind(clave, id).run();
  if (anterior.imagen) await IMAGENES.delete(anterior.imagen);
  refresh();
  return ok("Foto actualizada.");
}

export async function quitarFoto(_prev: Resultado, form: FormData): Promise<Resultado> {
  await exigirSesion();
  const id = entero(form, "id", 1);
  if (!id) return error("Producto inválido.");
  const { DB, IMAGENES } = await env();
  const p = await DB.prepare("SELECT imagen FROM productos WHERE id = ?").bind(id).first<{ imagen: string | null }>();
  if (p?.imagen) {
    await DB.prepare("UPDATE productos SET imagen = NULL WHERE id = ?").bind(id).run();
    await IMAGENES.delete(p.imagen);
  }
  refresh();
  return ok();
}

// ───────────────────────── Datos del local ─────────────────────────

export async function guardarAjustes(_prev: Resultado, form: FormData): Promise<Resultado> {
  await exigirSesion();
  const nombre = texto(form, "nombre_local", 60);
  const whatsapp = texto(form, "whatsapp", 30);
  const retiro = texto(form, "texto_retiro", 200);
  if (nombre.length < 2) return error("Escribí el nombre del local.");
  if (whatsapp && !telefonoValido(whatsapp)) return error("Revisá el WhatsApp: con código de área.");
  await (await db())
    .prepare("UPDATE ajustes SET nombre_local = ?, whatsapp = ?, texto_retiro = ? WHERE id = 1")
    .bind(nombre, whatsapp || null, retiro || null)
    .run();
  refresh();
  return ok("Datos del local guardados.");
}
