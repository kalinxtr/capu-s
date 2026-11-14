"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  createContext,
  startTransition,
  useActionState,
  useTransition,
  useCallback,
  useContext,
  useEffect,
  useOptimistic,
  useRef,
  useState,
  useSyncExternalStore,
  type FormEvent,
  type ReactNode,
} from "react";
import type { EstadoPedido, Resultado } from "@/lib/tipos";
import { ajustarStock, cambiarEstado, fijarStock, quitarFoto, salir, subirFoto } from "./acciones";

type Accion = (prev: Resultado, form: FormData) => Promise<Resultado>;

// ───────────────────────── Avisos flotantes ─────────────────────────

type Aviso = { texto: string; tipo?: "ok" | "error"; accion?: { texto: string; hacer: () => void } };
type AvisoVivo = Aviso & { id: number };

const ContextoAvisos = createContext<(a: Aviso) => void>(() => {});

/** Avisos cortos abajo de la pantalla que se van solos (en vez de mensajes pegados en cada formulario). */
export function Avisos({ children }: { children: ReactNode }) {
  const [avisos, setAvisos] = useState<AvisoVivo[]>([]);
  const siguiente = useRef(1);

  const cerrar = useCallback((id: number) => setAvisos((as) => as.filter((a) => a.id !== id)), []);
  const avisar = useCallback(
    (a: Aviso) => {
      const id = siguiente.current++;
      setAvisos((as) => [...as.slice(-2), { ...a, id }]);
      setTimeout(() => cerrar(id), a.accion ? 7000 : 4000);
    },
    [cerrar],
  );

  return (
    <ContextoAvisos.Provider value={avisar}>
      {children}
      <div className="avisos" role="status" aria-live="polite">
        {avisos.map((a) => (
          <div key={a.id} className={`aviso-flotante${a.tipo === "error" ? " error" : ""}`}>
            <span>{a.texto}</span>
            {a.accion && (
              <button
                type="button"
                className="link"
                onClick={() => {
                  a.accion!.hacer();
                  cerrar(a.id);
                }}
              >
                {a.accion.texto}
              </button>
            )}
            <button type="button" className="cerrar-aviso" aria-label="Cerrar aviso" onClick={() => cerrar(a.id)}>
              ×
            </button>
          </div>
        ))}
      </div>
    </ContextoAvisos.Provider>
  );
}

export const useAviso = () => useContext(ContextoAvisos);

// ───────────────────────── Formularios ─────────────────────────

/** ¿Algún campo visible del formulario cambió respecto de su valor inicial? */
function hayCambios(form: HTMLFormElement): boolean {
  return [...form.elements].some(
    (el) => el instanceof HTMLInputElement && el.name && el.type !== "hidden" && el.value !== el.defaultValue,
  );
}

/**
 * Formulario que llama a una Server Action. Los errores se muestran en línea; los mensajes de éxito,
 * como aviso flotante. Con `soloSiCambia`, el botón `.guardar-si-cambia` aparece solo si hay cambios.
 *
 * La acción se llama directo (no con useActionState): si la fila desaparece al terminar (archivar,
 * un pedido que cambia de lista), el aviso igual sale, porque lo muestra el proveedor del layout.
 * Si hubo error se conserva lo escrito; si salió bien el formulario vuelve a sus valores por defecto,
 * que ya son los nuevos que mandó el servidor.
 */
