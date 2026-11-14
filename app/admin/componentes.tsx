"use client";

import { useRouter } from "next/navigation";
import { startTransition, useActionState, useEffect, useState, type ReactNode } from "react";
import type { Resultado } from "@/lib/tipos";

type Accion = (prev: Resultado, form: FormData) => Promise<Resultado>;

/** Formulario que llama a una Server Action y muestra su error o su mensaje. */
export function FormAccion({
  accion,
  ocultos,
  className,
  children,
}: {
  accion: Accion;
  ocultos?: Record<string, string | number>;
  className?: string;
  children: ReactNode;
}) {
  const [res, act, pendiente] = useActionState(accion, null);
  return (
    <form action={act} className={className} aria-busy={pendiente}>
      {ocultos && Object.entries(ocultos).map(([k, v]) => <input key={k} type="hidden" name={k} value={v} />)}
      <fieldset disabled={pendiente} className="sin-borde">
        {children}
      </fieldset>
      {res && !res.ok && (
        <p className="error" role="alert">
          {res.error}
        </p>
      )}
      {res?.ok && res.mensaje && <p className="ok">{res.mensaje}</p>}
    </form>
  );
}

/** Botón en dos toques ("Cancelar" → "¿Seguro?") en vez de un diálogo del navegador. */
export function BotonSeguro({ children, pregunta, className }: { children: ReactNode; pregunta: string; className?: string }) {
  const [armado, setArmado] = useState(false);
  useEffect(() => {
    if (!armado) return;
    const t = setTimeout(() => setArmado(false), 4000);
    return () => clearTimeout(t);
  }, [armado]);
  if (!armado)
    return (
      <button type="button" className={className} onClick={() => setArmado(true)}>
        {children}
      </button>
    );
  return <button className={`${className ?? ""} armado`}>{pregunta}</button>;
}

/** Refresca la página cada `segundos` mientras está visible (para que entren los pedidos nuevos). */
export function Refrescar({ segundos }: { segundos: number }) {
  const router = useRouter();
  useEffect(() => {
    const t = setInterval(() => {
      if (document.visibilityState === "visible") router.refresh();
    }, segundos * 1000);
    return () => clearInterval(t);
  }, [router, segundos]);
  return null;
}

/** Achica la foto en el navegador (lado mayor 800 px, WebP) antes de subirla. */
async function achicar(archivo: File): Promise<Blob> {
  const bmp = await createImageBitmap(archivo);
  const escala = Math.min(1, 800 / Math.max(bmp.width, bmp.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bmp.width * escala);
  canvas.height = Math.round(bmp.height * escala);
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

export function FotoProducto({
  id,
  imagen,
  subir,
  quitar,
}: {
  id: number;
  imagen: string | null;
  subir: Accion;
  quitar: Accion;
}) {
  const [res, act, pendiente] = useActionState(subir, null);
  const [resQuitar, actQuitar] = useActionState(quitar, null);
  const [errorLocal, setErrorLocal] = useState<string | null>(null);

  async function elegir(e: React.ChangeEvent<HTMLInputElement>) {
    const archivo = e.target.files?.[0];
    e.target.value = "";
    if (!archivo) return;
    setErrorLocal(null);
    try {
      const fd = new FormData();
      fd.set("id", String(id));
      fd.set("foto", await aDataUrl(await achicar(archivo)));
      startTransition(() => act(fd));
    } catch {
      setErrorLocal("No se pudo leer esa imagen.");
    }
  }

  const error = errorLocal ?? (res && !res.ok ? res.error : null) ?? (resQuitar && !resQuitar.ok ? resQuitar.error : null);
  return (
    <div className="foto-admin">
      <label className="foto-elegir" title="Cambiar foto">
        {imagen ? <img src={`/img/${imagen}`} alt="" width={64} height={64} /> : <span className="foto-vacia">+ foto</span>}
        <input type="file" accept="image/*" onChange={elegir} disabled={pendiente} hidden />
        {pendiente && <span className="foto-subiendo">Subiendo…</span>}
      </label>
      {imagen && (
        <form action={actQuitar}>
          <input type="hidden" name="id" value={id} />
          <button className="link">quitar</button>
        </form>
      )}
      {error && <p className="error">{error}</p>}
    </div>
  );
}
