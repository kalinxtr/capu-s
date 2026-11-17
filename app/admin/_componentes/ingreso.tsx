"use client";

import { useState } from "react";

export function CampoClave() {
  const [ver, setVer] = useState(false);
  return (
    <label>
      Clave
      <span className="campo-clave">
        <input name="clave" type={ver ? "text" : "password"} required autoComplete="current-password" autoFocus />
        <button type="button" className="link" aria-pressed={ver} onClick={() => setVer((v) => !v)}>
          {ver ? "Ocultar" : "Mostrar"}
        </button>
      </span>
    </label>
  );
}
