---
tipo: diseño
actualizado: 2026-11-13
---

# Stack

**Elegido: A** (pedido 3). Prueba descartable hecha el 2026-11-13: ver "Resultado de la prueba" abajo.

Pedido 2: Server Actions, hosting en Cloudflare, base chica en tier gratis, imágenes de productos y pedidos.

## A. Todo en Cloudflare (recomendado)
- **Next.js (App Router) + Server Actions**, desplegado en **Cloudflare Workers** con el adaptador **OpenNext** (`@opennextjs/cloudflare`).
- **Base: Cloudflare D1** (SQLite). Gratis: 5 GB, 5M filas leídas y 100k escritas por día. Se accede por binding, sin cadena de conexión ni Hyperdrive.
- **Imágenes: Cloudflare R2.** Gratis: 10 GB, sin costo de salida. En la base solo va la clave del archivo.
- **ORM:** Drizzle (como Lavadito).
- **Stock sin vender dos veces:** `CHECK (stock >= 0)` + descuento y alta del pedido en un mismo `batch` de D1 (atómico): si una paleta se agota, falla todo el pedido.
- Contra: D1 no tiene transacciones interactivas (se resuelve con el batch de arriba).

## B. Next.js en Cloudflare + Postgres en Neon (lo que usa Lavadito)
- Igual que A, pero con **Neon Postgres** vía **Hyperdrive** (Lavadito migró de D1 a Neon en sus pedidos 9 a 11).
- Gratis: 0,5 GB por proyecto, la base se suspende sola si no hay uso (primer request más lento).
- A favor: transacciones reales, mismo conocimiento que Lavadito. En contra: dos proveedores, una pieza más (Hyperdrive).

## Descartado
- Imágenes dentro de la base: infla la base y D1 limita filas a 2 MB.
- Supabase: pausa el proyecto tras días sin uso (mismo motivo que en Lavadito).
- Vercel Hobby: solo uso no comercial, y el usuario quiere Cloudflare.

## Riesgo a verificar (vale para A y B)
- **Plan gratis de Workers:** el Worker no puede pesar más de **3 MiB comprimido**, y la CPU por request es chica (10 ms). Next.js con OpenNext puede quedar justo. Conviene una **prueba descartable** (desplegar un Next mínimo con una Server Action y D1) antes de comprometerse.
- Plan B si no entra: el Workers Paid (USD 5/mes, 10 MiB) o cambiar Next.js por React Router v7 (tiene `action`s, pesa menos).

## Resultado de la prueba (2026-11-13, pedido 3)
App descartable en el scratchpad de la sesión, publicada en https://paleteria-spike.lavadito.workers.dev con una base D1 `paleteria-spike` (las dos se pueden borrar).
Versiones: Next.js 16.4.6, React 19.3, @opennextjs/cloudflare 1.20.17, wrangler 4.162.

| Qué | Resultado |
|---|---|
| Tamaño del Worker | **1,03 MiB comprimido** (límite gratis: 3 MiB). Queda margen para el admin. |
| Server Action que crea pedido + descuenta stock (batch de D1 con `CHECK (stock >= 0)`) | Funciona publicado. Pedido normal: OK. Producto agotado: rechazado. |
| 6 pedidos simultáneos de un producto con stock 3 | **Entran exactamente 3**; los rechazados no dejan filas sueltas (el batch es atómico). |
| Subir imagen a R2 desde una Server Action | Funciona **en local**. No se pudo publicar: **R2 no está activado en la cuenta** de Cloudflare (error 10042). |
| Tiempo de respuesta publicado | Página: 0,4 a 1,3 s. Acción de pedido: 0,4 a 0,9 s. |
| **CPU por request** | Página: **9 a 29 ms**; acciones: 8 a 35 ms. Las 20 dieron OK, pero el plan gratis de Workers documenta **10 ms**. |

### Trampas encontradas
- **`cacheComponents: true`** (viene activado por defecto en `create-next-app` de Next 16) **cuelga el Worker** con OpenNext 1.20.17 ("Worker's code had hung"). Hay que apagarlo (también `partialPrefetching`).
- Para leer bindings: `getCloudflareContext({ async: true })` de `@opennextjs/cloudflare`.
- La base D1 se creó en la región ENAM (este de EE. UU.); no hay región en Sudamérica.

- **Archivos binarios dentro de una Server Action se pierden** en el Worker (llamada con `Next-Action`: el campo del archivo ni aparece en el FormData). Se resolvió mandando la foto como data URL en base64 (pedido 4).

### Qué queda por decidir (resuelto en el pedido 4: R2 activado, riesgo de CPU aceptado)
- **Activar R2** en el panel de Cloudflare (lo tiene que hacer el usuario; Cloudflare suele pedir un medio de pago aunque se use el tier gratis).
- **CPU**: con tráfico chico probablemente alcance, pero estamos por encima de los 10 ms documentados. Si aparecen errores 1102, la salida es Workers Paid (USD 5/mes).
