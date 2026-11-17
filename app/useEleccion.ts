"use client";

import { useEffect, useRef, useState } from "react";
import { CLAVE_ELECCION, leerEleccion, recortarEleccion, type Eleccion, type Recorte } from "@/lib/eleccion";

/** `nombre` es el completo ("Oreo · Paleta"): es el que se usa en los avisos de recorte. */
type Elegible = { id: number; nombre: string; stock: number };

/**
 * Lo que el cliente va eligiendo. Se guarda en el navegador (sobrevive a una recarga) y se ajusta
 * al stock cada vez que la lista se actualiza: si otra persona pidió lo último, se recorta y se avisa.
 * `productos` tiene que ser estable (useMemo): cada referencia nueva vuelve a recortar.
 */
export function useEleccion(productos: Elegible[]) {
  const [cantidades, setCantidades] = useState<Eleccion>({});
  const [recortes, setRecortes] = useState<Recorte[]>([]);

  const cargado = useRef(false);
  const actuales = useRef(cantidades);
  useEffect(() => {
    actuales.current = cantidades;
  }, [cantidades]);

  useEffect(() => {
    let base = actuales.current;
    const primera = !cargado.current;
    if (primera) {
      cargado.current = true;
      try {
        base = leerEleccion(sessionStorage.getItem(CLAVE_ELECCION));
      } catch {
        base = {};
      }
    }
    const r = recortarEleccion(base, productos);
    if (primera || r.cambio) setCantidades(r.eleccion);
    if (r.recortes.length) setRecortes(r.recortes);
  }, [productos]);

  const saltarPrimerGuardado = useRef(true);
  useEffect(() => {
    if (saltarPrimerGuardado.current) {
      saltarPrimerGuardado.current = false;
      return;
    }
    try {
      sessionStorage.setItem(CLAVE_ELECCION, JSON.stringify(cantidades));
    } catch {
      // Modo privado sin almacenamiento: la elección vive solo en esta pantalla.
    }
  }, [cantidades]);

  /**
   * Suma o resta y devuelve la cantidad nueva. Lee y actualiza el ref en el momento:
   * dos toques rápidos antes de re-renderizar suman 2, no 1.
   */
  const cambiar = (id: number, delta: number): number => {
    const p = productos.find((x) => x.id === id);
    if (!p) return 0;
    const c = actuales.current;
    const n = Math.max(0, Math.min(p.stock, (c[id] ?? 0) + delta));
    const { [id]: _, ...resto } = c;
    const nuevo = n ? { ...resto, [id]: n } : resto;
    actuales.current = nuevo;
    setCantidades(nuevo);
    return n;
  };

  return { cantidades, cambiar, recortes, descartarRecortes: () => setRecortes([]) };
}
