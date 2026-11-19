"use client";

import { useEffect, useRef, useSyncExternalStore } from "react";
import type { EstadoPedido } from "@/lib/tipos";
import { cambiarEstado } from "../acciones";
import { useAviso } from "./avisos";
import { useAccion } from "./useAccion";

const datosEstado = (id: number, estado: EstadoPedido) => {
  const fd = new FormData();
  fd.set("id", String(id));
  fd.set("estado", estado);
  return fd;
};

/** Cambia el estado de un pedido. Con `deshacerA`, el aviso trae un botón "Deshacer". */
export function BotonEstado({
  id,
  estado,
  texto,
  principal,
  deshacerA,
}: {
  id: number;
  estado: EstadoPedido;
  texto: string;
  principal?: boolean;
  deshacerA?: EstadoPedido;
}) {
  const { ejecutar, pendiente } = useAccion();
  const avisar = useAviso();

  async function cambiar() {
    const r = await ejecutar(cambiarEstado, datosEstado(id, estado));
    if (r && !r.ok) return avisar({ texto: r.error, tipo: "error" });
    avisar({
      texto: r?.mensaje ?? "Listo.",
      accion: deshacerA && {
        texto: "Deshacer",
        hacer: async () => {
          const d = await ejecutar(cambiarEstado, datosEstado(id, deshacerA));
          if (d && !d.ok) avisar({ texto: d.error, tipo: "error" });
        },
      },
    });
  }

  return (
    <button type="button" className={principal ? "boton-principal" : "boton"} disabled={pendiente} onClick={cambiar}>
      {texto}
    </button>
  );
}

// Último pedido que el admin vio, guardado en su navegador. Lo nuevo desde entonces se marca.
const CLAVE_VISTO = "pizzeria:ultimo-pedido-visto";
let ultimoVisto: number | null = null;
let vistoLeido = false;
const suscriptores = new Set<() => void>();

function leerVisto(): number | null {
  if (!vistoLeido) {
    vistoLeido = true;
    try {
      const n = Number(localStorage.getItem(CLAVE_VISTO));
      ultimoVisto = Number.isInteger(n) && n > 0 ? n : null;
    } catch {
      ultimoVisto = null;
    }
  }
  return ultimoVisto;
}

function guardarVisto(n: number) {
  ultimoVisto = n;
  try {
    localStorage.setItem(CLAVE_VISTO, String(n));
  } catch {
    // Sin almacenamiento: se marca solo durante esta visita.
  }
  suscriptores.forEach((f) => f());
}

function suscribirVisto(f: () => void) {
  suscriptores.add(f);
  return () => {
    suscriptores.delete(f);
  };
}

/** Al salir de la pestaña, todo lo que estaba a la vista pasa a "visto". */
export function RegistrarVistos({ maxId }: { maxId: number }) {
  const max = useRef(maxId);
  useEffect(() => {
    max.current = maxId;
    if (leerVisto() === null && maxId > 0) guardarVisto(maxId); // primera visita: nada es "nuevo"
  }, [maxId]);
  useEffect(() => {
    const marcar = () => {
      if (document.visibilityState === "hidden" && max.current > (leerVisto() ?? 0)) guardarVisto(max.current);
    };
    document.addEventListener("visibilitychange", marcar);
    window.addEventListener("pagehide", marcar);
    return () => {
      document.removeEventListener("visibilitychange", marcar);
      window.removeEventListener("pagehide", marcar);
    };
  }, []);
  return null;
}

export function MarcaNueva({ id }: { id: number }) {
  const visto = useSyncExternalStore(
    suscribirVisto,
    () => leerVisto() ?? Infinity,
    () => Infinity,
  );
  return id > visto ? <span className="marca-nueva">Nuevo</span> : null;
}
