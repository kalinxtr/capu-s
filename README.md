# La Paletería

Pedidos de paletas heladas: una **página pública** con el stock por sabor (sin stock = deshabilitado) y un **admin** con Pedidos y Stock. Copia la lógica de flujo de Lavadito-app.

- **Stack:** Next.js 16 (App Router + Server Actions) en Cloudflare Workers con `@opennextjs/cloudflare`, base **D1** (SQLite) e imágenes en **R2**.
- **Entorno de prueba:** https://la-paleteria.lavadito.workers.dev (admin en `/admin`).
- Notas del proyecto, decisiones y bitácora: `obsidian/` (empezar por `obsidian/Inicio.md`).

## Rutas

| Ruta | Qué es |
|---|---|
| `/` | Lista de stock por sabor + formulario de pedido (una sola pantalla) |
| `/pedido/<token>` | Link privado del cliente: confirmación al pedir (`?nuevo=1`) y estado del pedido, con línea de pasos |
| `/admin/pedidos` | Pedidos, con filtros por estado; se refresca cada 30 s |
| `/admin/stock` | Sabores, productos, fotos, stock (optimista) y datos del local; orden con ↑/↓ |
| `/img/<clave>` | Fotos de productos servidas desde R2 |

## Desarrollo

```bash
npm install
npm run cf-typegen               # genera cloudflare-env.d.ts (no está en el repo; sin él falla el typecheck)
cp .dev.vars.example .dev.vars   # y poner una clave y un secreto de 32+ caracteres
npm run db:local                 # migraciones en la D1 local
npm run dev                      # next dev (con bindings locales de D1/R2)
npm test                         # pruebas unitarias
npm run typecheck
```

Para probar como corre en Cloudflare: `npm run preview` (compila con OpenNext y levanta `wrangler dev`).

### Prueba de humo

Recorre todo el flujo llamando a las Server Actions como el navegador (pedido y su redirección al link, 404 propio, stock simultáneo, cancelar y devolver stock, orden de sabores, foto a R2, límite por IP, sesión, que una acción sin sesión mande a ingresar). Son 30 pasos:

```bash
npx opennextjs-cloudflare build
npx wrangler dev --port 8787            # en otra terminal
node scripts/humo.mjs http://localhost:8787 <clave-admin>
```

Crea un producto "Prueba …" en el sabor 1 y pedidos de "Cliente Prueba". Contra el entorno publicado, borrarlos después.

## Deploy

```bash
npm run db:remota     # migraciones en la D1 de Cloudflare
npm run deploy        # compila y publica el Worker
```

Secretos (una vez por entorno):

```bash
npx wrangler secret put ADMIN_CLAVE      # clave del admin (cambiarla corta todas las sesiones)
npx wrangler secret put SESION_SECRETO   # 32+ caracteres al azar
```

## Trampas conocidas

- **No activar `cacheComponents`** en `next.config.ts`: con OpenNext 1.20 cuelga el Worker.
- **Archivos dentro de Server Actions se pierden** en el Worker: la foto viaja como data URL (base64), ya achicada en el navegador a 320 px WebP (lado mayor).
- Los bindings se leen con `getCloudflareContext({ async: true })` (ver `lib/cloudflare.ts`).
- **No leer D1 en `app/layout.tsx` ni en `app/not-found.tsx`**: Next los prerenderiza en el build, donde no hay bindings.
- **Sin `loading.tsx` en `app/` ni en `app/pedido/`**: haría que el `notFound()` de un link inválido responda 200 en vez de 404. Solo hay uno en `app/admin/(panel)/`.
- **Íconos e imagen para compartir van en `public/`**, no como archivos de convención en `app/` (Next los mete en base64 dentro del Worker). Si cambia el nombre del local, regenerar `public/og.png`.
- **`crearPedido` redirige**: con JS la respuesta trae el header `x-action-redirect` (no un 303). La prueba de humo lo lee de ahí.
- **Formularios**: se envían a mano (no con `action` sola), porque React 19 los vacía al terminar y un error del servidor borraba lo escrito. Los del admin llaman a la acción directo, así el aviso sale aunque la fila desaparezca.
- **`wrangler dev` viejos**: si quedó uno corriendo en el mismo puerto, se recarga solo con cada build y la prueba de humo se cuelga. Usar otro puerto o cerrarlo.
