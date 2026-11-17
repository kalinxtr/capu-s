import "server-only";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { cache } from "react";
import { env } from "./cloudflare";
import { firmarSesion, iguales, sesionValida } from "./firma";

const COOKIE = "sesion";
/** La sesión dura 30 días fijos, como en Lavadito: la clave se escribe una vez por dispositivo. */
const DURACION_S = 60 * 60 * 24 * 30;

async function secretos() {
  const e = await env();
  if (!e.ADMIN_CLAVE || !e.SESION_SECRETO || e.SESION_SECRETO.length < 32) {
    throw new Error("Faltan los secretos ADMIN_CLAVE y SESION_SECRETO (32+ caracteres) en el servidor.");
  }
  return { clave: e.ADMIN_CLAVE, secreto: e.SESION_SECRETO };
}

export async function claveCorrecta(intento: string): Promise<boolean> {
  const { clave, secreto } = await secretos();
  // Se comparan las firmas (largo fijo) para no filtrar el largo de la clave.
  const vence = 0;
  return iguales(await firmarSesion(secreto, intento, vence), await firmarSesion(secreto, clave, vence));
}

export async function iniciarSesion() {
  const { clave, secreto } = await secretos();
  const vence = Math.floor(Date.now() / 1000) + DURACION_S;
  (await cookies()).set(COOKIE, await firmarSesion(secreto, clave, vence), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: DURACION_S,
  });
}

export async function cerrarSesion() {
  (await cookies()).delete(COOKIE);
}

/**
 * Memorizada por request: la metadata, el layout y la página la consultan sin repetir el HMAC.
 * Ojo: no llamarla antes de `iniciarSesion()`/`cerrarSesion()` en la misma acción, porque
 * después devolvería el valor viejo.
 */
export const haySesion = cache(async (): Promise<boolean> => {
  const valor = (await cookies()).get(COOKIE)?.value;
  if (!valor) return false;
  const { clave, secreto } = await secretos();
  return sesionValida(secreto, clave, valor, Date.now());
});

/** Para páginas del admin: sin sesión, manda a ingresar. */
export async function requerirSesion() {
  if (!(await haySesion())) redirect("/admin/ingresar");
}

/**
 * Para Server Actions del admin: se pueden llamar por POST directo, así que se verifica adentro.
 * Sin sesión (venció o cambió la clave) no es un error inesperado: se manda a ingresar.
 * En una Server Action, `redirect` lo maneja Next (header `x-action-redirect`), también si se
 * la llama desde una transición del cliente.
 */
export async function exigirSesion() {
  if (!(await haySesion())) redirect("/admin/ingresar");
}
