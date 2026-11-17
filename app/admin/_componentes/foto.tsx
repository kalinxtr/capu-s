"use client";

import { useState } from "react";
import { medidaAchicada } from "@/lib/foto";
import { quitarFoto, subirFoto } from "../acciones";
import { useAviso } from "./avisos";
import { BotonSeguro, FormAccion } from "./formularios";
import { useAccion } from "./useAccion";

/** Achica la foto en el navegador (lado mayor `LADO_FOTO` px, WebP) antes de subirla. */
async function achicar(archivo: File): Promise<Blob> {
  const bmp = await createImageBitmap(archivo);
  const { ancho, alto } = medidaAchicada(bmp.width, bmp.height);
  const canvas = document.createElement("canvas");
  canvas.width = ancho;
  canvas.height = alto;
  canvas.getContext("2d")!.drawImage(bmp, 0, 0, canvas.width, canvas.height);
  return new Promise((ok, mal) => canvas.toBlob((b) => (b ? ok(b) : mal(new Error("No se pudo procesar la foto."))), "image/webp", 0.82));
}

/** La foto viaja como texto: un archivo binario dentro de una Server Action se pierde en el Worker. */
function aDataUrl(blob: Blob): Promise<string> {
  return new Promise((ok, mal) => {
    const r = new FileReader();
    r.onload = () => ok(String(r.result));
    r.onerror = () => mal(r.error);
    r.readAsDataURL(blob);
  });
}

const esHeic = (a: File) => /^image\/hei[cf]$/i.test(a.type) || /\.hei[cf]$/i.test(a.name);

export function FotoProducto({ id, imagen, nombre }: { id: number; imagen: string | null; nombre: string }) {
  const { ejecutar, pendiente } = useAccion();
  const [error, setError] = useState<string | null>(null);
  const avisar = useAviso();

  async function elegir(e: React.ChangeEvent<HTMLInputElement>) {
    const archivo = e.target.files?.[0];
    e.target.value = "";
    if (!archivo) return;
    setError(null);
    const fd = new FormData();
    fd.set("id", String(id));
    try {
      fd.set("foto", await aDataUrl(await achicar(archivo)));
    } catch {
      return setError(
        esHeic(archivo)
          ? "Las fotos HEIC del iPhone no se pueden leer acá. Probá con una captura de pantalla o un JPG."
          : "No se pudo leer esa imagen.",
      );
    }
    const r = await ejecutar(subirFoto, fd);
    if (r && !r.ok) return setError(r.error);
    if (r?.mensaje) avisar({ texto: r.mensaje });
  }

  return (
    <div className="foto-admin">
      <label className="foto-elegir" title={imagen ? "Cambiar foto" : "Agregar foto"}>
        {imagen ? (
          <img src={`/img/${imagen}`} alt={`Foto de ${nombre}`} width={64} height={64} />
        ) : (
          <span className="foto-vacia">+ foto</span>
        )}
        <span className="solo-lector">{imagen ? `Cambiar foto de ${nombre}` : `Agregar foto de ${nombre}`}</span>
        <input type="file" accept="image/*" onChange={elegir} disabled={pendiente} className="solo-lector" />
        {pendiente && <span className="foto-subiendo">Subiendo…</span>}
      </label>
      {imagen && (
        <FormAccion accion={quitarFoto} ocultos={{ id }}>
          <BotonSeguro className="link" pregunta="¿Quitar foto?">
            Quitar foto
          </BotonSeguro>
        </FormAccion>
      )}
      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
