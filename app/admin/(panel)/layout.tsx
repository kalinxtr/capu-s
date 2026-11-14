import Link from "next/link";
import { requerirSesion } from "@/lib/sesion";
import { salir } from "../acciones";

export const metadata = { title: "Admin · La Paletería", robots: { index: false } };

export default async function Panel({ children }: LayoutProps<"/admin">) {
  await requerirSesion();
  return (
    <div className="admin">
      <nav className="admin-nav">
        <Link href="/admin/pedidos">Pedidos</Link>
        <Link href="/admin/stock">Stock</Link>
        <a href="/" target="_blank" rel="noopener">
          Ver página
        </a>
        <form action={salir}>
          <button className="link">Salir</button>
        </form>
      </nav>
      {children}
    </div>
  );
}
