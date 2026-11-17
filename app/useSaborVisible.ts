"use client";

import { useEffect, useState, type RefObject } from "react";

/**
 * Sabor visible al scrollear (las secciones llevan `data-sabor`). Lo marca en la barra de sabores
 * y la desplaza para que se vea, sin animar si el usuario pidió movimiento reducido.
 */
export function useSaborVisible(secciones: { id: number }[], nav: RefObject<HTMLElement | null>): number | null {
  const [saborVisible, setSaborVisible] = useState<number | null>(secciones[0]?.id ?? null);

  useEffect(() => {
    const obs = new IntersectionObserver(
      (entradas) => {
        const visible = entradas.find((e) => e.isIntersecting);
        if (visible) setSaborVisible(Number(visible.target.getAttribute("data-sabor")));
      },
      { rootMargin: "-80px 0px -60% 0px" },
    );
    document.querySelectorAll("section[data-sabor]").forEach((s) => obs.observe(s));
    return () => obs.disconnect();
  }, [secciones]);

  useEffect(() => {
    nav.current
      ?.querySelector<HTMLElement>(`[data-sabor="${saborVisible}"]`)
      ?.scrollIntoView({
        block: "nearest",
        inline: "center",
        behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth",
      });
  }, [saborVisible, nav]);

  return saborVisible;
}
