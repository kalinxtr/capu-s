/**
 * Lado mayor de las fotos de productos. Se muestran a 76 px (64 px en el admin); 320 cubre
 * pantallas 3x con margen, sin bajar 10 veces más píxeles de los que se ven.
 */
export const LADO_FOTO = 320;

const TIPOS_FOTO = { "image/webp": "webp", "image/jpeg": "jpg", "image/png": "png" } as const;
type TipoFoto = keyof typeof TIPOS_FOTO;

/**
 * Lee la foto que manda el admin como data URL (base64): un archivo binario dentro de una
 * Server Action se pierde en el Worker (ver obsidian/Stack.md). Null si no es WebP, JPG o PNG
 * en base64 válido. El tope de tamaño lo decide la acción.
 */
export function leerFotoDataUrl(
  valor: string,
): { tipo: TipoFoto; ext: (typeof TIPOS_FOTO)[TipoFoto]; bytes: Uint8Array } | null {
  const m = /^data:(image\/(?:webp|jpeg|png));base64,([A-Za-z0-9+/]+=*)$/.exec(valor);
  if (!m) return null;
  const tipo = m[1] as TipoFoto;
  let binario: string;
  try {
    binario = atob(m[2]);
  } catch {
    return null; // Largo o relleno inválido: atob tira.
  }
  return { tipo, ext: TIPOS_FOTO[tipo], bytes: Uint8Array.from(binario, (c) => c.charCodeAt(0)) };
}

/** Medidas para achicar una foto a `lado` px de lado mayor, sin agrandarla y sin dejar un lado en 0. */
export function medidaAchicada(ancho: number, alto: number, lado = LADO_FOTO): { ancho: number; alto: number } {
  const escala = Math.min(1, lado / Math.max(ancho, alto));
  return { ancho: Math.max(1, Math.round(ancho * escala)), alto: Math.max(1, Math.round(alto * escala)) };
}
