// Prueba de humo de punta a punta: llama a las Server Actions como lo hace el navegador.
// Uso (después de `npx opennextjs-cloudflare build`, que genera el manifiesto de acciones):
//   node scripts/humo.mjs <url-base> <clave-admin>
// Crea un producto de prueba en el sabor con id 1 y al final lo archiva. No usar en producción con clientes reales.
import { readFileSync } from "node:fs";

const [base, clave] = process.argv.slice(2);
if (!base || !clave) throw new Error("Uso: node scripts/humo.mjs <url-base> <clave-admin>");

const manifiesto = JSON.parse(readFileSync(".next/server/server-reference-manifest.json", "utf8")).node;
const ids = Object.fromEntries(Object.entries(manifiesto).map(([id, v]) => [v.exportedName, id]));

let cookie = "";
let fallas = 0;
const check = (cond, texto, extra = "") => {
  console.log(`${cond ? "✓" : "✗"} ${texto}${extra ? `  (${extra})` : ""}`);
  if (!cond) fallas++;
};

/** Llama a una Server Action que usa useActionState (estado previo null + FormData). */
async function accion(nombre, ruta, campos) {
  const fd = new FormData();
  fd.append("0", '[null,"$K1"]');
  for (const [k, v] of Object.entries(campos)) fd.append(`_1_${k}`, v);
  const r = await fetch(base + ruta, {
    method: "POST",
    body: fd,
    headers: { "Next-Action": ids[nombre], Accept: "text/x-component", Origin: base, Cookie: cookie },
    redirect: "manual",
  });
  const setCookie = r.headers.get("set-cookie");
  const t = await r.text();
  const ok = /"ok":true/.test(t);
  const limpiar = (s) => (s === "$undefined" ? undefined : s);
  const error = limpiar(/"error":"([^"]*)"/.exec(t)?.[1]);
  const mensaje = limpiar(/"mensaje":"([^"]*)"/.exec(t)?.[1]);
  // Con JS, redirect() en una Server Action no da un 303: viene en este header.
  const redirige = r.headers.get("x-action-redirect");
  return { status: r.status, ok, error, mensaje, redirige, setCookie, t };
}

const sinMarcas = (t) => t.replaceAll("<!-- -->", "");

/** crearPedido redirige a /pedido/<token>?nuevo=1 si sale bien. */
const tokenDe = (r) => /\/pedido\/([0-9a-f-]{36})/.exec(r.redirige ?? "")?.[1];
async function idDe(token) {
  const t = sinMarcas(await (await fetch(`${base}/pedido/${token}`)).text());
  return Number(/Pedido #(\d+)/.exec(t)?.[1]) || null;
}

/** Productos que ve la página pública (salen del payload RSC embebido en el HTML). */
async function publicos() {
  const html = (await (await fetch(base + "/")).text()).replaceAll('\\"', '"');
  const prods = [...html.matchAll(/"id":(\d+),"nombre":"([^"]+)","precio":(\d+),"stock":(\d+),"imagen":(null|"[^"]+")/g)];
  return prods.map(([, id, nombre, precio, stock, imagen]) => ({
    id: +id,
    nombre,
    precio: +precio,
    stock: +stock,
    imagen: imagen === "null" ? null : JSON.parse(imagen),
  }));
}

const nombre = `Prueba ${Date.now()}`;

// ── Público y seguridad básica
const home = await fetch(base + "/");
check(home.status === 200, "La página pública carga", `${home.status}`);
const sinSesion = await accion("crearSabor", "/admin/stock", { nombre: "No debería" });
check(
  sinSesion.status === 200 && /\/admin\/ingresar/.test(sinSesion.redirige ?? ""),
  "Una acción del admin sin sesión manda a ingresar",
  `${sinSesion.status} ${sinSesion.redirige}`,
);
check(!sinSesion.ok, "…y no se ejecuta");
const admin = await fetch(base + "/admin/pedidos", { redirect: "manual" });
check([303, 307, 308].includes(admin.status) || /ingresar/.test(await admin.text()), "El admin sin sesión manda a ingresar");

// ── Ingreso
const mala = await accion("ingresar", "/admin/ingresar", { clave: "incorrecta" });
check(mala.error === "Clave incorrecta.", "Clave incorrecta se rechaza");
const buena = await accion("ingresar", "/admin/ingresar", { clave });
cookie = (buena.setCookie ?? "").split(";")[0];
check(cookie.startsWith("sesion="), "Clave correcta da la cookie de sesión");

// ── Stock
const aj = await accion("guardarAjustes", "/admin/stock", { nombre_local: "La Paletería", whatsapp: "11 2345 6789", texto_retiro: "Retiro de 14 a 20 h" });
check(aj.ok, "Se guardan los datos del local", aj.error);
const cp = await accion("crearProducto", "/admin/stock", { sabor_id: "1", nombre, precio: "$2.500", stock: "3" });
check(cp.ok, "Se crea un producto con stock 3", cp.error);
let p = (await publicos()).find((x) => x.nombre === nombre);
check(p && p.stock === 3 && p.precio === 2500, "El producto aparece en la página pública con precio y stock", JSON.stringify(p));

