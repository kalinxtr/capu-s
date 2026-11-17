"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { salir } from "../acciones";

/** Barra del admin: marca la sección actual y cuántos pedidos nuevos hay. */
export function NavAdmin({ nuevos }: { nuevos: number }) {
  const ruta = usePathname();
  const actual = (r: string) => (ruta.startsWith(r) ? "page" : undefined);
  return (
    <nav className="admin-nav" aria-label="Admin">
      <Link href="/admin/pedidos" aria-current={actual("/admin/pedidos")}>
        Pedidos
        {nuevos > 0 && (
          <span className="cuenta" aria-label={`${nuevos} ${nuevos === 1 ? "nuevo" : "nuevos"}`}>
            {nuevos}
          </span>
        )}
      </Link>
      <Link href="/admin/stock" aria-current={actual("/admin/stock")}>
        Stock
      </Link>
      <a href="/" target="_blank" rel="noopener" className="ver-pagina">
        Ver página <span aria-hidden>↗</span>
      </a>
      <form action={salir}>
        <button className="link">Salir</button>
      </form>
    </nav>
  );
}
