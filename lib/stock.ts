/** Mueve un id un lugar arriba o abajo. Devuelve null si no está o ya está en el borde. */
export function moverEnLista(ids: number[], id: number, dir: "arriba" | "abajo"): number[] | null {
  const i = ids.indexOf(id);
  const j = dir === "arriba" ? i - 1 : i + 1;
  if (i < 0 || j < 0 || j >= ids.length) return null;
  const nuevo = [...ids];
  [nuevo[i], nuevo[j]] = [nuevo[j], nuevo[i]];
  return nuevo;
}

export function resumenStock(productos: { stock: number }[]): { activos: number; sinStock: number } {
  return { activos: productos.length, sinStock: productos.filter((p) => p.stock === 0).length };
}