const png = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==";
const foto = await accion("subirFoto", "/admin/stock", { id: String(p.id), foto: png });
check(foto.ok, "Se sube la foto a R2", foto.error);
p = (await publicos()).find((x) => x.nombre === nombre);
const img = p?.imagen ? await fetch(`${base}/img/${p.imagen}`) : null;
check(img?.status === 200 && img.headers.get("content-type") === "image/png", "La foto se sirve desde /img", p?.imagen);

// ── Pedido público
const pedido = (campos) => accion("crearPedido", "/", { nombre: "Cliente Prueba", telefono: "11 2345 6789", entrega: "retiro", ...campos });
const p1 = await pedido({ [`cant_${p.id}`]: "2" });
const t1 = tokenDe(p1);
const id1 = t1 && (await idDe(t1));
check(t1 && id1, "Un pedido de 2 se crea y redirige a su link", p1.error ?? `#${id1} ${p1.redirige}`);
check((await publicos()).find((x) => x.id === p.id)?.stock === 1, "El stock bajó a 1");
const ver = await fetch(`${base}/pedido/${t1}?nuevo=1`);
const verTexto = sinMarcas(await ver.text());
check(ver.status === 200 && verTexto.includes(`Pedido #${id1}`), "El link del cliente muestra el pedido");
check(verTexto.includes("Recibimos tu pedido"), "Con ?nuevo=1 el link es la confirmación");
const noExiste = await fetch(`${base}/pedido/00000000-0000-0000-0000-000000000000`);
check(
  noExiste.status === 404 && sinMarcas(await noExiste.text()).includes("No encontramos ese pedido"),
  "Un link de pedido inválido da 404 con página propia",
  `${noExiste.status}`,
);
const envioSinDir = await pedido({ entrega: "envio", [`cant_${p.id}`]: "1" });
check(envioSinDir.error === "Escribí la dirección de envío.", "Envío sin dirección se rechaza");

const carrera = await Promise.all([1, 2, 3].map(() => pedido({ [`cant_${p.id}`]: "1" })));
const ganaron = carrera.filter(tokenDe).length;
check(ganaron === 1, "3 pedidos simultáneos por la última unidad: entra exactamente 1", `entraron ${ganaron}`);
check((await publicos()).find((x) => x.id === p.id)?.stock === 0, "El stock quedó en 0, nunca negativo");

// ── Pedidos en el admin
const cancelar = await accion("cambiarEstado", "/admin/pedidos", { id: String(id1), estado: "cancelado" });
check(cancelar.ok, "Cancelar el pedido de 2", cancelar.error);
check((await publicos()).find((x) => x.id === p.id)?.stock === 2, "Cancelar devolvió el stock (0 → 2)");
const otraVez = await accion("cambiarEstado", "/admin/pedidos", { id: String(id1), estado: "cancelado" });
check(!otraVez.ok && (await publicos()).find((x) => x.id === p.id)?.stock === 2, "Cancelar dos veces no devuelve el stock dos veces");
const idG = await idDe(tokenDe(carrera.find(tokenDe)));
const prep = await accion("cambiarEstado", "/admin/pedidos", { id: String(idG), estado: "preparado" });
check(prep.ok && prep.mensaje === `Pedido #${idG} listo.`, "Marcar un pedido como preparado", prep.error ?? prep.mensaje);
const lista = await (await fetch(base + "/admin/pedidos?estado=preparado", { headers: { Cookie: cookie } })).text();
check(sinMarcas(lista).includes(`#${idG} · Cliente Prueba`), "El pedido aparece en Preparados");

// ── Orden de sabores
const conSesion = cookie;
cookie = "";
const moverSinSesion = await accion("moverSabor", "/admin/stock", { id: "1", dir: "abajo" });
cookie = conSesion;
check(!moverSinSesion.ok, "Mover un sabor sin sesión se rechaza", `${moverSinSesion.status}`);
const abajo = await accion("moverSabor", "/admin/stock", { id: "1", dir: "abajo" });
const arriba = await accion("moverSabor", "/admin/stock", { id: "1", dir: "arriba" });
check(abajo.ok && arriba.ok, "Mover un sabor abajo y arriba", abajo.error ?? arriba.error);

// ── Ajustes de stock y archivar
await accion("ajustarStock", "/admin/stock", { id: String(p.id), delta: "1" });
check((await publicos()).find((x) => x.id === p.id)?.stock === 3, "+1 de stock");
await accion("fijarStock", "/admin/stock", { id: String(p.id), stock: "10" });
check((await publicos()).find((x) => x.id === p.id)?.stock === 10, "Fijar stock en 10");
await accion("activarProducto", "/admin/stock", { id: String(p.id), activo: "0" });
check(!(await publicos()).some((x) => x.id === p.id), "Archivar lo saca de la página pública");

// ── Límite de pedidos por IP (5 por minuto). Se pide el producto archivado: cuenta para el
// límite pero no crea pedidos (falla después, al no encontrar el producto).
let frenado = false;
for (let i = 0; i < 6 && !frenado; i++) frenado = /muchos pedidos/.test((await pedido({ [`cant_${p.id}`]: "1" })).error ?? "");
check(frenado, "El límite de pedidos por IP frena después de 5 por minuto");

console.log(fallas ? `\n${fallas} FALLAS` : "\nTodo OK");
process.exit(fallas ? 1 : 0);
