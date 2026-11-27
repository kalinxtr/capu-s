import "server-only";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import { headers } from "next/headers";

export type Env = {
  DB: D1Database;
  IMAGENES: R2Bucket;
  LIMITE_PEDIDOS: RateLimit;
  LIMITE_INGRESO: RateLimit;
  ADMIN_CLAVE?: string;
  SESION_SECRETO?: string;
  /** Aviso por mail de pedidos nuevos (opcionales: sin ellos no se manda nada). */
  RESEND_CLAVE?: string;
  AVISO_MAIL?: string;
  AVISO_REMITENTE?: string;
};

/** Bindings de Cloudflare (D1, R2, rate limiters y secretos). */
export async function env(): Promise<Env> {
  return (await getCloudflareContext({ async: true })).env as unknown as Env;
}

export async function db(): Promise<D1Database> {
  return (await env()).DB;
}

/** IP del visitante según Cloudflare (en local no viene: se usa "local"). */
export async function ipCliente(): Promise<string> {
  return (await headers()).get("cf-connecting-ip") ?? "local";
}

/** true si se pasó del límite. Si el binding no está (algún entorno raro), no frena. */
export async function excedido(limite: RateLimit | undefined, clave: string): Promise<boolean> {
  if (!limite) return false;
  const { success } = await limite.limit({ key: clave });
  return !success;
}
