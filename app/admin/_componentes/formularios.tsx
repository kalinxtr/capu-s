"use client";

import { useEffect, useState, type FormEvent, type ReactNode } from "react";
import { useAviso } from "./avisos";
import { useAccion, type Accion } from "./useAccion";

/** ¿Algún campo visible del formulario cambió respecto de su valor inicial? */
function hayCambios(form: HTMLFormElement): boolean {
  return [...form.elements].some(
    (el) => el instanceof HTMLInputElement && el.name && el.type !== "hidden" && el.value !== el.defaultValue,
  );
}

/**
 * Formulario que llama a una Server Action. Los errores se muestran en línea; los mensajes de éxito,
 * como aviso flotante. Con `soloSiCambia`, el botón `.guardar-si-cambia` aparece solo si hay cambios.
 *
 * La acción se llama con `useAccion` (no con useActionState): si la fila desaparece al terminar (archivar,
 * un pedido que cambia de lista), el aviso igual sale, porque lo muestra el proveedor del layout.
 * Si hubo error se conserva lo escrito; si salió bien el formulario vuelve a sus valores por defecto,
 * que ya son los nuevos que mandó el servidor.
 */
export function FormAccion({
  accion,
  ocultos,
  className,
  soloSiCambia,
  id,
  children,
}: {
  accion: Accion;
  ocultos?: Record<string, string | number>;
  className?: string;
  soloSiCambia?: boolean;
  id?: string;
  children: ReactNode;
}) {
  const { ejecutar, pendiente } = useAccion();
  const [error, setError] = useState<string | null>(null);
  const [sucio, setSucio] = useState(false);
  const avisar = useAviso();

  async function enviar(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = e.currentTarget;
    const r = await ejecutar(accion, new FormData(f));
    if (r && !r.ok) return setError(r.error);
    setError(null);
    f.reset();
    setSucio(false);
    if (r?.mensaje) avisar({ texto: r.mensaje });
  }

  const alEscribir = soloSiCambia ? (e: FormEvent<HTMLFormElement>) => setSucio(hayCambios(e.currentTarget)) : undefined;

  return (
    <form
      onSubmit={enviar}
      id={id}
      className={className}
      aria-busy={pendiente}
      onInput={alEscribir}
      data-sucio={(soloSiCambia && sucio) || undefined}
    >
      {ocultos && Object.entries(ocultos).map(([k, v]) => <input key={k} type="hidden" name={k} value={v} />)}
      <fieldset disabled={pendiente} className="sin-borde">
        {children}
      </fieldset>
      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
    </form>
  );
}

/** Botón en dos toques ("Cancelar" → "¿Seguro?") en vez de un diálogo del navegador. */
export function BotonSeguro({ children, pregunta, className }: { children: ReactNode; pregunta: string; className?: string }) {
  const [armado, setArmado] = useState(false);
  useEffect(() => {
    if (!armado) return;
    const t = setTimeout(() => setArmado(false), 4000);
    return () => clearTimeout(t);
  }, [armado]);
  if (!armado)
    return (
      <button type="button" className={className} onClick={() => setArmado(true)}>
        {children}
      </button>
    );
  return (
    <button className={`${className ?? ""} armado`} autoFocus>
      {pregunta}
    </button>
  );
}
