import { connection } from "next/server";
import { db } from "@/lib/cloudflare";
import { leerAjustes, leerCatalogo } from "@/lib/datos";
import { Pedir } from "./Pedir";

export default async function Inicio() {
  await connection(); // el stock cambia todo el tiempo: siempre se lee de la base
  const DB = await db();
  const [{ sabores, productos }, ajustes] = await Promise.all([leerCatalogo(DB), leerAjustes(DB)]);
  const secciones = sabores
    .map((s) => ({ id: s.id, nombre: s.nombre, productos: productos.filter((p) => p.sabor_id === s.id) }))
    .filter((s) => s.productos.length > 0);

  return (
    <main className="publico">
      <header className="cabecera">
        <h1>{ajustes.nombre_local}</h1>
        <p>Elegí cuántas querés de cada una y hacé tu pedido.</p>
      </header>
      {secciones.length === 0 ? (
        <p className="vacio">Por ahora no hay paletas cargadas. Volvé más tarde.</p>
      ) : (
        <Pedir
          secciones={secciones.map((s) => ({
            ...s,
            productos: s.productos.map((p) => ({ id: p.id, nombre: p.nombre, precio: p.precio, stock: p.stock, imagen: p.imagen })),
          }))}
          textoRetiro={ajustes.texto_retiro}
        />
      )}
    </main>
  );
}
