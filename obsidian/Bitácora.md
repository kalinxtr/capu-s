---
tipo: bitacora
actualizado: 2026-11-19
---

# Bitácora

## Sesión 1: 2026-11-13
- Se leyó Lavadito-app: vault, brief, decisiones, `worker/routes/publico.ts` (reserva pública) y la estructura del admin.
- Se armó este vault con la misma estructura que el de Lavadito.
- Se escribió [[Mapeo desde Lavadito]].
- Sin código (pedido 1: "No code").
- Pedido 2: "encargo" = pedido, sin horarios. Se escribió [[Stack]] con dos enfoques y el riesgo del límite de tamaño de Workers gratis (3 MiB comprimido, según la doc de OpenNext).
- Pedido 3: prueba descartable de A. Next 16 + OpenNext + D1 publicada en `paleteria-spike.lavadito.workers.dev`. Pesa 1,03 MiB comprimido; el stock no se sobrevende con 6 pedidos simultáneos; R2 funciona en local pero no está activado en la cuenta; CPU de 9 a 35 ms por request. `cacheComponents` cuelga el Worker. Detalle en [[Stack]].
- Pedido 4: se escribió [[Diseño]] y se construyó la v1 completa.
  - Proyecto Next.js 16.4.6 + `@opennextjs/cloudflare` 1.20.17 en la raíz del repo. Recursos de Cloudflare: Worker `la-paleteria`, D1 `la-paleteria` (región ENAM), R2 `la-paleteria-imagenes`, rate limiters `LIMITE_PEDIDOS` (5/min) y `LIMITE_INGRESO` (10/min).
  - Público: `app/page.tsx` + `app/Pedir.tsx` (lista por sabor, contador, barra fija, formulario en hoja, confirmación) y `app/acciones.ts` (`crearPedido`). Link del cliente: `app/pedido/[token]`. Fotos: `app/img/[...clave]/route.ts`.
  - Admin: `app/admin/acciones.ts` (todas verifican sesión adentro), `app/admin/(panel)/pedidos` y `.../stock`, ingreso en `app/admin/ingresar`.
  - Lógica pura en `lib/` con 12 pruebas unitarias (`tests/logica.test.ts`). Prueba de humo de 25 pasos en `scripts/humo.mjs`: **en verde en local y publicada**.
  - Problema encontrado: la foto como archivo no llegaba a la Server Action dentro del Worker → se manda en base64. Ver [[Stack]].
  - Publicado en https://la-paleteria.lavadito.workers.dev. Secretos cargados (clave de prueba = la de `.dev.vars`). Se borraron los datos que dejó la prueba de humo: la base quedó con los 6 sabores, sin productos ni pedidos.
  - No se probó a mano en un navegador (la extensión de Chrome no estaba conectada); se vio la página pública con capturas de Edge sin ventana.

