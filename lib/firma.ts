/** Firma HMAC-SHA256 en hex con WebCrypto (anda en Workers, Node y el navegador). */
export async function hmac(secreto: string, mensaje: string): Promise<string> {
  const enc = new TextEncoder();
  const clave = await crypto.subtle.importKey("raw", enc.encode(secreto), { name: "HMAC", hash: "SHA-256" }, false, [
    "sign",
  ]);
  const firma = await crypto.subtle.sign("HMAC", clave, enc.encode(mensaje));
  return [...new Uint8Array(firma)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

/** Compara dos textos sin cortar en el primer carácter distinto. */
export function iguales(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let dif = 0;
  for (let i = 0; i < a.length; i++) dif |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return dif === 0;
}

/**
 * Valor de la cookie de sesión: `vence.firma`. La firma incluye la clave del admin,
 * así que cambiar ADMIN_CLAVE corta todas las sesiones abiertas.
 */
export async function firmarSesion(secreto: string, clave: string, vence: number): Promise<string> {
  return `${vence}.${await hmac(secreto, `admin|${vence}|${clave}`)}`;
}

export async function sesionValida(secreto: string, clave: string, valor: string, ahora: number): Promise<boolean> {
  const [venceTxt, firma] = valor.split(".");
  const vence = Number(venceTxt);
  if (!Number.isSafeInteger(vence) || !firma || vence * 1000 < ahora) return false;
  return iguales(await hmac(secreto, `admin|${vence}|${clave}`), firma);
}
