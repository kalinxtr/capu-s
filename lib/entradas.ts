/** Lectura de campos de formularios del admin. Puro: sin base ni sesión, para poder probarlo. */

/** Entero entre `min` y `max` (inclusive), o null si el campo falta, no es entero o se pasa. */
export function entero(form: FormData, campo: string, min = 0, max = 1_000_000): number | null {
  const v = String(form.get(campo) ?? "").trim();
  if (!/^-?\d+$/.test(v)) return null;
  const n = Number(v);
  return Number.isSafeInteger(n) && n >= min && n <= max ? n : null;
}

/** Texto sin espacios alrededor y recortado a `max` caracteres ("" si falta). */
export function texto(form: FormData, campo: string, max: number): string {
  return String(form.get(campo) ?? "").trim().slice(0, max);
}
