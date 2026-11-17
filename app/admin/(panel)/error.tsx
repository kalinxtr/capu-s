"use client";

import Link from "next/link";

export default function ErrorAdmin({ error, retry }: { error: unknown; retry: () => void }) {
  const codigo = error instanceof Error && "digest" in error ? String(error.digest) : null;
  return (
    <main>
      <section className="tarjeta pagina-error" role="alert">
        <h1>Algo salió mal</h1>
        <p className="ayuda">Si pasó al guardar, puede que la sesión haya vencido.</p>
        <div className="acciones">
          <button type="button" className="boton-principal" onClick={() => retry()}>
            Probar de nuevo
          </button>
          <a href="/admin/ingresar" className="boton">
            Ingresar de nuevo
          </a>
          <Link href="/admin/pedidos" className="boton">
            Ir a Pedidos
          </Link>
        </div>
        {codigo && <p className="codigo-error">Código: {codigo}</p>}
      </section>
    </main>
  );
}
