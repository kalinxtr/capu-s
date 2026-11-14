"use client";

import { startTransition, useActionState, useEffect, useRef, useState, type FormEvent, type ReactNode } from "react";
import { CLAVE_CLIENTE, leerDatosCliente, type DatosCliente } from "@/lib/eleccion";
import { pesos } from "@/lib/formato";
import type { CampoPedido } from "@/lib/pedido";
import type { Entrega } from "@/lib/tipos";
import { crearPedido, type ResultadoPedido } from "./acciones";

export type Elegido = { id: number; nombre: string; precio: number; cantidad: number };

/**
 * Hoja con el resumen y los datos del pedido, sobre la misma pantalla de la lista.
 * Es un <dialog> nativo: trae el foco, se cierra con Esc y deja el fondo inerte.
 */
export function HojaPedido({
  abierto,
  onCerrar,
  elegidos,
  unidades,
  total,
  textoRetiro,
  aviso,
}: {
  abierto: boolean;
  onCerrar: () => void;
  elegidos: Elegido[];
  unidades: number;
  total: number;
  textoRetiro: string | null;
  aviso: ReactNode;
}) {
  const [res, accion, enviando] = useActionState<ResultadoPedido, FormData>(crearPedido, null);
  const dialogo = useRef<HTMLDialogElement>(null);
  const titulo = useRef<HTMLHeadingElement>(null);
  const form = useRef<HTMLFormElement>(null);
  const [guardados, setGuardados] = useState<DatosCliente | null>(null);
  const [cargado, setCargado] = useState(false);
  const [entrega, setEntrega] = useState<Entrega>("retiro");

  // Datos recordados del pedido anterior (solo en este navegador).
  useEffect(() => {
    let g: DatosCliente | null = null;
    try {
      g = leerDatosCliente(localStorage.getItem(CLAVE_CLIENTE));
    } catch {
      g = null;
    }
    setGuardados(g);
    if (g) setEntrega(g.entrega);
    setCargado(true);
  }, []);

  useEffect(() => {
    const d = dialogo.current;
    if (!d) return;
    if (abierto && !d.open) {
      d.showModal();
      titulo.current?.focus();
    } else if (!abierto && d.open) {
      d.close();
    }
  }, [abierto]);

  // Si el servidor rechaza un dato, se lleva el foco a ese campo (o al error) y se lo muestra.
  useEffect(() => {
    if (!res || res.ok) return;
    const campo = res.campo && form.current?.elements.namedItem(res.campo);
    const destino = campo instanceof HTMLElement ? campo : document.getElementById("error-pedido");
    destino?.focus();
    destino?.scrollIntoView({ block: "center" });
  }, [res]);

  function recordar(f: HTMLFormElement) {
    const v = (n: string) => String(new FormData(f).get(n) ?? "").trim();
    try {
      if ((f.elements.namedItem("recordar") as HTMLInputElement | null)?.checked) {
        const datos: DatosCliente = { nombre: v("nombre"), telefono: v("telefono"), entrega, direccion: v("direccion") || (guardados?.direccion ?? "") };
        localStorage.setItem(CLAVE_CLIENTE, JSON.stringify(datos));
      } else {
        localStorage.removeItem(CLAVE_CLIENTE);
      }
    } catch {
      // Sin almacenamiento: no se recuerda nada.
    }
  }

  // Se envía a mano: con `action` sola, React vacía el formulario al terminar, y si el servidor
  // devuelve un error el cliente perdería lo que escribió.
  function enviar(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = e.currentTarget;
    recordar(f);
    const datos = new FormData(f);
    startTransition(() => accion(datos));
  }

  const invalido = (c: CampoPedido) => (res && !res.ok && res.campo === c ? true : undefined);
  const describe = (c: CampoPedido) => (invalido(c) ? "error-pedido" : undefined);
  const k = cargado ? "con" : "sin"; // los defaultValue se aplican después de leer lo guardado

  return (
    <dialog
      ref={dialogo}
      className="hoja"
      aria-labelledby="titulo-hoja"
      onClose={onCerrar}
      onClick={(e) => e.target === e.currentTarget && dialogo.current?.close()}
    >
      <form ref={form} action={accion} onSubmit={enviar} className="hoja-contenido">
        <div className="hoja-titulo">
          <h2 id="titulo-hoja" ref={titulo} tabIndex={-1}>
            Tu pedido
          </h2>
          <button type="button" className="cerrar" onClick={() => dialogo.current?.close()} aria-label="Volver a la lista">
            ×
          </button>
        </div>

        {aviso}

        <ul className="resumen">
          {elegidos.map((p) => (
            <li key={p.id}>
              <span>
                {p.cantidad} × {p.nombre}
              </span>
              <span>{pesos(p.precio * p.cantidad)}</span>
              <input type="hidden" name={`cant_${p.id}`} value={p.cantidad} />
            </li>
          ))}
          <li className="total">
            <span>Total</span>
            <span>{pesos(total)}</span>
          </li>
        </ul>

        <label key={`nombre-${k}`}>
          Nombre
          <input
            name="nombre"
            required
            minLength={2}
            maxLength={60}
            autoComplete="name"
            defaultValue={guardados?.nombre}
            aria-invalid={invalido("nombre")}
            aria-describedby={describe("nombre")}
          />
        </label>
        <label key={`tel-${k}`}>
          Teléfono / WhatsApp
          <input
            name="telefono"
            type="tel"
            required
            inputMode="tel"
            autoComplete="tel"
            placeholder="Ej. 11 2345 6789"
            defaultValue={guardados?.telefono}
            aria-invalid={invalido("telefono")}
            aria-describedby={describe("telefono")}
          />
        </label>

        <fieldset className="entrega">
          <legend>¿Cómo lo recibís?</legend>
          <label>
            <input type="radio" name="entrega" value="retiro" checked={entrega === "retiro"} onChange={() => setEntrega("retiro")} />
            Retiro en el local
          </label>
          <label>
            <input type="radio" name="entrega" value="envio" checked={entrega === "envio"} onChange={() => setEntrega("envio")} />
            Envío
          </label>
        </fieldset>
        {entrega === "retiro" && textoRetiro && <p className="ayuda">{textoRetiro}</p>}
        {entrega === "envio" && (
          <label key={`dir-${k}`}>
            Dirección
            <input
              name="direccion"
              required
              minLength={4}
              maxLength={160}
              autoComplete="street-address"
              defaultValue={guardados?.direccion}
              aria-invalid={invalido("direccion")}
              aria-describedby={describe("direccion")}
            />
          </label>
        )}
        <label>
          Nota (opcional)
          <textarea name="nota" maxLength={300} rows={2} aria-invalid={invalido("nota")} aria-describedby={describe("nota")} />
        </label>

        <label className="casilla">
          <input type="checkbox" name="recordar" defaultChecked />
          Recordar mis datos en este celular
        </label>

        <p className="ayuda">Al confirmar te mostramos el link para seguir tu pedido. Después coordinamos por WhatsApp.</p>

        {res && !res.ok && (
          <p className="error" id="error-pedido" role="alert" tabIndex={-1}>
            {res.error}
          </p>
        )}
        <button className="boton-principal" disabled={enviando || unidades === 0}>
          {enviando ? "Enviando…" : `Confirmar pedido · ${pesos(total)}`}
        </button>
      </form>
    </dialog>
  );
}
