---
tipo: bitacora
actualizado: 2026-11-16
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

## Sesión 3: 2026-11-16
- Pedido 6: entorno local en una máquina nueva (Windows 11, Node 24.21, npm 11.19).
  - Ya estaban `node_modules` (coincide con `package.json`) y un `.env` con los secretos. Se copió a `.dev.vars`, que es el que usa wrangler según el README. El `.env` se dejó como estaba.
  - La D1 local no tenía migraciones: se corrió `npm run db:local` (0000 y 0001). Hay un `next dev` que ya estaba corriendo de antes y tiraba `no such table: sabores`; con las migraciones ya no da error.
  - El typecheck fallaba porque falta `cloudflare-env.d.ts` (está en `.gitignore`): se generó con `npm run cf-typegen` y se agregó ese paso al README.
  - Verificado: `npm test` 12/12, `npm run typecheck` sin errores, prueba de humo 25/25 en `wrangler dev` local, y `next dev` sirviendo `/` (catálogo vacío) y `/admin` (manda a ingresar).
  - La prueba de humo dejó en la D1 **local** un producto "Prueba …" archivado y pedidos de "Cliente Prueba". Es solo local; no se borraron.
