import type { Metadata } from "next";
import Link from "next/link";
import { LogoPizza } from "./LogoPizza";

// Sin D1 acá: Next prerenderiza esta página en el build, donde no hay bindings.
export const metadata: Metadata = { title: "No encontrada" };

export default function NoEncontrada() {
  return (
    <main className="publico">
      <section className="confirmacion pagina-error">
        <LogoPizza tamano={48} />
        <h1 className="confirmacion-titulo">No encontramos esta página</h1>
        <p className="ayuda">Puede que el link esté mal escrito.</p>
        <Link href="/" className="boton-principal">
          Ver las pizzas
        </Link>
      </section>
    </main>
  );
}