## Sesión 2: 2026-11-14
- Pedido 5: revisión UX/UI de todo el frontend → [[Reporte UX-UI]] (46 hallazgos, P0/P1/P2). Un agente armó [[Plan UX-UI]] (10 fases). El usuario eligió Fraunces, "recordar datos" marcado y los textos propuestos.
- Git: commit de la v1 en `main` y rama `ux-ui` con commits por fase.
- Lógica pura nueva en `lib/` (`mensajes.ts`, `eleccion.ts`, `stock.ts`, más funciones en `formato.ts` y `pedido.ts`) con 28 pruebas nuevas: 40 en total.
- Público: hoja del pedido como `<dialog>` nativo (`app/HojaPedido.tsx`), errores que enfocan el campo, elección guardada y recortes avisados, datos del cliente recordados, barra de sabores que marca el sabor visible, "¡Últimas N!", agotado legible, encabezado con logo y Fraunces.
- `crearPedido` redirige a `/pedido/<token>?nuevo=1`: confirmación con URL estable, línea de pasos, refresco, WhatsApp al local, "Compartir/Copiar link", 404 propio.
- Admin: avisos flotantes con "Deshacer", sección activa y cuenta de nuevos, "(N) Pedidos" en la pestaña, marca de nuevos, "hace N min", teléfono con `tel:`, dirección a Maps, mensajes de WhatsApp por estado, resumen "Para preparar". Stock optimista por delta, guardar al salir del campo, "Guardar" solo si hay cambios, ↑/↓, archivar en dos toques, resumen arriba.
- Tokens de color con contraste AA en claro y oscuro, escala de tipo y espacios, movimiento reducido. `error.tsx`, `not-found.tsx`, `loading.tsx` del admin, íconos e imagen para compartir en `public/` (generados con Edge sin ventana).
- Problemas encontrados y resueltos:
  - React 19 vacía los formularios con `action` al terminar: un error del servidor borraba lo escrito. Ahora se envían a mano.
  - Si la fila desaparecía (archivar, pedido que cambia de lista), el aviso se perdía. Los formularios del admin llaman a la acción directo y el aviso lo muestra el layout.
  - Dos toques rápidos en "+" de la lista pública sumaban 1. Arreglado.
  - En el celular la fila de Stock quedaba apilada. Arreglado con filas propias para stock y menú.
  - Quedaban `wrangler dev` de la sesión 1 en el puerto 8787 que se recargaban con cada build y colgaban la prueba de humo. No se cerraron (no eran de esta sesión): se probó en el 8788.
- Verificación: 40 pruebas, typecheck, prueba de humo de 29 pasos en verde, Worker de 1,14 MiB comprimido. Recorrido en Edge sin ventana (público, confirmación, 404, ingreso, pedidos, stock; claro y oscuro; 390 y 1100 px), sin errores en consola.
- Datos de prueba solo en la D1 **local** (productos de ejemplo y pedidos de "Cliente Prueba"/"Ana Prueba"). Nada se publicó.

## Sesión 3: 2026-11-16
- Pedido 6: entorno local en una máquina nueva (Windows 11, Node 24.21, npm 11.19).
  - Ya estaban `node_modules` (coincide con `package.json`) y un `.env` con los secretos. Se copió a `.dev.vars`, que es el que usa wrangler según el README. El `.env` se dejó como estaba.
  - La D1 local no tenía migraciones: se corrió `npm run db:local` (0000 y 0001). Hay un `next dev` que ya estaba corriendo de antes y tiraba `no such table: sabores`; con las migraciones ya no da error.
  - El typecheck fallaba porque falta `cloudflare-env.d.ts` (está en `.gitignore`): se generó con `npm run cf-typegen` y se agregó ese paso al README.
  - Verificado: `npm test` 12/12, `npm run typecheck` sin errores, prueba de humo 25/25 en `wrangler dev` local, y `next dev` sirviendo `/` (catálogo vacío) y `/admin` (manda a ingresar).
  - La prueba de humo dejó en la D1 **local** un producto "Prueba …" archivado y pedidos de "Cliente Prueba". Es solo local; no se borraron.
