"use client";

import { unstable_rethrow } from "next/navigation";
import { useTransition } from "react";
import type { Resultado } from "@/lib/tipos";

export type Accion = (prev: Resultado, form: FormData) => Promise<Resultado>;

export const ERROR_INESPERADO = "No se pudo guardar. Revisá la conexión y probá de nuevo.";

/**
 * Única forma de llamar a una Server Action desde el admin.
 * - Corre dentro de una transición (`pendiente` mientras tanto). `antes` va adentro de la misma
 *   transición, para que un `useOptimistic` se vea al instante y se deshaga solo si falla.
 * - Los errores esperados vuelven como `Resultado` (validación, "ya no se puede cancelar").
 *   La sesión vencida no llega acá: la acción redirige a ingresar y eso lo maneja Next.
 * - Un error inesperado (sin red, D1 caída) se convierte en un mensaje en vez de tirar la página
 *   entera al `error.tsx` y perder lo que no estaba guardado. La promesa nunca rechaza.
 */
export function useAccion() {
  const [pendiente, iniciar] = useTransition();

  const ejecutar = (accion: Accion, datos: FormData, antes?: () => void) =>
    new Promise<Resultado>((resolver) => {
      iniciar(async () => {
        antes?.();
        try {
          resolver(await accion(null, datos));
        } catch (e) {
          unstable_rethrow(e);
          console.error(e);
          resolver({ ok: false, error: ERROR_INESPERADO });
        }
      });
    });

  return { ejecutar, pendiente };
}
