"use client";

export default function Error({ error, retry }: { error: unknown; retry: () => void }) {
  const codigo = error instanceof Error && "digest" in error ? String(error.digest) : null;
  return (
    <main className="publico">
      <section className="confirmacion pagina-error" role="alert">
        <h1 className="confirmacion-titulo">Algo salió mal</h1>
        <p className="ayuda">No pudimos cargar esto. Probá de nuevo en un momento.</p>
        <button type="button" className="boton-principal" onClick={() => retry()}>
          Probar de nuevo
        </button>
        <a href="/" className="boton-secundario">
          Volver a la lista
        </a>
        {codigo && <p className="codigo-error">Código: {codigo}</p>}
      </section>
    </main>
  );
}
