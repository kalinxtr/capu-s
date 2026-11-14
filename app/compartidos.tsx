"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { CLAVE_ELECCION } from "@/lib/eleccion";

/**
 * Refresca la página cada `segundos` mientras está visible. Con la pestaña de fondo refresca cada
 * `oculta` segundos (si se pasa) y, al volver, refresca enseguida si ya pasó el intervalo.
 */
export function Refrescar({ segundos, oculta }: { segundos: number; oculta?: number }) {
  const router = useRouter();
  const ultimo = useRef(0);
  useEffect(() => {
    ultimo.current = Date.now();
    const refrescar = () => {
      ultimo.current = Date.now();
      router.refresh();
    };
    const t = setInterval(() => {
      const visible = document.visibilityState === "visible";
      const espera = (visible ? segundos : oculta) ?? Infinity;
      if (Date.now() - ultimo.current >= espera * 1000 - 500) refrescar();
    }, 5000);
    const alVolver = () => {
      if (document.visibilityState === "visible" && Date.now() - ultimo.current >= segundos * 1000) refrescar();
    };
    document.addEventListener("visibilitychange", alVolver);
    return () => {
      clearInterval(t);
      document.removeEventListener("visibilitychange", alVolver);
    };
  }, [router, segundos, oculta]);
  return null;
}

/** "Compartir link" en el celular (menú del sistema) o "Copiar link" en la compu. */
export function CompartirLink({ ruta, titulo }: { ruta: string; titulo: string }) {
  const [puedeCompartir, setPuedeCompartir] = useState(false);
  const [copiado, setCopiado] = useState(false);
  const [manual, setManual] = useState<string | null>(null);

  useEffect(() => setPuedeCompartir(typeof navigator.share === "function"), []);
  useEffect(() => {
    if (!copiado) return;
    const t = setTimeout(() => setCopiado(false), 2500);
    return () => clearTimeout(t);
  }, [copiado]);

  async function compartir() {
    const url = location.origin + ruta;
    if (puedeCompartir) {
      try {
        await navigator.share({ title: titulo, url });
      } catch {
        // El cliente cerró el menú: no pasa nada.
      }
      return;
    }
    try {
      await navigator.clipboard.writeText(url);
      setCopiado(true);
    } catch {
      setManual(url);
    }
  }

  return (
    <div className="compartir">
      <button type="button" className="boton-secundario" onClick={compartir}>
        {puedeCompartir ? "Compartir link" : "Copiar link"}
      </button>
      <span role="status" className="ok">
        {copiado ? "¡Link copiado!" : ""}
      </span>
      {manual && (
        <input readOnly value={manual} aria-label="Link del pedido" autoFocus onFocus={(e) => e.currentTarget.select()} />
      )}
    </div>
  );
}

/** Al confirmar el pedido se borra la elección guardada en el navegador. */
export function LimpiarBorrador() {
  useEffect(() => {
    try {
      sessionStorage.removeItem(CLAVE_ELECCION);
    } catch {
      // Sin almacenamiento (modo privado): no hay nada que borrar.
    }
  }, []);
  return null;
}
