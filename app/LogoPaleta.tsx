/** Paleta de frambuesa con baño de chocolate. El mismo dibujo que `app/icon.svg`. */
export function LogoPaleta({ tamano = 40 }: { tamano?: number }) {
  return (
    <svg className="logo" width={tamano} height={tamano} viewBox="0 0 64 64" aria-hidden focusable="false">
      <rect x="27" y="40" width="10" height="21" rx="5" fill="#d9a066" />
      <rect x="15" y="4" width="34" height="42" rx="17" fill="#c2255c" />
      <path
        d="M15 21A17 17 0 0 1 49 21V27Q46 33 43 27Q40 21 37 29Q34 37 31 29Q28 21 25 28Q22 35 19 28Q17 25 15 27Z"
        fill="#2b1a12"
      />
      <rect x="21" y="30" width="4" height="10" rx="2" fill="#fff" opacity=".35" />
    </svg>
  );
}