- Pedido 7: auditoría de arquitectura frontend con las skills de ECC `frontend-patterns` y `react-patterns` → [[Auditoría arquitectura frontend]] (7 hallazgos). Plan en [[Plan arquitectura frontend]] (6 tareas), escrito y ejecutado sobre la rama `ux-ui` (el usuario commiteó la sesión 3 en `main` y pasó a `ux-ui`).
  - **Sesión vencida:** `exigirSesion()` redirige a `/admin/ingresar` en vez de tirar. Antes, una acción del admin sin sesión daba 500 y el `error.tsx` del admin tapaba la página. `haySesion()` se memoriza por request.
  - **`useAccion()`** (`app/admin/_componentes/useAccion.ts`): única forma de llamar acciones desde el admin. Un error inesperado (sin red) muestra "No se pudo guardar…" en línea y no tira la página. Lo usan `FormAccion`, `BotonEstado`, `ControlStock` y `FotoProducto` (que dejó `useActionState` y su efecto).
  - `app/admin/componentes.tsx` (489 líneas) se partió por tema en `app/admin/_componentes/` (avisos, formularios, nav, pedidos, stock, foto, ingreso).
  - **Fotos a 320 px** de lado mayor (antes 800; se muestran a 76 px). `lib/foto.ts` con `medidaAchicada` y `leerFotoDataUrl`.
  - `Pedir.tsx`: la elección y el sabor visible pasaron a `app/useEleccion.ts` y `app/useSaborVisible.ts`; "hoja abierta" se deriva en vez de sincronizarse con un efecto.
  - Validación del admin pura y con pruebas en `lib/entradas.ts`.
  - README: paso `cf-typegen` (traído de `main`) y prueba de humo de 30 pasos. [[Decisiones]]: fotos a 320 px.
  - Para que el merge a `main` no tenga conflictos, se trajeron textuales a `ux-ui` las notas de la sesión 3 de `main` (pedido 6), en el mismo orden.
  - Verificación: 50 pruebas (10 nuevas), typecheck, prueba de humo 30/30 (el paso nuevo falló contra el código viejo con 500 y pasó después) y recorrido en Chrome contra `wrangler dev` local: crear productos, "+" dos veces rápido = +2, red cortada → error en línea sin tirar la página, foto de 1200×900 → 320×240 WebP, quitar foto, elección que sobrevive a la recarga, agotarse con la hoja abierta (se cierra y no se reabre), pedido #7 con confirmación, Preparado → Entregado → Deshacer, y sesión cerrada en otra pestaña → "+" manda a ingresar. Sin errores en consola.
  - Datos de prueba solo en la D1 **local**: "Paleta Prueba A/B/C" en Oreo, pedido #7 de "Cliente Prueba" y lo que deja la prueba de humo.
  - El `wrangler dev` de esta sesión (puerto 8790) se cerró al terminar. Sigue corriendo uno viejo en el 8787 que no es de esta sesión.
- Pedido 8: merge de `ux-ui` en `main`. Antes, commit de lo del pedido 7 en `ux-ui` (`9ab36eb`); el usuario eligió eso en vez de dejarlo afuera. Hubo conflictos solo en `Bitácora.md` y `Pedidos del usuario.md` (las dos ramas agregaban una sesión en el mismo lugar): se resolvieron con la versión de `ux-ui`, que ya tenía textual lo de `main`. Merge `f664212`. El árbol quedó igual a `ux-ui` salvo `package-lock.json`, que trae el cambio de `main`. Verificado en `main`: 50 pruebas y typecheck. No se hizo push: `main` está 13 commits adelante de `origin/main`.
- Pedido 9: preparar la subida a producción en el dominio actual (`la-paleteria.lavadito.workers.dev`).
  - Menor arreglado: `leerFotoDataUrl` (`lib/foto.ts`) devuelve null si el base64 tiene largo o relleno inválido (antes `atob` tiraba y la acción terminaba en "No se pudo guardar…"); ahora sale "Elegí una foto (JPG, PNG o WebP)". Prueba nueva en `tests/foto.test.ts` (falló antes del arreglo).
  - Menor revisado: ninguna acción llama a `haySesion()` antes de `iniciarSesion()`/`cerrarSesion()`. Queda solo la nota en `lib/sesion.ts`.
  - Verificado: 51 pruebas, typecheck, `opennextjs-cloudflare build` y prueba de humo 30/30 en `wrangler dev` local (puerto 8791, cerrado al terminar).
  - Wrangler no tiene sesión en esta máquina (no hay `CLOUDFLARE_API_TOKEN` ni login): el deploy espera `npx wrangler login`.

