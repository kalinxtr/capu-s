/** Porción de pizza con borde de masa, queso y pepperoni. El mismo dibujo que `public/icon.svg`. */
export function LogoPizza({ tamano = 40 }: { tamano?: number }) {
  return (
    <svg className="logo" width={tamano} height={tamano} viewBox="0 0 64 64" aria-hidden focusable="false">
      <path d="M11 17H53L32 58Z" fill="#f2b632" stroke="#f2b632" strokeWidth="4" strokeLinejoin="round" />
      <rect x="6" y="6" width="52" height="13" rx="6.5" fill="#d9a066" />
      <circle cx="24" cy="27" r="5" fill="#c0351b" />
      <circle cx="40" cy="28" r="4.5" fill="#c0351b" />
      <circle cx="32" cy="41" r="4" fill="#c0351b" />
      <rect x="12" y="9" width="14" height="3" rx="1.5" fill="#fff" opacity=".35" />
    </svg>
  );
}
