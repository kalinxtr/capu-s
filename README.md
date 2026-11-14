# La Paletería

Pedidos de paletas heladas: una **página pública** con el stock por sabor (sin stock = deshabilitado) y un **admin** con Pedidos y Stock. Copia la lógica de flujo de Lavadito-app.

- **Stack:** Next.js 16 (App Router + Server Actions) en Cloudflare Workers con `@opennextjs/cloudflare`, base **D1** (SQLite) e imágenes en **R2**.
- **Entorno de prueba:** https://la-paleteria.lavadito.workers.dev (admin en `/admin`).
- Notas del proyecto, decisiones y bitácora: `obsidian/` (empezar por `obsidian/Inicio.md`).

## Rutas

| Ruta | Qué es |
|---|---|
| `/` | Lista de stock por sabor + formulario de pedido (una sola pantalla) |
| `/pedido/<token>` | Link privado del cliente para ver su pedido |
| `/admin/pedidos` | Pedidos, con filtros por estado; se refresca cada 30 s |
| `/admin/stock` | Sabores, productos, fotos, stock y datos del local |
| `/img/<clave>` | Fotos de productos servidas desde R2 |

## Desarrollo

```bash
npm install
cp .dev.vars.example .dev.vars   # y poner una clave y un secreto de 32+ caracteres
npm run db:local                 # migraciones en la D1 local
npm run dev                      # next dev (con bindings locales de D1/R2)
npm test                         # pruebas unitarias
npm run typecheck
```

Para probar como corre en Cloudflare: `npm run preview` (compila con OpenNext y levanta `wrangler dev`).

### Prueba de humo

Recorre todo el flujo llamando a las Server Actions como el navegador (pedido, stock simultáneo, cancelar y devolver stock, foto a R2, límite por IP, sesión):

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
- **Archivos dentro de Server Actions se pierden** en el Worker: la foto viaja como data URL (base64), ya achicada en el navegador a 800 px WebP.
- Los bindings se leen con `getCloudflareContext({ async: true })` (ver `lib/cloudflare.ts`).