export function FormAccion({
  accion,
  ocultos,
  className,
  soloSiCambia,
  id,
  children,
}: {
  accion: Accion;
  ocultos?: Record<string, string | number>;
  className?: string;
  soloSiCambia?: boolean;
  id?: string;
  children: ReactNode;
}) {
  const [pendiente, iniciar] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [sucio, setSucio] = useState(false);
  const avisar = useAviso();

  function enviar(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = e.currentTarget;
    const datos = new FormData(f);
    iniciar(async () => {
      const r = await accion(null, datos);
      if (r && !r.ok) return setError(r.error);
      setError(null);
      f.reset();
      setSucio(false);
      if (r?.mensaje) avisar({ texto: r.mensaje });
    });
  }

  const alEscribir = soloSiCambia ? (e: FormEvent<HTMLFormElement>) => setSucio(hayCambios(e.currentTarget)) : undefined;

  return (
    <form
      onSubmit={enviar}
      id={id}
      className={className}
      aria-busy={pendiente}
      onInput={alEscribir}
      data-sucio={(soloSiCambia && sucio) || undefined}
    >
      {ocultos && Object.entries(ocultos).map(([k, v]) => <input key={k} type="hidden" name={k} value={v} />)}
      <fieldset disabled={pendiente} className="sin-borde">
        {children}
      </fieldset>
      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
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
  return (
    <button className={`${className ?? ""} armado`} autoFocus>
      {pregunta}
    </button>
  );
}

// ───────────────────────── Pedidos ─────────────────────────

const datosEstado = (id: number, estado: EstadoPedido) => {
  const fd = new FormData();
  fd.set("id", String(id));
  fd.set("estado", estado);
  return fd;
};

/** Cambia el estado de un pedido. Con `deshacerA`, el aviso trae un botón "Deshacer". */
export function BotonEstado({
  id,
  estado,
  texto,
  principal,
  deshacerA,
}: {
  id: number;
  estado: EstadoPedido;
  texto: string;
  principal?: boolean;
  deshacerA?: EstadoPedido;
}) {
  const [pendiente, iniciar] = useTransition();
  const avisar = useAviso();

  function cambiar() {
    iniciar(async () => {
      const r = await cambiarEstado(null, datosEstado(id, estado));
      if (r && !r.ok) return avisar({ texto: r.error, tipo: "error" });
      avisar({
        texto: r?.mensaje ?? "Listo.",
        accion: deshacerA && {
          texto: "Deshacer",
          hacer: () =>
            startTransition(async () => {
              const d = await cambiarEstado(null, datosEstado(id, deshacerA));
              if (d && !d.ok) avisar({ texto: d.error, tipo: "error" });
            }),
        },
      });
    });
  }

  return (
    <button type="button" className={principal ? "boton-principal" : "boton"} disabled={pendiente} onClick={cambiar}>
      {texto}
    </button>
  );
}

/** Barra del admin: marca la sección actual y cuántos pedidos nuevos hay. */
export function NavAdmin({ nuevos }: { nuevos: number }) {
  const ruta = usePathname();
  const actual = (r: string) => (ruta.startsWith(r) ? "page" : undefined);
  return (
    <nav className="admin-nav" aria-label="Admin">
      <Link href="/admin/pedidos" aria-current={actual("/admin/pedidos")}>
        Pedidos
        {nuevos > 0 && (
          <span className="cuenta" aria-label={`${nuevos} ${nuevos === 1 ? "nuevo" : "nuevos"}`}>
            {nuevos}
          </span>
        )}
      </Link>
      <Link href="/admin/stock" aria-current={actual("/admin/stock")}>
        Stock
      </Link>
      <a href="/" target="_blank" rel="noopener" className="ver-pagina">
        Ver página <span aria-hidden>↗</span>
      </a>
      <form action={salir}>
        <button className="link">Salir</button>
      </form>
    </nav>
  );
}

// Último pedido que el admin vio, guardado en su navegador. Lo nuevo desde entonces se marca.
const CLAVE_VISTO = "paleteria:ultimo-pedido-visto";
let ultimoVisto: number | null = null;
let vistoLeido = false;
const suscriptores = new Set<() => void>();

function leerVisto(): number | null {
  if (!vistoLeido) {
    vistoLeido = true;
    try {
      const n = Number(localStorage.getItem(CLAVE_VISTO));
      ultimoVisto = Number.isInteger(n) && n > 0 ? n : null;
    } catch {
      ultimoVisto = null;
    }
  }
  return ultimoVisto;
}

function guardarVisto(n: number) {
  ultimoVisto = n;
  try {
    localStorage.setItem(CLAVE_VISTO, String(n));
  } catch {
    // Sin almacenamiento: se marca solo durante esta visita.
  }
  suscriptores.forEach((f) => f());
}

function suscribirVisto(f: () => void) {
  suscriptores.add(f);
  return () => {
    suscriptores.delete(f);
  };
}

/** Al salir de la pestaña, todo lo que estaba a la vista pasa a "visto". */
export function RegistrarVistos({ maxId }: { maxId: number }) {
  const max = useRef(maxId);
  useEffect(() => {
    max.current = maxId;
    if (leerVisto() === null && maxId > 0) guardarVisto(maxId); // primera visita: nada es "nuevo"
  }, [maxId]);
  useEffect(() => {
    const marcar = () => {
      if (document.visibilityState === "hidden" && max.current > (leerVisto() ?? 0)) guardarVisto(max.current);
    };
    document.addEventListener("visibilitychange", marcar);
    window.addEventListener("pagehide", marcar);
    return () => {
      document.removeEventListener("visibilitychange", marcar);
      window.removeEventListener("pagehide", marcar);
    };
  }, []);
  return null;
}

export function MarcaNueva({ id }: { id: number }) {
  const visto = useSyncExternalStore(
    suscribirVisto,
    () => leerVisto() ?? Infinity,
    () => Infinity,
  );
  return id > visto ? <span className="marca-nueva">Nuevo</span> : null;
}

// ───────────────────────── Stock ─────────────────────────

type CambioStock = { tipo: "sumar" | "fijar"; n: number };

/**
 * + / − y campo de stock. Los toques se ven al instante (optimista) y viajan como diferencia,
 * así un pedido que entra al mismo tiempo no se pisa. El campo se guarda al salir de él.
 */
export function ControlStock({ id, nombre, stock }: { id: number; nombre: string; stock: number }) {
  const [valor, aplicar] = useOptimistic(stock, (a: number, c: CambioStock) =>
    c.tipo === "sumar" ? Math.max(0, a + c.n) : c.n,
  );
  const [borrador, setBorrador] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  function enviar(c: CambioStock) {
    setError(null);
    startTransition(async () => {
      aplicar(c);
      const fd = new FormData();
      fd.set("id", String(id));
      fd.set(c.tipo === "sumar" ? "delta" : "stock", String(c.n));
      const r = await (c.tipo === "sumar" ? ajustarStock : fijarStock)(null, fd);
      if (r && !r.ok) setError(r.error);
    });
  }

  function confirmar() {
    if (borrador === null) return;
    const t = borrador.trim();
    setBorrador(null);
    if (/^\d{1,6}$/.test(t) && Number(t) !== valor) enviar({ tipo: "fijar", n: Number(t) });
  }

  const sucio = borrador !== null && borrador !== String(valor);
  return (
    <div className="stock-admin" role="group" aria-label={`Stock de ${nombre}`}>
      <button
        type="button"
        className="redondo"
        aria-label={`Restar uno de ${nombre}`}
        disabled={valor === 0}
        onClick={() => enviar({ tipo: "sumar", n: -1 })}
      >
        −
      </button>
      <input
        className="stock-numero"
        inputMode="numeric"
        aria-label={`Unidades de ${nombre}`}
        value={borrador ?? String(valor)}
        data-sucio={sucio || undefined}
        onFocus={(e) => e.currentTarget.select()}
        onChange={(e) => setBorrador(e.target.value)}
        onBlur={confirmar}
        onKeyDown={(e) => {
          if (e.key === "Enter") e.currentTarget.blur();
          if (e.key === "Escape") setBorrador(null);
        }}
      />
      <button type="button" className="redondo mas" aria-label={`Sumar uno de ${nombre}`} onClick={() => enviar({ tipo: "sumar", n: 1 })}>
        +
      </button>
      {sucio && <span className="sin-guardar">Sin guardar</span>}
      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
    </div>
  );
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

const esHeic = (a: File) => /^image\/hei[cf]$/i.test(a.type) || /\.hei[cf]$/i.test(a.name);

export function FotoProducto({ id, imagen, nombre }: { id: number; imagen: string | null; nombre: string }) {
  const [res, act, pendiente] = useActionState(subirFoto, null);
  const [resQuitar, actQuitar] = useActionState(quitarFoto, null);
  const [errorLocal, setErrorLocal] = useState<string | null>(null);
  const avisar = useAviso();

  useEffect(() => {
    if (res?.ok && res.mensaje) avisar({ texto: res.mensaje });
  }, [res, avisar]);

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
      setErrorLocal(
        esHeic(archivo)
          ? "Las fotos HEIC del iPhone no se pueden leer acá. Probá con una captura de pantalla o un JPG."
          : "No se pudo leer esa imagen.",
      );
    }
  }

  const error = errorLocal ?? (res && !res.ok ? res.error : null) ?? (resQuitar && !resQuitar.ok ? resQuitar.error : null);
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
        <form action={actQuitar}>
          <input type="hidden" name="id" value={id} />
          <BotonSeguro className="link" pregunta="¿Quitar foto?">
            Quitar foto
          </BotonSeguro>
        </form>
      )}
      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}

// ───────────────────────── Ingreso ─────────────────────────

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
