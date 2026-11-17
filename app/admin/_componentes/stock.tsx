"use client";

import { useOptimistic, useState } from "react";
import { ajustarStock, fijarStock } from "../acciones";
import { useAccion } from "./useAccion";

type CambioStock = { tipo: "sumar" | "fijar"; n: number };

/**
 * + / − y campo de stock. Los toques se ven al instante (optimista) y viajan como diferencia,
 * así un pedido que entra al mismo tiempo no se pisa. El campo se guarda al salir de él.
 */
export function ControlStock({ id, nombre, stock }: { id: number; nombre: string; stock: number }) {
  const [valor, aplicar] = useOptimistic(stock, (a: number, c: CambioStock) =>
    c.tipo === "sumar" ? Math.max(0, a + c.n) : c.n,
  );
  const [borrador, setBorrador] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const { ejecutar } = useAccion();

  async function enviar(c: CambioStock) {
    setError(null);
    const fd = new FormData();
    fd.set("id", String(id));
    fd.set(c.tipo === "sumar" ? "delta" : "stock", String(c.n));
    const r = await ejecutar(c.tipo === "sumar" ? ajustarStock : fijarStock, fd, () => aplicar(c));
    if (r && !r.ok) setError(r.error);
  }

  function confirmar() {
    if (borrador === null) return;
    const t = borrador.trim();
    setBorrador(null);
    if (/^\d{1,6}$/.test(t) && Number(t) !== valor) enviar({ tipo: "fijar", n: Number(t) });
  }

  const sucio = borrador !== null && borrador !== String(valor);
  return (
    <div className="stock-admin" role="group" aria-label={`Stock de ${nombre}`}>
      <button
        type="button"
        className="redondo"
        aria-label={`Restar uno de ${nombre}`}
        disabled={valor === 0}
        onClick={() => enviar({ tipo: "sumar", n: -1 })}
      >
        −
      </button>
      <input
        className="stock-numero"
        inputMode="numeric"
        aria-label={`Unidades de ${nombre}`}
        value={borrador ?? String(valor)}
        data-sucio={sucio || undefined}
        onFocus={(e) => e.currentTarget.select()}
        onChange={(e) => setBorrador(e.target.value)}
        onBlur={confirmar}
        onKeyDown={(e) => {
          if (e.key === "Enter") e.currentTarget.blur();
          if (e.key === "Escape") setBorrador(null);
        }}
      />
      <button type="button" className="redondo mas" aria-label={`Sumar uno de ${nombre}`} onClick={() => enviar({ tipo: "sumar", n: 1 })}>
        +
      </button>
      {sucio && <span className="sin-guardar">Sin guardar</span>}
      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
