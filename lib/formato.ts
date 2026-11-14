/** Montos en pesos enteros, nunca decimales (como Lavadito). */
const miles = new Intl.NumberFormat("es-AR", { maximumFractionDigits: 0 });

/** "$ 20.000" */
export function pesos(n: number): string {
  return "$ " + miles.format(Math.round(n));
}

/** Convierte lo que escribe el usuario ("2.500", "$2500") a entero. */
export function parsePesos(s: string): number | null {
  const limpio = s.replace(/[^\d]/g, "");
  if (!limpio) return null;
  const n = Number(limpio);
  return Number.isSafeInteger(n) ? n : null;
}

const fechaHora = new Intl.DateTimeFormat("es-AR", {
  timeZone: "America/Argentina/Buenos_Aires",
  day: "2-digit",
  month: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
});

/** "13/11 18:40" en hora argentina (las fechas se guardan en milisegundos UTC). */
export function fechaCorta(ms: number): string {
  return fechaHora.format(new Date(ms)).replace(",", "");
}

/**
 * Normaliza un teléfono argentino al formato de wa.me: 549 + área + número.
 * Mejor esfuerzo (copiado de Lavadito): si no reconoce el formato, devuelve solo los dígitos.
 */
export function normalizarTelefono(entrada: string): string {
  let d = entrada.replace(/\D/g, "");
  if (d.startsWith("00")) d = d.slice(2);
  if (d.startsWith("54")) {
    d = d.slice(2);
    if (d.startsWith("9")) d = d.slice(1);
  }
  if (d.startsWith("0")) d = d.slice(1);
  if (d.length === 12) {
    for (const largoArea of [2, 3, 4]) {
      if (d.slice(largoArea, largoArea + 2) === "15") {
        d = d.slice(0, largoArea) + d.slice(largoArea + 2);
        break;
      }
    }
  }
  if (d.length === 10) return "549" + d;
  return d;
}

export function telefonoValido(entrada: string): boolean {
  const d = entrada.replace(/\D/g, "");
  return d.length >= 8 && d.length <= 15;
}

export function linkWhatsApp(telefono: string, mensaje: string): string {
  return `https://wa.me/${normalizarTelefono(telefono)}?text=${encodeURIComponent(mensaje)}`;
}
