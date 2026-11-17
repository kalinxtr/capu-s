import { db } from "@/lib/cloudflare";
import { leerAjustes, leerCatalogo } from "@/lib/datos";
import { numero } from "@/lib/formato";
import { requerirSesion } from "@/lib/sesion";
import { resumenStock } from "@/lib/stock";
import type { Producto, Sabor } from "@/lib/tipos";
import {
  activarProducto,
  activarSabor,
  crearProducto,
  crearSabor,
  editarProducto,
  editarSabor,
  guardarAjustes,
  moverProducto,
  moverSabor,
} from "../../acciones";
import { FotoProducto } from "../../_componentes/foto";
import { BotonSeguro, FormAccion } from "../../_componentes/formularios";
import { ControlStock } from "../../_componentes/stock";

export const metadata = { title: "Stock" };

export default async function Stock() {
  await requerirSesion();
  const DB = await db();
  const [{ sabores, productos }, ajustes] = await Promise.all([leerCatalogo(DB, true), leerAjustes(DB)]);
  const activos = sabores.filter((s) => s.activo);
  const archivados = sabores.filter((s) => !s.activo);
  const nombreSabor = new Map(sabores.map((s) => [s.id, s.nombre]));
  const enPagina = productos.filter((p) => p.activo && activos.some((s) => s.id === p.sabor_id));
  const prodArchivados = productos.filter((p) => !p.activo && activos.some((s) => s.id === p.sabor_id));
  const resumen = resumenStock(enPagina);
  const sinStock = enPagina.filter((p) => p.stock === 0);

  return (
    <main>
      <h1>Stock</h1>
      <div className="resumen-stock">
        <p>
          <strong>{resumen.activos}</strong> {resumen.activos === 1 ? "producto" : "productos"} en la página ·{" "}
          <strong>{resumen.sinStock}</strong> sin stock · <a href="#datos-local">Datos del local ↓</a>
        </p>
        {sinStock.length > 0 && (
          <p className="ayuda">
            Sin stock:{" "}
            {sinStock.map((p, i) => (
              <span key={p.id}>
                {i > 0 && ", "}
                <a href={`#producto-${p.id}`}>
                  {nombreSabor.get(p.sabor_id)} · {p.nombre}
                </a>
              </span>
            ))}
          </p>
        )}
      </div>

      {activos.map((s, i) => (
        <SeccionSabor
          key={s.id}
          sabor={s}
          primero={i === 0}
          ultimo={i === activos.length - 1}
          productos={productos.filter((p) => p.sabor_id === s.id && p.activo)}
        />
      ))}

      <section className="tarjeta">
        <h2>Agregar sabor</h2>
        <FormAccion accion={crearSabor} className="fila">
          <input name="nombre" placeholder="Ej. Frutilla" aria-label="Nombre del sabor nuevo" required minLength={2} maxLength={40} />
          <button className="boton-principal">Agregar</button>
        </FormAccion>
      </section>

      {(archivados.length > 0 || prodArchivados.length > 0) && (
        <details className="tarjeta">
          <summary>Archivados ({archivados.length + prodArchivados.length})</summary>
          <ul className="archivados">
            {archivados.map((s) => (
              <li key={`s${s.id}`}>
                <span>Sabor: {s.nombre}</span>
                <FormAccion accion={activarSabor} ocultos={{ id: s.id, activo: 1 }}>
                  <button className="boton">Reactivar</button>
                </FormAccion>
              </li>
            ))}
            {prodArchivados.map((p) => (
              <li key={`p${p.id}`}>
                <span>
                  {nombreSabor.get(p.sabor_id)} · {p.nombre}
                </span>
                <FormAccion accion={activarProducto} ocultos={{ id: p.id, activo: 1 }}>
                  <button className="boton">Reactivar</button>
                </FormAccion>
              </li>
            ))}
          </ul>
        </details>
      )}

      <section className="tarjeta" id="datos-local">
        <h2>Datos del local</h2>
        <FormAccion accion={guardarAjustes} soloSiCambia>
          <label>
            Nombre del local
            <input name="nombre_local" defaultValue={ajustes.nombre_local} required minLength={2} maxLength={60} />
          </label>
          <label>
            WhatsApp del local
            <span className="ayuda">Para que los clientes te avisen su pedido.</span>
            <input name="whatsapp" type="tel" defaultValue={ajustes.whatsapp ?? ""} inputMode="tel" placeholder="Ej. 11 2345 6789" />
          </label>
          <label>
            Indicaciones para retirar
            <span className="ayuda">Se muestran arriba de la lista y al elegir retiro.</span>
            <input name="texto_retiro" defaultValue={ajustes.texto_retiro ?? ""} maxLength={200} placeholder="Ej. Av. Siempreviva 742, de 14 a 20 h" />
          </label>
          <div className="fila">
            <button className="boton-principal guardar-si-cambia">Guardar</button>
            <span className="sin-guardar">Sin guardar</span>
          </div>
        </FormAccion>
      </section>
    </main>
  );
}

