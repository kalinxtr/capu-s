"use client";

import { useMemo, useRef, useState } from "react";
import { textoRecorte, textoStock } from "@/lib/eleccion";
import { pesos } from "@/lib/formato";
import { HojaPedido, type Elegido } from "./HojaPedido";
import { useEleccion } from "./useEleccion";
import { useSaborVisible } from "./useSaborVisible";

type ProductoPublico = { id: number; nombre: string; precio: number; stock: number; imagen: string | null };
type Seccion = { id: number; nombre: string; productos: ProductoPublico[] };

export function Pedir({ secciones, textoRetiro }: { secciones: Seccion[]; textoRetiro: string | null }) {
  const [abierto, setAbierto] = useState(false);
  const [anuncio, setAnuncio] = useState("");

  const productos = useMemo(() => secciones.flatMap((s) => s.productos), [secciones]);
  /** "Oreo · Paleta": el nombre solo ("Paleta") se repite entre sabores. */
  const completo = useMemo(
    () => new Map(secciones.flatMap((s) => s.productos.map((p) => [p.id, `${s.nombre} · ${p.nombre}`] as const))),
    [secciones],
  );
  const elegibles = useMemo(
    () => productos.map((p) => ({ id: p.id, nombre: completo.get(p.id)!, stock: p.stock })),
    [productos, completo],
  );
  const { cantidades, cambiar: cambiarCantidad, recortes, descartarRecortes } = useEleccion(elegibles);

  const nav = useRef<HTMLElement>(null);
  const saborVisible = useSaborVisible(secciones, nav);

  const elegidos: Elegido[] = productos
    .filter((p) => (cantidades[p.id] ?? 0) > 0)
    .map((p) => ({ id: p.id, nombre: completo.get(p.id)!, precio: p.precio, cantidad: cantidades[p.id] }));
  const unidades = elegidos.reduce((t, p) => t + p.cantidad, 0);
  const total = elegidos.reduce((t, p) => t + p.precio * p.cantidad, 0);

  // Sin nada elegido (un recorte lo dejó en 0) la hoja se cierra; su onClose deja `abierto` en false,
  // así que no se vuelve a abrir sola al elegir otra vez.
  const hojaAbierta = abierto && unidades > 0;

  const cambiar = (p: ProductoPublico, delta: number) => {
    const n = cambiarCantidad(p.id, delta);
    setAnuncio(`${n} ${completo.get(p.id)}`);
  };

  const avisoRecortes = recortes.length > 0 && (
    <div className="aviso" role="status">
      <p>Cambió el stock mientras elegías:</p>
      <ul>
        {recortes.map((r) => (
          <li key={r.id}>{textoRecorte(r)}</li>
        ))}
      </ul>
      <button type="button" className="link" onClick={descartarRecortes}>
        Entendido
      </button>
    </div>
  );

  const elegidasPorSabor = (s: Seccion) => s.productos.reduce((t, p) => t + (cantidades[p.id] ?? 0), 0);

  return (
    <>
      <nav className="sabores-nav" aria-label="Sabores" ref={nav}>
        {secciones.map((s) => {
          const n = elegidasPorSabor(s);
          return (
            <a key={s.id} href={`#sabor-${s.id}`} data-sabor={s.id} aria-current={saborVisible === s.id ? "true" : undefined}>
              {s.nombre}
              {n > 0 && (
                <span className="cuenta-sabor" aria-label={`${n} ${n === 1 ? "elegida" : "elegidas"}`}>
                  {n}
                </span>
              )}
            </a>
          );
        })}
      </nav>

      {!hojaAbierta && avisoRecortes}

      {secciones.map((s, si) => (
        <section key={s.id} id={`sabor-${s.id}`} data-sabor={s.id} className="sabor" aria-labelledby={`titulo-sabor-${s.id}`}>
          <h2 id={`titulo-sabor-${s.id}`}>{s.nombre}</h2>
          <ul>
            {s.productos.map((p, pi) => {
              const n = cantidades[p.id] ?? 0;
              const agotado = p.stock === 0;
              const stock = textoStock(p.stock);
              const nombre = completo.get(p.id)!;
              return (
                <li key={p.id} className={agotado ? "producto agotado" : n > 0 ? "producto elegido" : "producto"}>
                  <Foto imagen={p.imagen} inicial={s.nombre} temprana={si === 0 && pi < 4} />
                  <div className="producto-info">
                    <strong className="producto-nombre">{p.nombre}</strong>
                    <span className="precio">{pesos(p.precio)}</span>
                    {agotado ? (
                      <span className="chip estado-cancelado">Agotado</span>
                    ) : (
                      <span className={stock.bajo ? "stock bajo" : "stock"}>{stock.texto}</span>
                    )}
                  </div>
                  {!agotado && (
                    <div className="contador" role="group" aria-label={`Cantidad de ${nombre}`}>
                      <button type="button" onClick={() => cambiar(p, -1)} disabled={n === 0} aria-label={`Quitar una ${nombre}`}>
                        −
                      </button>
                      <output>{n}</output>
                      <button
                        type="button"
                        className="mas"
                        onClick={() => cambiar(p, 1)}
                        disabled={n >= p.stock}
                        aria-label={`Agregar una ${nombre}`}
                      >
                        +
                      </button>
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        </section>
      ))}

      <p className="solo-lector" aria-live="polite">
        {anuncio}
      </p>

      <div className="espacio-barra" />

      {unidades > 0 && (
        <div className="barra">
          <span className="barra-total">
            {unidades} {unidades === 1 ? "paleta" : "paletas"} · <strong>{pesos(total)}</strong>
          </span>
          <button type="button" className="boton-principal" onClick={() => setAbierto(true)} aria-haspopup="dialog">
            Pedir
          </button>
        </div>
      )}

      <HojaPedido
        abierto={hojaAbierta}
        onCerrar={() => setAbierto(false)}
        elegidos={elegidos}
        unidades={unidades}
        total={total}
        textoRetiro={textoRetiro}
        aviso={hojaAbierta && avisoRecortes}
      />
    </>
  );
}

function Foto({ imagen, inicial, temprana }: { imagen: string | null; inicial: string; temprana: boolean }) {
  if (imagen)
    return (
      <img
        className="foto"
        src={`/img/${imagen}`}
        alt=""
        loading={temprana ? "eager" : "lazy"}
        decoding="async"
        width={76}
        height={76}
      />
    );
  return (
    <span className="foto foto-vacia" aria-hidden>
      {inicial.slice(0, 1)}
    </span>
  );
}
