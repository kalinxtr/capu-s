// Solo en el admin: en la parte pública un loading.tsx haría que un notFound() responda 200.
export default function Cargando() {
  return (
    <main aria-busy="true">
      <p className="solo-lector">Cargando…</p>
      <div className="tarjeta esqueleto" />
      <div className="tarjeta esqueleto" />
      <div className="tarjeta esqueleto" />
    </main>
  );
}