function Mover({
  accion,
  id,
  nombre,
  primero,
  ultimo,
}: {
  accion: typeof moverSabor;
  id: number;
  nombre: string;
  primero: boolean;
  ultimo: boolean;
}) {
  return (
    <div className="mover">
      <FormAccion accion={accion} ocultos={{ id, dir: "arriba" }}>
        <button className="redondo chico" aria-label={`Subir ${nombre}`} disabled={primero}>
          ↑
        </button>
      </FormAccion>
      <FormAccion accion={accion} ocultos={{ id, dir: "abajo" }}>
        <button className="redondo chico" aria-label={`Bajar ${nombre}`} disabled={ultimo}>
          ↓
        </button>
      </FormAccion>
    </div>
  );
}

function SeccionSabor({
  sabor,
  productos,
  primero,
  ultimo,
}: {
  sabor: Sabor;
  productos: Producto[];
  primero: boolean;
  ultimo: boolean;
}) {
  return (
    <section className="tarjeta sabor-admin" aria-label={`Sabor ${sabor.nombre}`}>
      <div className="sabor-cabeza">
        <FormAccion accion={editarSabor} ocultos={{ id: sabor.id }} className="fila sabor-nombre" soloSiCambia>
          <input name="nombre" defaultValue={sabor.nombre} aria-label="Nombre del sabor" className="titulo" required minLength={2} maxLength={40} />
          <button className="boton-principal guardar-si-cambia">Guardar</button>
          <span className="sin-guardar">Sin guardar</span>
        </FormAccion>
        <Mover accion={moverSabor} id={sabor.id} nombre={sabor.nombre} primero={primero} ultimo={ultimo} />
        <FormAccion accion={activarSabor} ocultos={{ id: sabor.id, activo: 0 }}>
          <BotonSeguro className="link" pregunta="¿Archivar? Sale de la página">
            Archivar sabor
          </BotonSeguro>
        </FormAccion>
      </div>

      {productos.length === 0 && <p className="ayuda">Sin productos todavía: no aparece en la página.</p>}
      <ul className="productos-admin">
        {productos.map((p, i) => {
          const completo = `${sabor.nombre} · ${p.nombre}`;
          return (
            <li key={p.id} id={`producto-${p.id}`} className="fila-producto" data-sin-stock={p.stock === 0 || undefined}>
              <FotoProducto id={p.id} imagen={p.imagen} nombre={completo} />
              <FormAccion accion={editarProducto} ocultos={{ id: p.id }} className="fila producto-datos" soloSiCambia>
                <input name="nombre" defaultValue={p.nombre} aria-label={`Nombre de ${completo}`} required minLength={2} maxLength={60} />
                <span className="campo-pesos">
                  <span aria-hidden>$</span>
                  <input name="precio" defaultValue={numero(p.precio)} inputMode="numeric" aria-label={`Precio de ${completo} en pesos`} />
                </span>
                <button className="boton-principal guardar-si-cambia">Guardar</button>
                <span className="sin-guardar">Sin guardar</span>
              </FormAccion>
              <ControlStock id={p.id} nombre={completo} stock={p.stock} />
              <div className="producto-menu">
                <Mover accion={moverProducto} id={p.id} nombre={completo} primero={i === 0} ultimo={i === productos.length - 1} />
                <FormAccion accion={activarProducto} ocultos={{ id: p.id, activo: 0 }}>
                  <BotonSeguro className="link" pregunta="¿Archivar? Sale de la página">
                    Archivar
                  </BotonSeguro>
                </FormAccion>
              </div>
            </li>
          );
        })}
      </ul>

      <details className="agregar">
        <summary>+ Agregar producto a {sabor.nombre}</summary>
        <FormAccion accion={crearProducto} ocultos={{ sabor_id: sabor.id }} className="fila">
          <input name="nombre" placeholder="Nombre (ej. Paleta)" aria-label="Nombre del producto" required minLength={2} maxLength={60} />
          <span className="campo-pesos">
            <span aria-hidden>$</span>
            <input name="precio" placeholder="Precio" aria-label="Precio en pesos" inputMode="numeric" required />
          </span>
          <input name="stock" placeholder="Stock" aria-label="Stock inicial" type="number" min={0} className="corto" />
          <button className="boton-principal">Agregar</button>
        </FormAccion>
      </details>
    </section>
  );
}