## Sesión 4: 2026-11-19 (nace La Pizzería)
- Pedido 10: copia de La Paletería para un emprendimiento de pizzas, con la misma lógica. Todo lo de arriba de esta sesión es la historia de La Paletería, que se hereda.
- Copia con la historia de git (fork local), en `$Dev/la-pizzeria`. Remoto `upstream` = repo de La Paletería, para traer arreglos del sistema.
- Se trajo también el arreglo de `leerFotoDataUrl` (`lib/foto.ts` + prueba) que en La Paletería estaba sin commitear.
- Cambios (solo marca y datos, la lógica es la misma):
  - Nombre "La Pizzería" (layout, página, `lib/datos.ts`, ajustes iniciales, prueba de humo); textos "paleta/s" → "pizza/s"; claves de navegador `pizzeria:*`.
  - Sabores iniciales: Muzzarella, Napolitana, Fugazzeta, Calabresa, Jamón y morrones, Cuatro quesos (`migrations/0001_datos_iniciales.sql`; cambiados en el pedido 12). Producto de ejemplo: "Grande".
  - Logo `app/LogoPizza.tsx` (porción con pepperoni) y `public/icon.svg`; `og.png`, `apple-touch-icon.png` y `favicon.ico` regenerados con Edge sin ventana.
  - Color de acento: tomate (`#c0351b` claro, `#ff8a5c` oscuro), contrastes AA verificados (4,73 a 8,28).
  - `wrangler.jsonc`: Worker/D1 `la-pizzeria`, R2 `la-pizzeria-imagenes`, `database_id` de relleno (ceros), rate limiters 2101/2102 para no compartir contadores con La Paletería.
  - `.dev.vars` local con clave y secreto nuevos (no van al repo).
- Verificación: 51 pruebas, typecheck, build de OpenNext y prueba de humo de 30 pasos en verde contra `wrangler dev` local.
- Nada creado en Cloudflare: falta D1, R2, secretos y deploy (ver [[Pendientes]]).
- Pedido 11: levantada en local con `npm run dev -- --port 3010` (D1 local reiniciada y 7 productos de ejemplo cargados a mano, no van en las migraciones). Hubo que matar un `wrangler dev` de la prueba de humo que había quedado colgado y tenía tomada la D1 local.
- Pedido 12: sabores iniciales reducidos a **Muzza, Pepperoni, Fugazzeta y Roquefort**. Cambiado en `migrations/0001_datos_iniciales.sql` (sin publicar todavía, así que se editó la migración en vez de agregar una nueva) y en la D1 local (renombrados; los dos sobrantes y sus productos de ejemplo se borraron, no había pedidos).
- Pedido 13: el push fallaba porque `origin` era la carpeta local `la-paleteria` (main con checkout ahí → rechazado). Con autorización del usuario: `origin` = https://github.com/kalinxtr/capu-s.git y push de `main` (commits del usuario `f167f89` y `b6dce68`). No se agregó `upstream` (el usuario lo había apuntado también a `capu-s`).
- Pedidos 14 y 15: el primer `wrangler login` entró con otra cuenta de Cloudflare (sin la D1 de La Paletería y sin R2 activado). Se hizo logout y login de nuevo (el primer reintento venció); quedó la cuenta correcta, la de `lavadito.workers.dev`.
- Pedido 16, publicada:
  - D1 `la-pizzeria` (`2d169f43-…`, región ENAM) y R2 `la-pizzeria-imagenes` creados; `database_id` real en `wrangler.jsonc`; migraciones remotas aplicadas (4 sabores).
  - `npm run deploy`: Worker de 1,15 MiB comprimido en https://la-pizzeria.lavadito.workers.dev.
  - Secretos `ADMIN_CLAVE` (nueva, distinta de la local) y `SESION_SECRETO` con `wrangler secret bulk`.
  - Prueba de humo de 30 pasos contra lo publicado: en verde (se corrió dos veces por error). Después se borraron sus datos: 2 pedidos de prueba con sus ítems, 2 productos "Prueba", sus 2 fotos en R2, el contador de pedidos (el primero real será el #1) y el WhatsApp/retiro falsos de los ajustes.
  - Verificado: `/` 200, `/admin/ingresar` 200, `/no-existe` 404, `og.png` e `icon.svg` 200.
  - Como cambió el `database_id`, la D1 local también es otra: se le aplicaron las migraciones y los 5 productos de ejemplo, así `npm run dev` sigue igual al reiniciarse.
