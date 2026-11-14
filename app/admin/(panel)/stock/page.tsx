import { db } from "@/lib/cloudflare";
import { leerAjustes, leerCatalogo } from "@/lib/datos";
import { requerirSesion } from "@/lib/sesion";
import type { Producto, Sabor } from "@/lib/tipos";
import {
  activarProducto,
  activarSabor,
  ajustarStock,
  crearProducto,
  crearSabor,
  editarProducto,
  editarSabor,
  fijarStock,
  guardarAjustes,
  quitarFoto,
  subirFoto,
} from "../../acciones";
import { FormAccion, FotoProducto } from "../../componentes";

export default async function Stock() {
  await requerirSesion();
  const DB = await db();
  const [{ sabores, productos }, ajustes] = await Promise.all([leerCatalogo(DB, true), leerAjustes(DB)]);
  const activos = sabores.filter((s) => s.activo);
  const archivados = sabores.filter((s) => !s.activo);
  const prodArchivados = productos.filter((p) => !p.activo && sabores.find((s) => s.id === p.sabor_id)?.activo);

  return (
    <main>
      <h1>Stock</h1>
      {activos.map((s) => (
        <SeccionSabor key={s.id} sabor={s} productos={productos.filter((p) => p.sabor_id === s.id && p.activo)} />
      ))}

      <section className="tarjeta">
        <h2>Agregar sabor</h2>
        <FormAccion accion={crearSabor} className="fila">
          <input name="nombre" placeholder="Ej. Frutilla" required minLength={2} maxLength={40} />
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
                  {sabores.find((s) => s.id === p.sabor_id)?.nombre} · {p.nombre}
                </span>
                <FormAccion accion={activarProducto} ocultos={{ id: p.id, activo: 1 }}>
                  <button className="boton">Reactivar</button>
                </FormAccion>
              </li>
            ))}
          </ul>
        </details>
      )}

      <section className="tarjeta">
        <h2>Datos del local</h2>
        <FormAccion accion={guardarAjustes} key={JSON.stringify(ajustes)}>
          <label>
            Nombre del local
            <input name="nombre_local" defaultValue={ajustes.nombre_local} required minLength={2} maxLength={60} />
          </label>
          <label>
            WhatsApp del local (para que los clientes avisen su pedido)
            <input name="whatsapp" defaultValue={ajustes.whatsapp ?? ""} inputMode="tel" placeholder="Ej. 11 2345 6789" />
          </label>
          <label>
            Indicaciones para retirar (se muestran al elegir retiro)
            <input name="texto_retiro" defaultValue={ajustes.texto_retiro ?? ""} maxLength={200} placeholder="Ej. Av. Siempreviva 742, de 14 a 20 h" />
          </label>
          <button className="boton-principal">Guardar</button>
        </FormAccion>
      </section>
    </main>
  );
}

function SeccionSabor({ sabor, productos }: { sabor: Sabor; productos: Producto[] }) {
  return (
    <section className="tarjeta sabor-admin">
      <div className="sabor-cabeza">
        <FormAccion accion={editarSabor} ocultos={{ id: sabor.id }} className="fila" key={`${sabor.nombre}-${sabor.orden}`}>
          <input name="nombre" defaultValue={sabor.nombre} aria-label="Nombre del sabor" className="titulo" required minLength={2} maxLength={40} />
          <input name="orden" defaultValue={sabor.orden} aria-label="Orden" type="number" min={0} className="corto" title="Orden en la lista" />
          <button className="boton">Guardar</button>
        </FormAccion>
        <FormAccion accion={activarSabor} ocultos={{ id: sabor.id, activo: 0 }}>
          <button className="link">Archivar sabor</button>
        </FormAccion>
      </div>

      {productos.length === 0 && <p className="ayuda">Sin productos todavía: no aparece en la página.</p>}
      <ul className="productos-admin">
        {productos.map((p) => (
          <li key={p.id} className={p.stock === 0 ? "sin-stock" : ""}>
            <FotoProducto id={p.id} imagen={p.imagen} subir={subirFoto} quitar={quitarFoto} />
            <FormAccion accion={editarProducto} ocultos={{ id: p.id }} className="fila producto-datos" key={`${p.nombre}-${p.precio}`}>
              <input name="nombre" defaultValue={p.nombre} aria-label="Nombre" required minLength={2} maxLength={60} />
              <input name="precio" defaultValue={p.precio} aria-label="Precio" inputMode="numeric" className="corto" />
              <button className="boton">Guardar</button>
            </FormAccion>
            <div className="stock-admin">
              <FormAccion accion={ajustarStock} ocultos={{ id: p.id, delta: -1 }}>
                <button className="redondo" aria-label={`Restar uno de ${p.nombre}`} disabled={p.stock === 0}>
                  −
                </button>
              </FormAccion>
              <FormAccion accion={fijarStock} ocultos={{ id: p.id }} key={`stock-${p.stock}`}>
                <input name="stock" defaultValue={p.stock} type="number" min={0} aria-label={`Stock de ${p.nombre}`} className="stock-numero" />
              </FormAccion>
              <FormAccion accion={ajustarStock} ocultos={{ id: p.id, delta: 1 }}>
                <button className="redondo" aria-label={`Sumar uno de ${p.nombre}`}>
                  +
                </button>
              </FormAccion>
            </div>
            <FormAccion accion={activarProducto} ocultos={{ id: p.id, activo: 0 }}>
              <button className="link">Archivar</button>
            </FormAccion>
          </li>
        ))}
      </ul>

      <details className="agregar">
        <summary>+ Agregar producto a {sabor.nombre}</summary>
        <FormAccion accion={crearProducto} ocultos={{ sabor_id: sabor.id }} className="fila">
          <input name="nombre" placeholder="Nombre (ej. Paleta)" required minLength={2} maxLength={60} />
          <input name="precio" placeholder="Precio" inputMode="numeric" required className="corto" />
          <input name="stock" placeholder="Stock" type="number" min={0} className="corto" />
          <button className="boton-principal">Agregar</button>
        </FormAccion>
      </details>
    </section>
  );
}
