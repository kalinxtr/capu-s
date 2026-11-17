"use client";

import { createContext, useCallback, useContext, useRef, useState, type ReactNode } from "react";

type Aviso = { texto: string; tipo?: "ok" | "error"; accion?: { texto: string; hacer: () => void } };
type AvisoVivo = Aviso & { id: number };

const ContextoAvisos = createContext<(a: Aviso) => void>(() => {});

/** Avisos cortos abajo de la pantalla que se van solos (en vez de mensajes pegados en cada formulario). */
export function Avisos({ children }: { children: ReactNode }) {
  const [avisos, setAvisos] = useState<AvisoVivo[]>([]);
  const siguiente = useRef(1);

  const cerrar = useCallback((id: number) => setAvisos((as) => as.filter((a) => a.id !== id)), []);
  const avisar = useCallback(
    (a: Aviso) => {
      const id = siguiente.current++;
      setAvisos((as) => [...as.slice(-2), { ...a, id }]);
      setTimeout(() => cerrar(id), a.accion ? 7000 : 4000);
    },
    [cerrar],
  );

  return (
    <ContextoAvisos.Provider value={avisar}>
      {children}
      <div className="avisos" role="status" aria-live="polite">
        {avisos.map((a) => (
          <div key={a.id} className={`aviso-flotante${a.tipo === "error" ? " error" : ""}`}>
            <span>{a.texto}</span>
            {a.accion && (
              <button
                type="button"
                className="link"
                onClick={() => {
                  a.accion!.hacer();
                  cerrar(a.id);
                }}
              >
                {a.accion.texto}
              </button>
            )}
            <button type="button" className="cerrar-aviso" aria-label="Cerrar aviso" onClick={() => cerrar(a.id)}>
              ×
            </button>
          </div>
        ))}
      </div>
    </ContextoAvisos.Provider>
  );
}

export const useAviso = () => useContext(ContextoAvisos);
