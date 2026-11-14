---
tipo: plan
actualizado: 2026-11-14
---

# Plan UX/UI (pedido 5)

Este plan sale del [[Reporte UX-UI]] (46 hallazgos). Respeta [[Decisiones]] y [[Diseño]]: la página pública es una lista de stock (no una tienda), no hay carrito ni pasos, el admin tiene solo Pedidos y Stock, nada se borra y los datos del local quedan abajo de todo en Stock. Respeta también las trampas del `README.md`: sin `cacheComponents`, las fotos viajan en base64 y el Worker pesa como máximo 3 MiB comprimido.

Lo ejecuta el agente principal en línea, en la rama `ux-ui`, con un commit por fase. Cada tarea indica los hallazgos que cubre (#n).

---

## 0. Reglas que no se tocan (revisar en cada fase)

- **Seguridad:**
  - Toda acción del admin llama a `exigirSesion()` adentro, incluidas las nuevas `moverSabor` y `moverProducto`.
  - Todo `generateMetadata` del admin llama a `requerirSesion()` antes de leer D1.
  - Los precios se leen siempre de la base. `crearPedido` mantiene el batch atómico y el `CHECK`.
- **El stock se ajusta por diferencia (delta), nunca enviando el total desde el cliente.** El reporte (#32) propone enviar el total. Lo descarto: si mientras el admin toca "+" entra un pedido que descuenta 2, mandar el total pisaría ese descuento y se vendería dos veces lo mismo. `ajustarStock` sigue con `stock = max(0, stock + delta)`, que es atómico. Solo `fijarStock` (contar el freezer) manda el número exacto, porque esa es su intención.
- **La prueba de humo depende de tres formatos. Hay que mantenerlos o actualizar `scripts/humo.mjs`:**
  1. Los productos que se le pasan a `<Pedir>` tienen exactamente las claves `{ id, nombre, precio, stock, imagen }`, en ese orden. `publicos()` los lee con una regex del payload RSC.
  2. `/pedido/<token>` muestra el texto literal `Pedido #<id>`.
  3. La tarjeta del admin muestra `#<id> · <cliente_nombre>` dentro del `<strong>`.
- **No leer D1 en el layout raíz ni en `app/not-found.tsx`.** Next los prerenderiza en el build (`_not-found`) y ahí no hay bindings. Las lecturas de D1 van solo en páginas que ya llaman a `connection()` o a `headers()`/`cookies()`.
- **Nada de `loading.tsx` en `app/` ni en `app/pedido/`.** Si hay uno, la respuesta empieza a transmitirse antes de tiempo y el `notFound()` de un token inválido sale con status 200 en vez de 404 (ver `loading.md`, sección "Status codes"). Solo va uno en `app/admin/(panel)/`.
- Sin dependencias nuevas. Todo el CSS sigue plano en `app/globals.css`. La fuente se carga con `next/font`, que la sirve como asset estático y no suma peso al Worker.

---

## 1. Ajustes al reporte (lo que cambio o descarto)

| # | Qué hago | Por qué |
|---|---|---|
| 32 | Cambio optimista sí; envío del total **no**: se mandan deltas | Pisaría los descuentos de pedidos que entran al mismo tiempo (ver §0) |
| 22 | Contador en el título y resaltado de nuevos: sí. Aviso sonoro: **diferido** | El navegador bloquea audio sin interacción previa y haría falta un interruptor. Queda para después |
| 26 | Solo el aviso "Mostrando los últimos 100"; **sin paginar** | Con el volumen de un local chico alcanza |
| 41 | Se amplía | `--acento` sobre `--fondo` da 4,35:1: **falla** AA, no está "al límite". Además el blanco sobre `--cancelado` da 3,45:1 y los bordes de los campos (`--linea` sobre blanco) dan 1,34:1, por debajo del 3:1 que pide WCAG 1.4.11 |
| 8 | Se amplía | Los `aria-label` dicen "Quitar Paleta", sin el sabor. En una lista con varios sabores es ambiguo. Pasan a "Quitar una Oreo · Paleta" |
| 43 | Sin `loading.tsx` en la parte pública | Rompería el 404 del link del cliente (ver §0) |
| 44 | Las imágenes PNG van en `public/`, no como archivos de convención en `app/` | Next mete esos archivos en base64 dentro del bundle del Worker (`node_modules/next/dist/build/webpack/loaders/next-metadata-route-loader.js`, línea 85) y los sirve con `max-age=0`. En `public/` los sirve Cloudflare Assets, sin CPU y sin peso en el Worker |

No hay hallazgos que choquen con [[Decisiones]]:
- La confirmación pasa a vivir en `/pedido/<token>?nuevo=1`. Es la misma pantalla que pide Decisiones (número, resumen, "Avisar por WhatsApp", link), ahora con una URL que no se pierde.
- El link a "Datos del local" (#37) es un ancla; la sección no se mueve.

---

## 2. Referencias de Next 16.4.6 verificadas

Todas las rutas son relativas a `node_modules/next/dist/docs/01-app/`.

| API | Doc | Qué cambia respecto de versiones viejas |
|---|---|---|
| `redirect()` en Server Action con `useActionState` | `03-api-reference/04-functions/redirect.md`, `01-getting-started/07-mutating-data.md` ("Redirect after a mutation") | En Server Actions la navegación es **`push`** por defecto. Se llama fuera de `try`. Con JS no hay redirección HTTP: la acción responde **200 con el header `x-action-redirect: /ruta;push`** y, en el cuerpo, el payload RSC de la página destino (`node_modules/next/dist/server/app-render/action-handler.js`, líneas 266-330 y 860-870). Sin JS responde 303. **La prueba de humo tiene que leer ese header.** Ya funciona igual en `ingresar` (precedente probado en el Worker) |
| `refresh()` de `next/cache` | `03-api-reference/04-functions/refresh.md` | Es nuevo y solo se puede usar dentro de Server Actions (en otro lado tira error) |
| `error.tsx` | `03-api-reference/03-file-conventions/error.md` | Las props son `{ error: unknown, retry: () => void }`. **`retry` es estable desde 16.3 y reemplaza a `reset`.** En producción `error.message` es genérico y trae `digest`. No envuelve al `layout` de su mismo segmento |
| `not-found.tsx` | `03-api-reference/03-file-conventions/not-found.md` | El `app/not-found.tsx` raíz también atiende las URLs que no existen. Next agrega `noindex` solo. Hay que preferir Server Components, porque se manda con todas las rutas |
| `loading.tsx` | `03-api-reference/03-file-conventions/loading.md` ("Status codes", "Interaction with layout") | Hace que la respuesta empiece a transmitirse: un `notFound()` posterior sale con 200 (soft 404). Si el layout lee `cookies()`, no muestra el fallback para el layout |
| Íconos | `03-api-reference/03-file-conventions/01-metadata/app-icons.md` | `app/icon.svg` sirve (sale con `sizes="any"`). `favicon.ico` solo puede ir en la raíz de `app/` |
| Imagen OG | `03-api-reference/03-file-conventions/01-metadata/opengraph-image.md` | Por la nota de §1 uso `metadata.openGraph.images` apuntando a `public/` |
| `metadataBase`, `title.template`, `icons`, `openGraph` | `03-api-reference/04-functions/generate-metadata.md` (líneas ~205-345, ~391-465, ~581) | Una URL relativa sin `metadataBase` rompe el build. `title.template` aplica solo a los segmentos hijos y necesita `default`. `title.absolute` ignora el template |
| Metadata en streaming | `generate-metadata.md` ("Streaming metadata"), `01-getting-started/14-metadata-and-og-images.md` | En páginas dinámicas la metadata se inyecta después del contenido. Los bots (WhatsApp, Facebook) la reciben en el `<head>`. Para no consultar dos veces la base se usa `cache` de React ("Memoizing data requests") |
| `viewport.themeColor` por `media` y `colorScheme` | `03-api-reference/04-functions/generate-viewport.md` | `themeColor` dentro de `metadata` está deprecado: va en `viewport` |
| `next/font/google` | `01-getting-started/13-fonts.md`, `03-api-reference/02-components/font.md` | La fuente se descarga **en el build** (hace falta red) y se sirve como asset propio. Uso `variable` para exponerla como variable CSS |
| `useOptimistic` | `02-guides/forms.md` ("Optimistic updates") | Sin cambios de API. El valor optimista vuelve al prop cuando termina la transición, y `refresh()` trae el valor real en esa misma respuesta |
| `usePathname` | `03-api-reference/04-functions/use-pathname.md` | Solo en Client Components |
| `PageProps` / `LayoutProps` | `03-api-reference/03-file-conventions/page.md` (líneas 126-140) | Son globales y se generan en `next dev`, en `next build` o con `next typegen`. Si `npm run typecheck` falla con rutas nuevas, correr `npx next typegen` |
| Activity / preservar estado | `02-guides/preserving-ui-state.md` | **No aplica**: solo funciona con `cacheComponents`, que sigue apagado. El estado de la página se reinicia al navegar, como hasta ahora |

---

## 3. Dirección visual

El tema es "crema de helado, chocolate y frambuesa": fondo crema, tinta chocolate, acento frambuesa. Los estados se muestran como chips con fondo suave y texto oscuro, en lugar de texto blanco sobre color saturado. En modo oscuro los botones de acento llevan texto oscuro.

### 3.1 Colores (contraste calculado con la fórmula WCAG 2.x)

**Claro (`:root`)**

| Token | Valor | Contraste medido |
|---|---|---|
| `--fondo` | `#fff7ef` | |
| `--superficie` | `#ffffff` | |
| `--superficie-2` | `#fbefe4` | Para chips y filas agotadas |
| `--tinta` | `#2b1a12` | 15,7 sobre fondo; 16,7 sobre blanco |
| `--suave` | `#6e5a4f` (antes `#7a6458`) | 6,1 sobre fondo; 6,5 sobre blanco |
| `--linea` | `#ecdccd` | Solo para separadores decorativos |
| `--borde-control` | `#a38979` | 3,28 sobre blanco; 3,09 sobre fondo (cumple el 3:1 de 1.4.11) |
| `--acento` | `#c2255c` (antes `#d6336c`) | 5,33 como texto sobre fondo |
| `--acento-tinta` | `#ffffff` | 5,66 sobre `--acento` |
| `--acento-suave` | `#fde7ee` | |
| `--acento-fuerte` | `#9e1c4a` | 6,56 sobre `--acento-suave` |
| `--ok` | `#2f7d4f` | 5,04 sobre blanco; 4,75 sobre fondo |
| `--peligro` | `#b42318` | 6,2 a 6,6; texto blanco encima: 6,57 |
| `--peligro-tinta` | `#ffffff` | |
| `--peligro-suave` | `#fde8e6` | Texto `#8f1d14` encima: 7,59 |
| `--velo` | `rgb(255 255 255 / 80%)` | Para `.foto-subiendo` (#42) |

Chips de estado, como pares texto / fondo:

| Estado | Texto | Fondo | Contraste |
|---|---|---|---|
| nuevo | `#9e1c4a` | `#fde7ee` | 6,56 |
| preparado | `#7a4300` | `#fdf0d9` | 7,09 |
| entregado | `#1f5c38` | `#e3f3e8` | 6,90 |
| cancelado | `#5c544f` | `#efebe8` | 6,25 |

Borde izquierdo de las tarjetas (no es texto, pide 3:1 sobre blanco): nuevo `#c2255c` (5,66), preparado `#9a5b00` (5,43), entregado `#2f7d4f` (5,04), cancelado `#8a8a8a` (3,45).

**Oscuro (`@media (prefers-color-scheme: dark)`)**

| Token | Valor | Contraste medido |
|---|---|---|
| `--fondo` | `#1c1310` | |
| `--superficie` | `#2a1e19` | |
| `--superficie-2` | `#33251f` | |
| `--tinta` | `#f7ebe1` | 13,8 a 15,6 |
| `--suave` | `#bfa99b` | 7,2 a 8,1 |
| `--linea` | `#43322a` | |
| `--borde-control` | `#8a7264` | 3,60 sobre superficie; 4,06 sobre fondo |
| `--acento` | `#f06595` | 5,39 como texto sobre superficie |
| `--acento-tinta` | `#2b0a16` | 6,05: texto oscuro sobre el rosa |
| `--acento-suave` | `#4a1d2c` | |
| `--acento-fuerte` | `#ffb3c8` | 8,34 |
| `--ok` | `#5cc489` | 7,48 |
| `--peligro` | `#ff7b6e` | 6,40 |
| `--peligro-tinta` | `#1c1310` | 7,23 |
| `--peligro-suave` | `#4d1a15` | Texto `#ffb4ab` encima: 8,39 |
| `--velo` | `rgb(28 19 16 / 80%)` | |
| `--sombra` | `0 1px 0 rgb(0 0 0 / 35%)` | |

Chips en oscuro (texto / fondo): nuevo `#ffb3c8` / `#4a1d2c` (8,3); preparado `#ffd48a` / `#4a3410` (8,4); entregado `#9be3b5` / `#173a26` (8,4); cancelado `#d6cdc7` / `#3a332f` (7,9).

Bordes de tarjeta en oscuro: nuevo `#f06595`, preparado `#f2b84b`, entregado `#5cc489`, cancelado `#8a7264`.

`viewport.themeColor` (#42): `#fff7ef` en claro y `#1c1310` en oscuro, más `colorScheme: "light dark"`.

### 3.2 Tipografía

- **Títulos:** Fraunces, una serif blanda que acompaña la idea de "helado artesanal", con `next/font/google`:
  - `weight: "600"`, `subsets: ["latin"]` (incluye á, é, ñ, ¿ y ¡), `display: "swap"`, `variable: "--fuente-fraunces"`, `fallback: ["Georgia", "serif"]`.
  - Es un solo archivo WOFF2 de unos 25 a 35 KB. Si no se quiere ese peso, la alternativa es Young Serif 400.
  - Se usa solo en h1, h2, el número de pedido y el nombre del sabor en el admin.
- **Texto:** se queda la fuente del sistema (`system-ui, -apple-system, "Segoe UI", Roboto, sans-serif`), que no pesa nada.
- **Escala** (base 16 px, razón ~1,2):
  - `--texto-xs: .8125rem` (13 px, el mínimo, para metadatos)
  - `--texto-s: .875rem`, `--texto-m: 1rem`, `--texto-l: 1.125rem`
  - `--texto-xl: 1.375rem` (h2 de sabor), `--texto-2xl: 1.75rem` (h1 del admin)
  - `--texto-3xl: clamp(2rem, 1.6rem + 2vw, 2.75rem)` (h1 público)
  - Interlineado: `--alto-titulo: 1.1` y `--alto-texto: 1.45`
- **Números:** `font-variant-numeric: tabular-nums` en precios, totales, contadores y stock.

### 3.3 Espacios, radios, toques y movimiento

- **Espacios:** `--e-1: .25rem`, `--e-2: .5rem`, `--e-3: .75rem`, `--e-4: 1rem`, `--e-5: 1.5rem`, `--e-6: 2rem`, `--e-7: 3rem`.
- **Radios:** `--radio-s: 10px`, `--radio: 14px`, `--radio-l: 20px`, `--radio-pastilla: 999px`.
- **Toques:** `--toque: 44px`. Es el mínimo para `.contador button`, `.redondo` y todos los botones (#8).
- **Movimiento:** `--dur-corta: 150ms`, `--dur: 220ms`, `--curva: cubic-bezier(.2,.8,.2,1)`. Capas: `--z-nav: 5`, `--z-barra: 10`, `--z-avisos: 30`. El `<dialog>` va en la capa superior del navegador y no necesita `z-index`.
- **Movimiento reducido (#14):**
  - `scroll-behavior: smooth` va solo dentro de `@media (prefers-reduced-motion: no-preference)`.
  - En `@media (prefers-reduced-motion: reduce)`, todas las animaciones y transiciones pasan a `.01ms`.

### 3.4 Identidad (#13, sin parecer una tienda)

- **Encabezado público:** ícono de paleta en SVG en línea (`app/LogoPaleta.tsx`, componente de servidor, 40 px) más el h1 en Fraunces. El fondo es un `radial-gradient(120% 80% at 100% 0%, var(--acento-suave), transparent 60%)`, solo CSS.
- **Títulos de sabor:** h2 en Fraunces con una línea punteada que completa el ancho (`::after { flex: 1; border-top: 1px dashed var(--linea) }`).
- **Botón "+":** relleno con el acento. El "−" queda con contorno.
- **Navegación de sabores:** fija arriba, con `background: color-mix(in srgb, var(--fondo) 92%, transparent)` y `backdrop-filter: blur(8px)`. El chip activo va con fondo `--tinta` y texto `--fondo` (15,7:1).

### 3.5 Orden de `globals.css` (#45)

Secciones en comentarios, en este orden:
1. Tokens claro
2. Tokens oscuro
3. Base y reset
4. Tipografía
5. Formularios y botones
6. Componentes compartidos: chip, tarjeta, resumen, aviso, avisos flotantes, pasos, `.solo-lector`
7. Página pública
8. Hoja del pedido
9. Link del cliente
10. Admin: nav, pedidos y stock
11. `@media (min-width: 720px)`
12. Movimiento reducido

---

## 4. Fases y tareas

### F0. Rama y línea de base

1. `git status` muestra todo sin seguimiento y `main` no tiene commits. Confirmar que `.dev.vars` está ignorado (lo está, por `.dev.vars*`).
2. Hacer un commit de la v1 en `main` ("v1 publicada"). Después `git switch -c ux-ui`.
3. Un commit por fase (F1…F10).

### F1. Lógica pura y pruebas, primero (TDD; #46 y la base de #5, #6, #7, #11, #16, #20, #21, #24, #25, #28, #34, #37)

Escribir primero las pruebas de §5 en `tests/ui.test.ts`, verlas fallar y después implementar.

**`lib/formato.ts`** (se agrega):
- `numero(n: number): string` devuelve `"2.500"`, con el mismo `Intl` que `pesos`.
- `haceCuanto(ms: number, ahora = Date.now()): string`:
  - menos de 60 s (o negativo) → `"recién"`
  - menos de 60 min → `` `hace ${m} min` ``
  - el mismo día en hora argentina → `` `hoy ${HH:mm}` ``
  - el día anterior → `` `ayer ${HH:mm}` ``
  - si no → `fechaCorta(ms)`
  - El día se calcula con `Intl.DateTimeFormat("en-CA", { timeZone: "America/Argentina/Buenos_Aires", year, month, day })`. Argentina no tiene horario de verano, así que "ayer" es `ahora - 86_400_000`.
- `telefonoLegible(t: string): string`: si `t` cumple `/^549(\d{10})$/`, devuelve los 10 dígitos nacionales; si no, `t` tal cual. No agrupo por código de área porque cambia según la provincia.
- `linkTelefono(t: string): string`: `"tel:+" + t` si empieza con `549`; si no, `"tel:" + t`.
- `linkMapa(direccion: string): string` arma `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(direccion)}`.
- `origenSitio(host: string | null): string`: si el host es `localhost…` o `127.0.0.1…`, `http://host`; si no, `https://host`. Si es `null`, devuelve `"https://la-paleteria.lavadito.workers.dev"`.

**`lib/pedido.ts`** (se modifica y se agrega):
- `export type CampoPedido = "nombre" | "telefono" | "direccion" | "nota";`
- `leerPedido` devuelve `{ ok: false; error: string; campo?: CampoPedido }`. Los mensajes no cambian. Se agrega `campo` en: nombre → `"nombre"`, teléfono → `"telefono"`, dirección (falta o es demasiado larga) → `"direccion"`, nota larga → `"nota"`. Los errores de cantidades o de entrega van sin `campo`.
- `pasosDelPedido(estado: EstadoPedido, entrega: Entrega): { nombre: string; estado: "hecho" | "actual" | "pendiente" }[]`:
  - Los pasos son `"Recibido"`, después `"Listo para retirar"` (si es retiro) o `"Listo para enviar"` (si es envío), y al final `"Entregado"`.
  - Con índice nuevo=0, preparado=1, entregado=2: los anteriores al actual quedan `hecho` y el actual queda `actual`.
  - `cancelado` devuelve `[]`.
- `textoEstadoCliente(estado, entrega): string`:
  - nuevo: `"Ya lo recibimos. Te escribimos por WhatsApp cuando esté listo."`
  - preparado + retiro: `"¡Está listo! Ya podés pasar a retirarlo."`
  - preparado + envío: `"¡Está listo! En breve sale para tu dirección."`
  - entregado: `"Entregado. ¡Gracias por tu pedido!"`
  - cancelado: `"Este pedido fue cancelado. Si tenés dudas, escribinos."`
- `aPreparar(pedidos: { items: Pick<PedidoItem, "nombre" | "cantidad">[] }[]): { nombre: string; cantidad: number }[]` suma por `nombre` y ordena por cantidad (mayor primero) y después por nombre (`localeCompare` con `"es"`).

**`lib/mensajes.ts`** (nuevo; importa `textoPedido`):
- `mensajeAlCliente(p, extra: { textoRetiro?: string | null; link?: string | null } = {}): string`. `p` tiene la forma de `textoPedido` más `estado`:
  - nuevo: `` `Hola ${nombre}! Recibimos tu pedido #${id}:\n${textoPedido(p)}` ``. Si hay `link`, se agrega `` `\nSeguilo acá: ${link}` ``.
  - preparado + retiro: `` `Hola ${nombre}! Tu pedido #${id} ya está listo para retirar.` ``. Si hay `textoRetiro`, se agrega `` `\n${textoRetiro}` ``.
  - preparado + envío: `` `Hola ${nombre}! Tu pedido #${id} ya está listo y sale para ${direccion}.` ``
  - entregado: `` `Hola ${nombre}! Gracias por tu pedido #${id}. ¡Que lo disfrutes!` ``
  - cancelado: `` `Hola ${nombre}! Tu pedido #${id} fue cancelado. Si fue un error, escribinos y lo vemos.` ``
- `mensajeAlLocal(p, nuevo: boolean): string`:
  - si es nuevo: `` `Hola! Hice este pedido:\n${textoPedido(p)}` `` (es el texto que hoy arma `crearPedido`)
  - si no: `` `Hola! Te escribo por mi pedido #${id}.` ``

**`lib/eleccion.ts`** (nuevo, puro, sin DOM):
- `CLAVE_ELECCION = "paleteria:eleccion"` (sessionStorage), `CLAVE_CLIENTE = "paleteria:cliente"` (localStorage), `STOCK_BAJO = 3`.
- `type Eleccion = Record<number, number>`.
- `leerEleccion(json: string | null): Eleccion` tolera cualquier cosa. Se queda solo con ids enteros positivos y cantidades enteras de 1 a `MAX_POR_PRODUCTO`.
- `type Recorte = { id: number; nombre: string; pedidas: number; quedan: number }`.
- `recortarEleccion(e: Eleccion, productos: { id: number; nombre: string; stock: number }[]): { eleccion: Eleccion; recortes: Recorte[]; cambio: boolean }`:
  - `nombre` es el nombre completo ("Oreo · Paleta").
  - Los ids que ya no existen se descartan sin aviso (pasa cuando se archiva un producto).
  - Si no cambió nada, devuelve la misma referencia `e` con `cambio: false`.
- `textoRecorte(r: Recorte): string`:
  - si `quedan === 0`: `` `${nombre} se agotó y la sacamos de tu pedido.` ``
  - si `quedan === 1`: `` `${nombre}: quedaba 1, te dejamos 1.` ``
  - si no: `` `${nombre}: quedaban ${q}, te dejamos ${q}.` ``
- `type DatosCliente = { nombre: string; telefono: string; entrega: Entrega; direccion: string }`.
- `leerDatosCliente(json: string | null): DatosCliente | null`: los tipos tienen que ser `string`, `entrega` solo puede ser `retiro` o `envio` y los textos se recortan a 60, 30 y 160 caracteres. Si algo no cumple, devuelve `null`.
- `textoStock(stock: number): { texto: string; bajo: boolean }`:
  - 0 → `{ "Agotado", bajo: false }`
  - 1 → `{ "¡Última!", bajo: true }`
  - 2 a 3 → `` { `¡Últimas ${n}!`, bajo: true } ``
  - más → `` { `Quedan ${n}`, bajo: false } ``

**`lib/stock.ts`** (nuevo):
- `moverEnLista(ids: number[], id: number, dir: "arriba" | "abajo"): number[] | null`. Devuelve `null` si el id no está o ya está en el borde.
- `resumenStock(productos: { stock: number }[]): { activos: number; sinStock: number }`.

**`lib/datos.ts`** (se agregan versiones memorizadas con `cache` de React para que la metadata y la página no consulten dos veces; doc `14-metadata-and-og-images.md`):
```ts
export const ajustesActuales = cache(async () => leerAjustes(await db()));
export const cuentaPedidos = cache(async () => contarPorEstado(await db()));
export const pedidoDelToken = cache(async (token: string) => pedidoPorToken(await db(), token));
```

**Verificación:** `npm test` en verde y `npm run typecheck`.

### F2. Bases del CSS, contraste, modo oscuro y layout raíz (#41, #42, #45, #13, #14)

1. **`app/globals.css`:**
   - Reescribir los tokens de §3 y ordenar el archivo en las secciones de §3.5. Clases nuevas:
     - `.solo-lector` (oculta visualmente)
     - `.chip` con `.chip.estado-*` (reemplaza a `.estado`, sin texto blanco)
     - `.aviso` (aviso en línea, `--acento-suave`)
     - `.avisos` y `.aviso-flotante`
     - `.pasos`, `.sin-guardar`, `.marca-nueva`, `.campo-pesos`
     - `.esqueleto`, con una animación suave que se apaga con movimiento reducido
   - Inputs: `border: 1px solid var(--borde-control)`. Con `[aria-invalid="true"]`: borde `--peligro` y fondo `--peligro-suave`.
   - Labels en `--tinta`, peso 600 y `--texto-s` (antes iban en `--suave`).
   - `.pedido.estado-cancelado`: **sacar `opacity: .65`**. Pasa a `background: var(--superficie-2)` y el chip gris.
   - `.foto-subiendo` usa `background: var(--velo)` (#42).
   - `.boton.armado` y `.link.armado` comparten estilo: fondo `--peligro` y texto `--peligro-tinta`.
2. **`app/layout.tsx`:**
   - `const fraunces = Fraunces({ subsets: ["latin"], weight: "600", display: "swap", variable: "--fuente-fraunces", fallback: ["Georgia", "serif"] })` y `<html lang="es-AR" className={fraunces.variable}>`.
   - `metadata` estática, **sin D1**:
     ```ts
     {
       title: { default: "La Paletería", template: "%s · La Paletería" },
       description: "Paletas heladas: mirá qué hay y hacé tu pedido.",
       icons: { apple: "/apple-touch-icon.png" },
       twitter: { card: "summary_large_image" },
     }
     ```
   - `viewport`:
     ```ts
     {
       width: "device-width",
       initialScale: 1,
       colorScheme: "light dark",
       themeColor: [
         { media: "(prefers-color-scheme: light)", color: "#fff7ef" },
         { media: "(prefers-color-scheme: dark)", color: "#1c1310" },
       ],
     }
     ```
3. **`app/LogoPaleta.tsx`** (Server Component): un SVG en línea con `aria-hidden` y `viewBox="0 0 64 64"`. Es el mismo dibujo que `app/icon.svg` (ver F9).

**Verificación:** `npm run dev`, mirar `/` en claro y en oscuro (DevTools → Rendering → `prefers-color-scheme`). Correr Lighthouse o axe para contraste en `/` y `/admin/pedidos`.

### F3. Componentes compartidos (#31, #30, #17, #19, #27, #29, #32, #33, #22, #23, #40)

**`app/compartidos.tsx`** (nuevo, `"use client"`). Lo usan tanto la parte pública como el admin, para no cargar el bundle del admin en la página pública.
- `Refrescar({ segundos, oculta }: { segundos: number; oculta?: number })`. Se mueve desde `app/admin/componentes.tsx`.
  - Con la pestaña visible refresca cada `segundos`.
  - Con la pestaña oculta refresca cada `oculta` segundos; si `oculta` no está, no refresca.
  - Al volver a la pestaña (`visibilitychange` a visible) refresca enseguida si pasaron más de `segundos` desde la última vez.
  - Guarda la hora del último refresco en un `useRef`.
- `CompartirLink({ ruta, titulo }: { ruta: string; titulo: string })`:
  - Al montar detecta si existe `navigator.share` y recién ahí cambia el texto, para evitar un desajuste de hidratación. El texto arranca en "Copiar link" y pasa a "Compartir link" si hay `share`.
  - Con `share`, llama a `navigator.share({ title, url })` e ignora el `AbortError`.
  - Si no, llama a `navigator.clipboard.writeText(url)` y muestra `"¡Link copiado!"` en un `<span role="status">` durante 2,5 s.
  - Si el portapapeles falla, muestra un `<input readOnly value={url}>` ya seleccionado.
  - `url = location.origin + ruta`.
- `LimpiarBorrador()` hace `sessionStorage.removeItem(CLAVE_ELECCION)` al montar.

**`app/admin/componentes.tsx`** (se modifica):
- `Avisos({ children })` es un proveedor de contexto que renderiza siempre `<div className="avisos" role="status" aria-live="polite">`. `useAviso(): (a: { texto: string; tipo?: "ok" | "error"; accion?: { texto: string; hacer: () => void } }) => void`.
  - Sin proveedor no hace nada (por `/admin/ingresar`).
  - Duración: 4 s, o 7 s si tiene acción. Máximo 3 a la vez. Cada aviso trae un botón "×" con `aria-label="Cerrar aviso"`.
  - Va fijo abajo y centrado, respetando `env(safe-area-inset-bottom)`. Entra deslizándose, salvo con movimiento reducido. (#31)
- `FormAccion`:
  - Al terminar bien con `mensaje`, llama a `avisar({ texto: res.mensaje })` en un `useEffect([res])` y **deja de mostrar `.ok` pegado**.
  - Los errores siguen en línea con `role="alert"`.
  - Prop nueva `soloSiCambia?: boolean`. En `onInput` compara el `.value` contra el `.defaultValue` de cada `input[name]` que no sea hidden, y pone `data-sucio` en el form.
  - CSS: `form:not([data-sucio]) .guardar-si-cambia { display: none }`, y `form[data-sucio] .sin-guardar` visible con el texto "Sin guardar". (#33)
- `BotonSeguro`: se mantiene. Las clases `armado` funcionan en `.boton` y en `.link`. (#30)
- `BotonEstado({ id, estado, texto, principal, deshacerA }: { id: number; estado: EstadoPedido; texto: string; principal?: boolean; deshacerA?: EstadoPedido })`:
  - Usa `useActionState(cambiarEstado)` con ocultos `id` y `estado`.
  - Si sale bien, avisa con `res.mensaje`, y si hay `deshacerA` agrega la acción `{ texto: "Deshacer", hacer: () => startTransition(async () => { const r = await cambiarEstado(null, fd(id, deshacerA)); if (r && !r.ok) avisar({ texto: r.error, tipo: "error" }) }) }`. (#23)
- `NavAdmin({ nuevos }: { nuevos: number })`:
  - Usa `usePathname()` para poner `aria-current="page"` en Pedidos o Stock.
  - Junto a "Pedidos" muestra `<span className="cuenta" aria-label={`${nuevos} nuevos`}>{nuevos}</span>` si `nuevos > 0`.
  - Incluye "Ver página ↗" (`target="_blank"`) y el form de `salir`, importado directo de `../acciones`. (#27)
- `RegistrarVistos({ maxId })` y `MarcaNueva({ id })` (#22):
  - Un store a nivel de módulo guarda `ultimoVisto`, que vive en `localStorage["paleteria:ultimo-pedido-visto"]`.
  - `RegistrarVistos`:
    - si no hay valor guardado, guarda `maxId` (en la primera visita no marca nada);
    - con `visibilitychange` a oculta o con `pagehide`, guarda el `maxId` vigente (leído de un ref) y avisa a los suscriptores.
  - `MarcaNueva` usa `useSyncExternalStore(suscribir, () => ultimoVisto ?? Infinity, () => Infinity)` y renderiza `<span className="marca-nueva">Nuevo</span>` si `id > snapshot`.
  - CSS: `.pedido:has(.marca-nueva)` lleva un anillo de 2 px en `--acento`.
- `ControlStock({ id, nombre, stock }: { id: number; nombre: string; stock: number })` (#29, #32):
  ```ts
  const [valor, aplicar] = useOptimistic(stock, (a: number, c: { tipo: "sumar" | "fijar"; n: number }) =>
    c.tipo === "sumar" ? Math.max(0, a + c.n) : c.n);
  ```
  - `enviar(c)` hace `startTransition(async () => { aplicar(c); const r = await (c.tipo === "sumar" ? ajustarStock : fijarStock)(null, fd); if (r && !r.ok) setError(r.error) })`. Con "sumar" manda `delta`; con "fijar" manda `stock`.
  - **Sin `fieldset disabled`**: tocar "+ + +" rápido suma 3, cada toque es una acción atómica y la última `refresh()` deja el valor real.
  - El campo es controlado, con `borrador: string | null`.
    - `onBlur` confirma: si el texto es `/^\d+$/` y distinto de `valor`, llama a `enviar({ tipo: "fijar", n })`.
    - `Enter` hace `blur()`. `Escape` descarta el borrador.
    - Mientras el borrador difiere, el campo lleva `data-sucio` y se ve `<span className="sin-guardar">Sin guardar</span>`.
  - Va dentro de `role="group"` con `aria-label={`Stock de ${nombre}`}`. Los botones redondos de 44 px tienen `aria-label` "Restar uno de …" y "Sumar uno de …".
  - Los errores se muestran en línea con `.error`.
- `FotoProducto` (#30, #38, #42):
  - "Quitar" pasa a `BotonSeguro className="link" pregunta="¿Quitar foto?"`.
  - En el `catch` de `elegir`: si `archivo.type` es `image/heic` o `image/heif`, o el nombre cumple `/\.hei[cf]$/i`, el mensaje es "Las fotos HEIC del iPhone no se pueden leer acá. Probá con una captura de pantalla o un JPG." Si no, queda el mensaje actual.
- `CampoClave()` (#40): input de clave con un botón "Mostrar"/"Ocultar" (`type="button"`, `aria-pressed`). Cambia el `type` entre `password` y `text`.

**Verificación:** typecheck. Lo visual se prueba en las fases que siguen.

### F4. Cambios en el servidor y en la prueba de humo (#1, #4, #23, #34)

1. **`app/acciones.ts`:**
   - `export type ResultadoPedido = { ok: false; error: string; campo?: CampoPedido } | null;`. Se borra `PedidoCreado`.
   - El cierre de `crearPedido`, después del `try/catch` del batch y fuera del `try`:
     ```ts
     refresh();
     redirect(`/pedido/${token}?nuevo=1`);
     ```
   - Se borran el `leerAjustes`, el texto y el link de WhatsApp: el link al local pasa a armarlo la página del pedido. Ya no hace falta leer `res[0]` (se puede sacar `RETURNING id`).
   - Los errores de `leerPedido` se devuelven tal cual, con `campo` incluido.
2. **`app/admin/acciones.ts`:**
   - `cambiarEstado` devuelve mensajes: preparado → `` `Pedido #${id} listo.` ``; entregado → `` `Pedido #${id} entregado.` ``; nuevo → `` `Pedido #${id} volvió a nuevo.` ``. El de cancelar no cambia.
   - `editarSabor` solo edita `nombre`, porque el orden pasa a los botones. Error: "Escribí el nombre del sabor." Mensaje: "Sabor guardado."
   - `editarProducto`: mensaje `` `"${nombre}" guardado.` ``.
   - Nuevas:
     ```ts
     export async function moverSabor(_prev: Resultado, form: FormData): Promise<Resultado>
     // exigirSesion(); id = entero(form,"id",1); dir ∈ {"arriba","abajo"} si no → error("Movimiento inválido.")
     // ids = SELECT id FROM sabores WHERE activo = 1 ORDER BY orden, id
     // nuevo = moverEnLista(ids, id, dir); si null → ok()
     // DB.batch(nuevo.map((sid, i) => UPDATE sabores SET orden = ? WHERE id = ?  .bind(i + 1, sid))); refresh(); ok()
     export async function moverProducto(_prev: Resultado, form: FormData): Promise<Resultado>
     // igual, con: SELECT id FROM productos WHERE activo = 1
     //   AND sabor_id = (SELECT sabor_id FROM productos WHERE id = ?) ORDER BY orden, id
     ```
     Reordenan sobre las columnas `orden` que ya existen (`migrations/0000_esquema_inicial.sql`). No hace falta migración. Al renumerar 1..n se arreglan también los empates.
3. **`scripts/humo.mjs`:**
   - Mover `sinMarcas` arriba de todo.
   - En `accion()`, devolver también `redirige: r.headers.get("x-action-redirect")`.
   - Helpers:
     ```js
     const tokenDe = (r) => /\/pedido\/([0-9a-f-]{36})/.exec(r.redirige ?? "")?.[1];
     async function idDe(token) {
       const t = sinMarcas(await (await fetch(`${base}/pedido/${token}`)).text());
       return Number(/Pedido #(\d+)/.exec(t)?.[1]) || null;
     }
     ```
   - p1: `t1 = tokenDe(p1)` e `id1 = await idDe(t1)`. El check pasa a ser "Un pedido de 2 se crea y redirige a su link".
   - Check nuevo: `/pedido/${t1}?nuevo=1` incluye "Recibimos tu pedido".
   - Carrera: `ganaron = carrera.filter(tokenDe).length`. Ganador: `idG = await idDe(tokenDe(carrera.find(tokenDe)))`. Cancelar y preparar usan `id1` e `idG`.
   - Checks nuevos:
     - `GET /pedido/00000000-0000-0000-0000-000000000000` da 404 y contiene "No encontramos ese pedido".
     - `moverSabor` sin sesión se rechaza.
     - Con sesión, `moverSabor {id:"1", dir:"abajo"}` y después `{dir:"arriba"}` dan los dos `ok`.
   - La regex de `publicos()` no cambia (ver §0). Actualizar el número de pasos en `README.md` y en la [[Bitácora]].

**Verificación:** `npm test` (incluye los tests de `leerPedido` con `campo`, ver §5) y typecheck. La prueba de humo completa va en F10.

### F5. Página pública `/` y `app/Pedir.tsx` (#2 al #15)

Conviene partir `Pedir.tsx` en `app/Pedir.tsx` (estado, lista, navegación y barra) y `app/HojaPedido.tsx` (el `<dialog>` con el formulario).

**`app/page.tsx`:**
- `generateMetadata`:
  ```ts
  await connection();
  const [a, h] = await Promise.all([ajustesActuales(), headers()]);
  return {
    metadataBase: new URL(origenSitio(h.get("host"))),
    title: { absolute: a.nombre_local },
    description: "Paletas heladas: mirá qué hay y hacé tu pedido.",
    openGraph: {
      title: a.nombre_local,
      description: "Mirá qué hay y hacé tu pedido.",
      images: [{ url: "/og.png", width: 1200, height: 630, alt: "Paletas heladas" }],
      locale: "es_AR",
      type: "website",
    },
  };
  ```
- La página usa `ajustesActuales()`, que está memorizada.
- Encabezado (#12, #13):
  - `<div className="marca"><LogoPaleta/><h1>{nombre}</h1></div>`
  - `<p className="bajada">Elegí cuántas querés, hacé tu pedido y coordinamos por WhatsApp.</p>`
  - Si hay `texto_retiro`: `<p className="retiro"><strong>Retiro:</strong> {texto_retiro}</p>`
- La forma de los productos que se pasan a `Pedir` no cambia (§0).

**`app/Pedir.tsx`:**
- `nombreCompleto` es un `Map<id, "Sabor · Producto">` armado con `useMemo`.
- **Elección guardada (#6) y recortes (#5):** un solo `useEffect([productos])`.
  - En la primera pasada parte de `leerEleccion(sessionStorage.getItem(CLAVE_ELECCION))`; en las siguientes, de las cantidades actuales (leídas de un ref).
  - Aplica `recortarEleccion`. Si `cambio`, hace `setCantidades` y `setRecortes`.
  - Otro `useEffect([cantidades])` guarda en sessionStorage, pero solo después de la primera carga, controlado con un ref.
  - Si después del recorte `unidades === 0`, cierra la hoja.
- **Aviso de recorte (#5):**
  ```tsx
  <div className="aviso" role="status">
    <p>Cambió el stock mientras elegías:</p>
    <ul>{recortes.map(textoRecorte)}</ul>
    <button className="link">Entendido</button>
  </div>
  ```
  Se muestra arriba de la lista y, si la hoja está abierta, también arriba del resumen.
- **Navegación de sabores (#10):**
  - Un `IntersectionObserver` sobre las `section`, con `rootMargin: "-80px 0px -60% 0px"`, actualiza `saborVisible`.
  - El chip del sabor visible lleva `aria-current="true"` y se acomoda con `scrollIntoView({ block: "nearest", inline: "center" })`.
  - Si hay paletas elegidas de un sabor, el chip muestra `<span className="cuenta-sabor" aria-label={`${n} elegidas`}>{n}</span>`.
- **Fila de producto (#3, #8, #11, #15):**
  - Foto de 76 px, `loading={i < 4 ? "eager" : "lazy"}`, `decoding="async"`.
  - Si está agotado: `.producto.agotado`, con la foto en `filter: grayscale(1); opacity: .5` **solo en la foto**, el texto con contraste normal y `<span className="chip estado-cancelado">Agotado</span>`. Se saca el `aria-disabled` del `li`.
  - La línea de stock es `textoStock(p.stock)`. Si `bajo`, lleva la clase `.stock.bajo` (color `--acento`, peso 600).
  - Contador: `<div className="contador" role="group" aria-label={`Cantidad de ${completo}`}>`, botones de 44 px con `aria-label` `` `Quitar una ${completo}` `` y `` `Agregar una ${completo}` ``, y el `<output>` sin `aria-live`.
  - Una sola región `<p className="solo-lector" aria-live="polite">{anuncio}</p>`. `cambiar` pone `` `${n} ${completo}` ``.
- **Barra (#14):** queda montada aunque la hoja esté abierta, para que el foco vuelva a "Pedir" al cerrarla. Entra con `animation: subir var(--dur) var(--curva)`.

**`app/HojaPedido.tsx` (#2, #4, #7, #9):**
- Con `<dialog ref className="hoja" aria-labelledby="titulo-hoja">`:
  - Un `useEffect([abierto])` llama a `showModal()` y después enfoca el `h2#titulo-hoja` (`tabIndex={-1}`), o llama a `close()`.
  - `onClose={() => setAbierto(false)}`. Esc lo maneja el navegador.
  - `onClick` cierra si `e.target === e.currentTarget` (clic en el fondo).
  - CSS:
    - `dialog.hoja { margin: auto auto 0; width: min(640px, 100%); max-height: 92dvh; padding: 0; border: 0; border-radius: var(--radio-l) var(--radio-l) 0 0 }`
    - `::backdrop { background: rgb(28 19 16 / 50%) }`
    - `:root:has(dialog[open]) { overflow: hidden }` traba el scroll del fondo
    - desde 720 px, el diálogo va centrado y con todos los bordes redondeados
- **Datos guardados (#7):**
  - Al montar se lee `leerDatosCliente(localStorage.getItem(CLAVE_CLIENTE))`. Los campos del formulario usan `key={cargado ? "con" : "sin"}`, así los `defaultValue` se aplican después de leer.
  - `entrega` arranca con el valor guardado.
  - Checkbox `Recordar mis datos en este celular`, sin `name` y marcado por defecto.
  - En el `onSubmit` del form (corre antes de la acción): si está marcado, guarda nombre, teléfono, entrega y dirección; si no, borra la clave.
- **Teléfono (#9):** `type="tel"`, `inputMode="tel"`, `autoComplete="tel"`.
- **Errores (#4):**
  - `useEffect([res])`: si hay error, enfoca `form.elements.namedItem(res.campo)` o, si no hay `campo`, el `<p id="error-pedido" tabIndex={-1} role="alert">`, y hace `scrollIntoView({ block: "center" })`.
  - Los inputs llevan `aria-invalid={res?.campo === "x" || undefined}` y `aria-describedby="error-pedido"` cuando corresponde.
  - El error se muestra arriba del botón Confirmar.
- **Antes de confirmar (#12):** `<p className="ayuda">Al confirmar te mostramos el link para seguir tu pedido. Después coordinamos por WhatsApp.</p>`.
- **Botón:** `Confirmar pedido · $ X`; mientras envía, "Enviando…". Al confirmar, la acción redirige (F4) y la confirmación vieja en memoria se borra.

**Verificación:**
- `npm run dev`. Elegir, recargar: las cantidades siguen.
- Tab, Esc, clic en el fondo y foco de vuelta.
- Error de teléfono con el teclado abierto (emulación móvil).
- Agotar desde otra pestaña y ver el aviso de recorte.

### F6. Link del cliente `/pedido/[token]` como confirmación (#1, #16 al #19)

**`app/pedido/[token]/page.tsx`:**
- `generateMetadata`: `` { title: { absolute: p ? `Pedido #${p.id} · ${a.nombre_local}` : "Pedido" }, robots: { index: false } } ``, con `pedidoDelToken` y `ajustesActuales` memorizados.
- Lee `const nuevo = (await searchParams).nuevo === "1"`.
- Si es nuevo:
  - `<LimpiarBorrador/>`
  - `<h1 className="confirmacion-titulo">¡Recibimos tu pedido!</h1>`
  - `<p className="numero-pedido">Pedido #{p.id}</p>`, que mantiene el texto que lee la prueba de humo
  - `<p className="ayuda">Guardá este link para ver cómo va.</p>`
- Si no: `<h1>Pedido #{p.id}</h1>`.
- `PasosPedido` (componente de servidor en el mismo archivo):
  - `<ol className="pasos" aria-label="Estado del pedido">`, armado desde `pasosDelPedido`. El paso actual lleva `aria-current="step"`.
  - Si está cancelado, en su lugar va `<p className="aviso">`.
  - Debajo, `textoEstadoCliente`.
- Datos: nombre · `fechaCorta`. Si es envío, "Envío a {dirección}". Si es retiro, "Retiro en el local" y, si hay `texto_retiro`, `<p><strong>Dónde retirar:</strong> {texto_retiro}</p>` (#18).
- Resumen y total.
- Acciones:
  - Si el local cargó WhatsApp: `<a className="boton-principal">` con `linkWhatsApp(ajustes.whatsapp, mensajeAlLocal(p, nuevo))`. El texto es "Avisar por WhatsApp" si es nuevo, o "Escribir al local" si no (#18).
  - `<CompartirLink ruta={`/pedido/${token}`} titulo={`Pedido #${p.id}`}/>` (#19).
  - `<Link href="/" className="boton-secundario">Hacer otro pedido</Link>`.
- Si el estado es nuevo o preparado: `<Refrescar segundos={45}/>` (#17).

**`app/pedido/[token]/not-found.tsx`:** "No encontramos ese pedido" y "Revisá que el link sea el que te quedó al pedir. Si no lo encontrás, escribinos por WhatsApp.", con un link "Volver a la lista".

**Verificación:**
- Pedir: la URL queda en `/pedido/…?nuevo=1`. Al recargar se mantiene.
- Cambiar el estado desde el admin: en 45 s se mueve la línea de pasos.
- "Copiar link" en el escritorio y "Compartir" en el celular.
- Un token inválido da 404 con la página propia.

### F7. Admin: layout y Pedidos (#20 al #28, #39)

**`app/admin/(panel)/layout.tsx`:**
- `metadata = { title: { template: "%s · Admin", default: "Admin" }, robots: { index: false } }`.
- `await requerirSesion(); const cuenta = await cuentaPedidos();`.
- Renderiza `<Avisos><div className="admin"><NavAdmin nuevos={cuenta.nuevo}/>{children}</div></Avisos>`.

**`app/admin/(panel)/pedidos/page.tsx`:**
- `generateMetadata`: `` await requerirSesion(); const c = await cuentaPedidos(); return { title: c.nuevo ? `(${c.nuevo}) Pedidos` : "Pedidos" }; `` (#22, #39). Verificar que el título cambie con el `router.refresh()`. Si no cambiara, el respaldo es un componente cliente que hace `document.title` en un efecto.
- `<Refrescar segundos={30} oculta={60}/>`. Con la pestaña de fondo también refresca: si no, el contador del título nunca se movería.
- `<RegistrarVistos maxId={Math.max(0, ...pedidos.map(p => p.id))}/>`.
- Si el filtro es `activos` o `nuevo` y hay nuevos, un resumen para producir (#28) arriba de la lista:
  ```tsx
  <details className="tarjeta a-preparar" open>
    <summary>Para preparar · {total} paletas</summary>
    <ul className="resumen">{aPreparar(nuevos)}</ul>
  </details>
  ```
- Si `pedidos.length === 100`: `<p className="ayuda">Mostrando los últimos 100 pedidos.</p>` (#26).
- `const ahora = Date.now()` una vez por render. `const origen = origenSitio((await headers()).get("host"))`.

**`TarjetaPedido`:**
- `<li id={`pedido-${p.id}`}>`.
- Encabezado: `<strong>#{p.id} · {p.cliente_nombre}</strong>` (**mismo formato que hoy**), después `<MarcaNueva id={p.id}/>` y `<span className={`chip estado-${p.estado}`}>`.
- Meta: `<time dateTime={iso} title={fechaCorta(p.creado)}>{haceCuanto(p.creado, ahora)}</time> · <a href={linkTelefono(tel)}>{telefonoLegible(tel)}</a>` (#20, #24).
- Entrega: si es envío, `Envío a <a href={linkMapa(dir)} target="_blank" rel="noopener noreferrer">{dir}</a>`; si es retiro, "Retira en el local" (#25).
- WhatsApp: `linkWhatsApp(p.cliente_telefono, mensajeAlCliente(p, { textoRetiro: ajustes.texto_retiro, link: `${origen}/pedido/${p.token}` }))` (#21). Lee `ajustesActuales()` una sola vez.
- Botones:
  - nuevo: `<BotonEstado estado="preparado" texto="Preparado" principal deshacerA="nuevo"/>`
  - preparado: `<BotonEstado estado="entregado" texto="Entregado" principal deshacerA="preparado"/>` y `<BotonEstado estado="nuevo" texto="Volver a nuevo"/>`
  - entregado: `<BotonEstado estado="preparado" texto="Volver a preparado"/>`
  - "Cancelar" sigue con `BotonSeguro`, sin "Deshacer": un cancelado no se reabre (Decisiones).

**Verificación:**
- Con la pestaña en segundo plano, crear un pedido: en 60 s o menos el título pasa a "(1) Pedidos · Admin".
- Al volver, la tarjeta tiene "Nuevo" y un anillo.
- Al marcar "Entregado", aparece el aviso con "Deshacer" y vuelve a Preparado.
- `tel:` y Maps abren bien.

### F8. Admin: Stock (#29 al #37)

**`app/admin/(panel)/stock/page.tsx`:**
- `metadata = { title: "Stock" }`.
- Resumen arriba (#37):
  ```tsx
  <p className="resumen-stock">
    <strong>{activos}</strong> productos activos · <strong>{sinStock}</strong> sin stock · <a href="#datos-local">Datos del local ↓</a>
  </p>
  ```
  Si `sinStock > 0`, abajo `<p className="ayuda">Sin stock: </p>` con links `#producto-<id>` ("Oreo · Paleta").
- `SeccionSabor`:
  - `FormAccion editarSabor soloSiCambia` con `[input.titulo (Fraunces)] [<span className="sin-guardar">Sin guardar</span>] [<button className="boton-principal guardar-si-cambia">Guardar</button>]`. **Sin el campo de orden.**
  - `Mover`: dos `FormAccion` con `moverSabor` y ocultos `{ id, dir }`, botones `↑` y `↓` con `aria-label` "Subir {sabor}" y "Bajar {sabor}", deshabilitados en los bordes (#34).
  - Archivar: `FormAccion activarSabor` con `<BotonSeguro className="link" pregunta="¿Archivar? Sale de la página">Archivar sabor</BotonSeguro>` (#30).
- Fila de producto (#36):
  ```tsx
  <li id={`producto-${p.id}`} className="fila-producto" data-sin-stock={p.stock === 0 || undefined}>
  ```
  1. `FotoProducto`, en el área `foto`.
  2. `FormAccion editarProducto soloSiCambia className="producto-datos"`, en el área `datos`:
     - nombre
     - `<span className="campo-pesos"><span aria-hidden>$</span><input name="precio" defaultValue={numero(p.precio)} inputMode="numeric" aria-label={`Precio de ${p.nombre} en pesos`}/></span>` (#35). `parsePesos` ya acepta "2.500".
     - "Sin guardar" y Guardar
  3. `<ControlStock id stock nombre={completo}/>`, en el área `stock`.
  4. Área `menu`: `↑` y `↓` con `moverProducto`, más `<BotonSeguro className="link" pregunta="¿Archivar? Sale de la página">Archivar</BotonSeguro>`.
  - CSS:
    - en el celular: `grid-template-columns: 64px 1fr auto; grid-template-areas: "foto datos datos" "foto stock menu"`
    - desde 720 px: `"foto datos stock menu"` con columnas `64px 1fr auto auto`
- "Agregar producto" y "Agregar sabor" no cambian; los mensajes van al aviso flotante.
- `<section id="datos-local" className="tarjeta">` sigue **abajo de todo**. El WhatsApp pasa a `type="tel"`.

**Verificación:**
- "+ + + +" rápido suma 4 y, al recargar, el valor coincide.
- Escribir 10 y tocar fuera guarda, sin Enter. "Sin guardar" aparece mientras se escribe.
- Archivar pide un segundo toque.
- ↑ y ↓ cambian el orden en `/`.
- En un ancho de 360 px la fila se ve ordenada.

### F9. Ingreso, errores, carga, íconos e imagen OG (#40, #43, #44)

1. **`app/admin/ingresar/page.tsx`:**
   - `metadata = { title: { absolute: "Ingresar · Admin" }, robots: { index: false } }`.
   - `await connection()` y `ajustesActuales()`.
   - `<LogoPaleta/>`, `<h1>Admin</h1>` y `<p className="ayuda">{nombre_local}</p>`.
   - `<CampoClave/>`.
2. **`app/not-found.tsx`:** Server Component **sin D1**. "No encontramos esta página", "Puede que el link esté mal escrito." y un `<Link href="/">Ver las paletas</Link>`. `metadata = { title: "No encontrada" }`.
3. **`app/error.tsx`:** `"use client"`, props `{ error: unknown; retry: () => void }`.
   - Textos: "Algo salió mal" y "No pudimos cargar esto. Probá de nuevo en un momento."
   - Botones: `<button className="boton-principal" onClick={() => retry()}>Probar de nuevo</button>` y `<a href="/">Volver a la lista</a>`.
   - Si `error instanceof Error && error.digest`, se muestra chico: "Código: {digest}".
4. **`app/admin/(panel)/error.tsx`:** igual, con el texto "Si pasó al guardar, puede que la sesión haya vencido." y los links "Ingresar de nuevo" (`/admin/ingresar`) e "Ir a Pedidos".
5. **`app/admin/(panel)/loading.tsx`:** `<main aria-busy="true"><p className="solo-lector">Cargando…</p>` más tres `<div className="tarjeta esqueleto"/>`. **No poner `loading.tsx` en la raíz.**
6. **Íconos y OG:**
   - **`app/icon.svg`** usa el archivo de convención; pesa menos de 1 KB. Dibujo orientativo, para ajustar a ojo:
     ```svg
     <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">
       <rect width="64" height="64" rx="14" fill="#fff7ef"/>
       <rect x="27" y="40" width="10" height="20" rx="5" fill="#d9a066"/>
       <rect x="16" y="6" width="32" height="40" rx="16" fill="#c2255c"/>
       <path d="M16 22A16 16 0 0 1 48 22V28Q45 34 42 28Q39 22 36 30Q33 38 30 30Q27 22 24 29Q21 36 18 29Q17 27 16 28Z" fill="#2b1a12"/>
     </svg>
     ```
   - **Borrar `app/favicon.ico`** (es el ícono de Next y va en base64 dentro del Worker) y crear `public/favicon.ico`.
   - `public/apple-touch-icon.png` de 180×180, con fondo crema y sin transparencia.
   - `public/og.png` de 1200×630 y menos de 150 KB:
     - fondo `#fff7ef`, la paleta grande a la izquierda
     - "La Paletería" en Georgia bold 96 px `#2b1a12`
     - "Paletas heladas · Mirá qué hay y pedí" en 40 px `#6e5a4f`
     - una franja de 24 px en `#c2255c` abajo
   - **Cómo generarlos sin dependencias:**
     1. Escribir HTML o SVG en el scratchpad.
     2. Sacar la captura con Edge sin ventana:
        ```
        "/c/Program Files (x86)/Microsoft/Edge/Application/msedge.exe" --headless=new --disable-gpu --hide-scrollbars --force-device-scale-factor=1 --window-size=1200,630 --screenshot="<repo>/public/og.png" "file:///<scratchpad>/og.html"
        ```
        Lo mismo para el ícono de 180×180 y para un PNG de 48×48.
     3. Envolver el PNG de 48 px en un ICO con un script de Node en el scratchpad:
        - cabecera `00 00 01 00 01 00`
        - entrada de 16 bytes: ancho 48, alto 48, 0, 0, planos 1, bits 32, tamaño del PNG, offset 22
        - y a continuación el PNG
   - La URL absoluta de la OG sale de `metadataBase` en `app/page.tsx` (F5).

**Verificación:**
- `/no-existe` muestra la página propia con status 404.
- Forzar un error (por ejemplo, tirar uno a mano en dev) y ver `error.tsx`.
- El `<head>` de `/` tiene `og:image` con la URL absoluta, `apple-touch-icon` y dos `theme-color`.
- Pegar el link en WhatsApp después de publicar.

### F10. Verificación y notas del vault

1. `npm test` y `npm run typecheck` (si faltan tipos de rutas: `npx next typegen`).
2. `npx opennextjs-cloudflare build`, después `npx wrangler dev --port 8787` en otra terminal, y `node scripts/humo.mjs http://localhost:8787 <clave>`. Todo en verde.
3. Tamaño: `npx wrangler deploy --dry-run` tiene que dar menos de 3 MiB en gzip (hoy ~1 MiB). La fuente y las PNG no deberían sumar al Worker.
4. Checklist manual (Chrome en un celular emulado de 360 px y en el escritorio, claro y oscuro):
   - **Público:**
     - Tab llega a todo y el foco se ve.
     - Esc y clic en el fondo cierran la hoja y el foco vuelve a "Pedir".
     - El fondo no scrollea con la hoja abierta.
     - "Quitar una Oreo · Paleta" se anuncia con el lector de pantalla (NVDA o Narrador).
     - El chip del sabor se marca al scrollear.
     - "¡Últimas 2!" aparece con stock bajo.
     - Agotado: foto gris y texto legible.
     - Recargar mantiene la elección. El segundo pedido trae los datos precargados.
     - Movimiento reducido apaga las animaciones.
   - **Confirmación:**
     - La URL es estable y recargar no la pierde.
     - WhatsApp al local abre con el texto del pedido.
     - "Copiar link" funciona.
     - La línea de pasos avanza sola.
   - **Admin:**
     - La sección activa está marcada y la cuenta de nuevos aparece en la nav y en el título.
     - "hace N min" con la hora exacta en el `title`.
     - `tel:` y Maps funcionan.
     - El mensaje de WhatsApp cambia por estado (probar los 4).
     - Deshacer después de Entregado.
     - Stock: optimista, se guarda al salir del campo, Guardar solo aparece si hay cambios, ↑ y ↓ ordenan, el archivar pide confirmación y los avisos se van solos.
     - Foto HEIC da el mensaje específico.
   - **Contraste:** axe o Lighthouse sin fallas de contraste en `/`, `/pedido/…` y `/admin/*`, en claro y en oscuro.
5. **Vault y README:**
   - [[Bitácora]]: entrada de la sesión 2.
   - [[Pendientes]]: lo diferido (§6).
   - [[Decisiones]]:
     - la confirmación vive en `/pedido/<token>?nuevo=1`
     - el stock en el admin es optimista y se ajusta por delta
     - el orden se cambia con botones
     - los datos del cliente se recuerdan solo en su navegador
   - [[Diseño]]: tokens y tipografía.
   - `README.md`:
     - la ruta `/pedido/<token>` es confirmación más estado
     - número de pasos de la prueba de humo
     - trampas nuevas: imágenes de metadata en `public/`, sin `loading.tsx` en la raíz, no leer D1 en el layout raíz ni en `not-found`, y la prueba de humo lee `x-action-redirect`
   - [[Pedidos del usuario]] ya tiene el pedido 5.

---

## 5. Pruebas unitarias nuevas (`tests/ui.test.ts`, más ajustes en `tests/logica.test.ts`)

- **`tests/logica.test.ts`, línea 48:** pasa a `toEqual({ ok: false, error: "Escribí la dirección de envío.", campo: "direccion" })`.
  - Casos nuevos:
    - teléfono `"123"` da `campo: "telefono"`
    - sin nombre da `campo: "nombre"`
    - `"Elegí al menos una paleta."` **sin** `campo` (la línea 32 no cambia)
- **`haceCuanto`**, con `ahora = Date.UTC(2026, 10, 14, 21, 40)` (18:40 en Argentina):
  - −30 s → `"recién"`
  - +10 s (reloj adelantado) → `"recién"`
  - −1 min → `"hace 1 min"`
  - −59 min → `"hace 59 min"`
  - −2 h → `"hoy 16:40"`
  - `Date.UTC(2026, 10, 14, 1, 0)` (22:00 del 13 en Argentina) → `"ayer 22:00"`
  - −3 días → `"11/11 18:40"`
- **`telefonoLegible`:** `"5491123456789"` → `"1123456789"`; `"12345678"` → `"12345678"`.
- **`linkTelefono`:** `"5491123456789"` → `"tel:+5491123456789"`; `"12345678"` → `"tel:12345678"`.
- **`linkMapa`:** `"Av. Siempreviva 742"` → `"https://www.google.com/maps/search/?api=1&query=Av.%20Siempreviva%20742"`.
- **`numero`:** 2500 → `"2.500"`.
- **`origenSitio`:** `"localhost:8787"` → `"http://localhost:8787"`; `"x.workers.dev"` → `"https://x.workers.dev"`; `null` → la URL por defecto.
- **`mensajeAlCliente`**, con el pedido de ejemplo de `textoPedido` (#7 Ana):
  - nuevo, con y sin `link`
  - preparado con retiro, con y sin `textoRetiro`
  - preparado con envío (`"…ya está listo y sale para Calle 123."`)
  - entregado y cancelado, con los textos exactos de F1
- **`mensajeAlLocal`:** nuevo empieza con `"Hola! Hice este pedido:\nPedido #7 · Ana"`; si no es nuevo, `"Hola! Te escribo por mi pedido #7."`.
- **`pasosDelPedido`:**
  - nuevo + retiro → `[Recibido actual, Listo para retirar pendiente, Entregado pendiente]`
  - preparado + envío → `[hecho, "Listo para enviar" actual, pendiente]`
  - entregado → `[hecho, hecho, actual]`
  - cancelado → `[]`
- **`textoEstadoCliente`:** los 5 textos.
- **`aPreparar`:** con `[{items:[Oreo·Paleta ×2, Dubai·Paleta ×1]}, {items:[Oreo·Paleta ×1]}]` → `[{Oreo · Paleta, 3}, {Dubai · Paleta, 1}]`.
- **`leerEleccion`:**
  - `null` y `"basura"` → `{}`
  - `'{"3":2,"x":1,"4":-1,"5":1.5,"6":500}'` → `{3: 2}`
- **`recortarEleccion`:**
  - `{1:3, 2:1, 9:2}` con `[{1, "Oreo · Paleta", stock 2}, {2, "Dubai · Paleta", stock 0}]` → elección `{1:2}`, recortes `[{1, pedidas 3, quedan 2}, {2, pedidas 1, quedan 0}]` y `cambio: true` (el 9 se descarta sin aviso)
  - sin cambios → `cambio: false` y la misma referencia
- **`textoRecorte`:** los 3 textos (quedan 2, 1 y 0).
- **`leerDatosCliente`:**
  - JSON válido → el objeto
  - `entrega: "dron"` → `null`
  - `nombre: 5` → `null`
  - nombre de 100 caracteres → recortado a 60
- **`textoStock`:** 0, 1, 3 y 4, con los textos y el `bajo` de F1.
- **`moverEnLista`:** `([1,2,3], 2, "arriba")` → `[2,1,3]`; `(…, 2, "abajo")` → `[1,3,2]`; `(…, 1, "arriba")` → `null`; `(…, 3, "abajo")` → `null`; un id que no está → `null`.
- **`resumenStock`:** `[{0},{5},{0}]` → `{ activos: 3, sinStock: 2 }`.

---

## 6. Diferidos (P2 o partes, y por qué)

- **Aviso sonoro de pedido nuevo (parte de #22):** necesita un interruptor y permiso de audio. Lo visual (título, nav y marca) cubre la necesidad.
- **Paginar pedidos (parte de #26):** solo va el aviso de los 100.
- **`global-error.tsx`:** el layout raíz es mínimo y no lee la base, así que el riesgo es bajo.
- **Imagen OG dinámica con el nombre del local:** `next/og` pesa demasiado para el Worker. Si cambia el nombre, se vuelve a generar `public/og.png` a mano.
- **El resto de los P2 entra** porque es barato o sale solo con el trabajo: #13 en F2 y F5, #14 en F2 y F5, #15 en F5, #28 en F7, #38 en F3, #40 en F3 y F9, #46 en F1.

---

## 7. Riesgos y preguntas para el usuario

**Riesgos:**
- **La redirección de `crearPedido` en el Worker:** Next hace un `fetch` interno a la página destino. Ya pasa lo mismo con `ingresar`, que está probado publicado. La prueba de humo lo verifica con `x-action-redirect`. Si ese fetch fallara, Next igual navega del lado del cliente.
- **Lecturas de D1:** el refresco del admin con la pestaña de fondo (cada 60 s) suma lecturas. Con la pestaña abierta todo el día queda por debajo de 1 M de filas por día; el plan gratis da 5 M.
- **Build sin red:** `next/font/google` baja la fuente en el build. Si se compila sin red, el respaldo es `next/font/local` con el WOFF2 guardado en el repo.

**Preguntas (solo decisiones reales):**
1. **Fuente de títulos:** ¿Fraunces 600 (~30 KB, más carácter) o se queda la fuente del sistema?
2. **Datos del cliente:** ¿"Recordar mis datos en este celular" marcado por defecto? Quedan solo en su navegador.
3. **Textos al cliente:** "Listo para enviar / sale para tu dirección" y "Te escribimos por WhatsApp cuando esté listo" prometen que el local avisa. ¿Está bien así, o se usa algo más neutro?

---

### Archivos clave para implementar
- `C:\Users\NEHU\Documents\$ Development\la-paleteria\app\Pedir.tsx` (y el nuevo `app\HojaPedido.tsx`)
- `C:\Users\NEHU\Documents\$ Development\la-paleteria\app\admin\componentes.tsx` (y el nuevo `app\compartidos.tsx`)
- `C:\Users\NEHU\Documents\$ Development\la-paleteria\app\globals.css`
- `C:\Users\NEHU\Documents\$ Development\la-paleteria\app\acciones.ts` y `app\admin\acciones.ts`
- `C:\Users\NEHU\Documents\$ Development\la-paleteria\scripts\humo.mjs`
