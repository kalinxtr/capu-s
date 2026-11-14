import Link from "next/link";

export default function PedidoNoEncontrado() {
  return (
    <main className="publico">
      <section className="confirmacion pagina-error">
        <h1 className="confirmacion-titulo">No encontramos ese pedido</h1>
        <p className="ayuda">Revisá que el link sea el que te quedó al pedir. Si no lo encontrás, escribinos por WhatsApp.</p>
        <Link href="/" className="boton-principal">
          Volver a la lista
        </Link>
      </section>
    </main>
  );
}
