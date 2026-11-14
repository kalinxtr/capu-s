"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  CLAVE_ELECCION,
  leerEleccion,
  recortarEleccion,
  textoRecorte,
  textoStock,
  type Eleccion,
  type Recorte,
} from "@/lib/eleccion";
import { pesos } from "@/lib/formato";
import { HojaPedido, type Elegido } from "./HojaPedido";

type ProductoPublico = { id: number; nombre: string; precio: number; stock: number; imagen: string | null };
type Seccion = { id: number; nombre: string; productos: ProductoPublico[] };

export function Pedir({ secciones, textoRetiro }: { secciones: Seccion[]; textoRetiro: string | null }) {
  const [cantidades, setCantidades] = useState<Eleccion>({});
  const [abierto, setAbierto] = useState(false);
  const [recortes, setRecortes] = useState<Recorte[]>([]);
  const [anuncio, setAnuncio] = useState("");
  const [saborVisible, setSaborVisible] = useState<number | null>(secciones[0]?.id ?? null);

  const productos = useMemo(() => secciones.flatMap((s) => s.productos), [secciones]);
  /** "Oreo · Paleta": el nombre solo ("Paleta") se repite entre sabores. */
  const completo = useMemo(
    () => new Map(secciones.flatMap((s) => s.productos.map((p) => [p.id, `${s.nombre} · ${p.nombre}`] as const))),
    [secciones],
  );

  // La elección se guarda en el navegador (sobrevive a una recarga) y se ajusta al stock cada vez
  // que la lista se actualiza: si otra persona pidió lo último, se recorta y se avisa.
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
    const r = recortarEleccion(
      base,
      productos.map((p) => ({ id: p.id, nombre: completo.get(p.id)!, stock: p.stock })),
    );
    if (primera || r.cambio) setCantidades(r.eleccion);
    if (r.recortes.length) setRecortes(r.recortes);
  }, [productos, completo]);

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

  // Sabor visible al scrollear: se marca en la barra de sabores.
  const nav = useRef<HTMLElement>(null);
  useEffect(() => {
    const obs = new IntersectionObserver(
      (entradas) => {
        const visible = entradas.find((e) => e.isIntersecting);
        if (visible) setSaborVisible(Number(visible.target.getAttribute("data-sabor")));
      },
      { rootMargin: "-80px 0px -60% 0px" },
    );
    document.querySelectorAll("section[data-sabor]").forEach((s) => obs.observe(s));
    return () => obs.disconnect();
  }, [secciones]);
  useEffect(() => {
    nav.current
      ?.querySelector<HTMLElement>(`[data-sabor="${saborVisible}"]`)
      ?.scrollIntoView({
        block: "nearest",
        inline: "center",
        behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth",
      });
  }, [saborVisible]);

  const elegidos: Elegido[] = productos
    .filter((p) => (cantidades[p.id] ?? 0) > 0)
    .map((p) => ({ id: p.id, nombre: completo.get(p.id)!, precio: p.precio, cantidad: cantidades[p.id] }));
  const unidades = elegidos.reduce((t, p) => t + p.cantidad, 0);
  const total = elegidos.reduce((t, p) => t + p.precio * p.cantidad, 0);

  useEffect(() => {
    if (unidades === 0) setAbierto(false);
  }, [unidades]);

  // Se lee y actualiza el ref en el momento: dos toques rápidos antes de re-renderizar suman 2, no 1.
  const cambiar = (p: ProductoPublico, delta: number) => {
    const c = actuales.current;
    const n = Math.max(0, Math.min(p.stock, (c[p.id] ?? 0) + delta));
    const { [p.id]: _, ...resto } = c;
    const nuevo = n ? { ...resto, [p.id]: n } : resto;
    actuales.current = nuevo;
    setCantidades(nuevo);
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
      <button type="button" className="link" onClick={() => setRecortes([])}>
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

      {!abierto && avisoRecortes}

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
        abierto={abierto}
        onCerrar={() => setAbierto(false)}
        elegidos={elegidos}
        unidades={unidades}
        total={total}
        textoRetiro={textoRetiro}
        aviso={abierto && avisoRecortes}
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
