"use client";

import { useActionState, useEffect, useMemo, useRef, useState } from "react";
import { pesos } from "@/lib/formato";
import type { Entrega } from "@/lib/tipos";
import { crearPedido, type ResultadoPedido } from "./acciones";

type ProductoPublico = { id: number; nombre: string; precio: number; stock: number; imagen: string | null };
type Seccion = { id: number; nombre: string; productos: ProductoPublico[] };

export function Pedir({ secciones, textoRetiro }: { secciones: Seccion[]; textoRetiro: string | null }) {
  const [cantidades, setCantidades] = useState<Record<number, number>>({});
  const [abierto, setAbierto] = useState(false);
  const [entrega, setEntrega] = useState<Entrega>("retiro");
  const [res, accion, enviando] = useActionState<ResultadoPedido, FormData>(crearPedido, null);
  const formRef = useRef<HTMLFormElement>(null);

  const productos = useMemo(() => secciones.flatMap((s) => s.productos), [secciones]);

  // Si el stock bajó mientras elegía (otra persona pidió), se recortan las cantidades.
  useEffect(() => {
    setCantidades((c) => {
      let cambio = false;
      const nuevo: Record<number, number> = {};
      for (const p of productos) {
        const n = Math.min(c[p.id] ?? 0, p.stock);
        if (n !== (c[p.id] ?? 0)) cambio = true;
        if (n > 0) nuevo[p.id] = n;
      }
      return cambio ? nuevo : c;
    });
  }, [productos]);

  const elegidos = productos.filter((p) => (cantidades[p.id] ?? 0) > 0);
  const unidades = elegidos.reduce((t, p) => t + cantidades[p.id], 0);
  const total = elegidos.reduce((t, p) => t + p.precio * cantidades[p.id], 0);

  const cambiar = (id: number, delta: number, max: number) =>
    setCantidades((c) => {
      const n = Math.max(0, Math.min(max, (c[id] ?? 0) + delta));
      const { [id]: _, ...resto } = c;
      return n ? { ...resto, [id]: n } : resto;
    });

  if (res?.ok) return <Confirmacion pedido={res} />;

  return (
    <>
      <nav className="sabores-nav" aria-label="Sabores">
        {secciones.map((s) => (
          <a key={s.id} href={`#sabor-${s.id}`}>
            {s.nombre}
          </a>
        ))}
      </nav>

      {secciones.map((s) => (
        <section key={s.id} id={`sabor-${s.id}`} className="sabor">
          <h2>{s.nombre}</h2>
          <ul>
            {s.productos.map((p) => {
              const n = cantidades[p.id] ?? 0;
              const agotado = p.stock === 0;
              return (
                <li key={p.id} className={agotado ? "producto agotado" : "producto"} aria-disabled={agotado}>
                  <Foto imagen={p.imagen} nombre={s.nombre} />
                  <div className="producto-info">
                    <strong>{p.nombre}</strong>
                    <span className="precio">{pesos(p.precio)}</span>
                    <span className="stock">{agotado ? "Sin stock" : `Quedan ${p.stock}`}</span>
                  </div>
                  {!agotado && (
                    <div className="contador">
                      <button type="button" onClick={() => cambiar(p.id, -1, p.stock)} disabled={n === 0} aria-label={`Quitar ${p.nombre}`}>
                        −
                      </button>
                      <output aria-live="polite">{n}</output>
                      <button type="button" onClick={() => cambiar(p.id, 1, p.stock)} disabled={n >= p.stock} aria-label={`Agregar ${p.nombre}`}>
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

      <div className="espacio-barra" />

      {unidades > 0 && !abierto && (
        <div className="barra">
          <span>
            {unidades} {unidades === 1 ? "paleta" : "paletas"} · <strong>{pesos(total)}</strong>
          </span>
          <button type="button" className="boton-principal" onClick={() => setAbierto(true)}>
            Pedir
          </button>
        </div>
      )}

      {abierto && (
        <div className="hoja-fondo" onClick={(e) => e.target === e.currentTarget && setAbierto(false)}>
          <form ref={formRef} action={accion} className="hoja">
            <div className="hoja-titulo">
              <h2>Tu pedido</h2>
              <button type="button" className="cerrar" onClick={() => setAbierto(false)} aria-label="Volver a la lista">
                ×
              </button>
            </div>
            <ul className="resumen">
              {elegidos.map((p) => (
                <li key={p.id}>
                  <span>
                    {cantidades[p.id]} × {secciones.find((s) => s.productos.includes(p))?.nombre} · {p.nombre}
                  </span>
                  <span>{pesos(p.precio * cantidades[p.id])}</span>
                  <input type="hidden" name={`cant_${p.id}`} value={cantidades[p.id]} />
                </li>
              ))}
              <li className="total">
                <span>Total</span>
                <span>{pesos(total)}</span>
              </li>
            </ul>

            <label>
              Nombre
              <input name="nombre" required minLength={2} maxLength={60} autoComplete="name" />
            </label>
            <label>
              Teléfono / WhatsApp
              <input name="telefono" required inputMode="tel" autoComplete="tel" placeholder="Ej. 11 2345 6789" />
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
              <label>
                Dirección
                <input name="direccion" required minLength={4} maxLength={160} autoComplete="street-address" />
              </label>
            )}
            <label>
              Nota (opcional)
              <textarea name="nota" maxLength={300} rows={2} />
            </label>

            {res && !res.ok && (
              <p className="error" role="alert">
                {res.error}
              </p>
            )}
            <button className="boton-principal" disabled={enviando || unidades === 0}>
              {enviando ? "Enviando…" : `Confirmar pedido · ${pesos(total)}`}
            </button>
          </form>
        </div>
      )}
    </>
  );
}

function Foto({ imagen, nombre }: { imagen: string | null; nombre: string }) {
  if (imagen) return <img className="foto" src={`/img/${imagen}`} alt="" loading="lazy" width={72} height={72} />;
  return (
    <span className="foto foto-vacia" aria-hidden>
      {nombre.slice(0, 1)}
    </span>
  );
}

function Confirmacion({ pedido }: { pedido: Extract<ResultadoPedido, { ok: true }> }) {
  return (
    <section className="confirmacion">
      <h2>¡Pedido #{pedido.id} recibido!</h2>
      <ul className="resumen">
        {pedido.items.map((i) => (
          <li key={i.nombre}>
            <span>
              {i.cantidad} × {i.nombre}
            </span>
            <span>{pesos(i.precio * i.cantidad)}</span>
          </li>
        ))}
        <li className="total">
          <span>Total</span>
          <span>{pesos(pedido.total)}</span>
        </li>
      </ul>
      {pedido.whatsapp && (
        <a className="boton-principal" href={pedido.whatsapp} target="_blank" rel="noopener noreferrer">
          Avisar por WhatsApp
        </a>
      )}
      <p className="ayuda">
        Guardá este link para ver cómo va tu pedido: <a href={`/pedido/${pedido.token}`}>ver mi pedido</a>
      </p>
      <a href="/" className="boton-secundario">
        Hacer otro pedido
      </a>
    </section>
  );
}
