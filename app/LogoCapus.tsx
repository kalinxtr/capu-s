/** Logo de Capu's, sacado de la publicación del local (pedido 21): 621×308, fondo transparente. */
const ANCHO = 621;
const ALTO = 308;

export function LogoCapus({ ancho = 120, alt = "", prioridad = false }: { ancho?: number; alt?: string; prioridad?: boolean }) {
  return (
    <img
      className="logo"
      src="/logo-capus.webp"
      width={ancho}
      height={Math.round((ancho * ALTO) / ANCHO)}
      alt={alt}
      decoding="async"
      fetchPriority={prioridad ? "high" : undefined}
    />
  );
}
