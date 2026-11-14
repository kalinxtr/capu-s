---
tipo: diseño
actualizado: 2026-11-14
---

# Diseño v1

Base: [[Brief original]], [[Decisiones]], [[Stack]]. El usuario pidió avanzar sin más preguntas (pedido 4); lo marcado *(propuesta)* es criterio propio, corregible.

## Por qué
Un negocio de paletas heladas recibe pedidos por un link (Instagram/WhatsApp). Quiere que el cliente vea **qué hay en stock** y pida rápido, y que el pedido **entre solo al dashboard**. Efectividad, no tienda.

## Objetivos
- Página pública: una lista scrollable por sabor, con stock visible; sin stock = deshabilitado.
- Pedido en una pantalla: cantidades → datos → confirmar. Sin carrito aparte, sin pasos.
- Admin con dos secciones: **Pedidos** y **Stock**.
- El stock se descuenta al crear el pedido, sin vender dos veces lo último.

## No objetivos
- Pagos online, comprobantes, imágenes en pedidos (pedido 4).
- Horarios, fechas, turnos (pedido 2).
- Caja, contador, cuentas múltiples (lo de Lavadito que no se copia).

## Anti-objetivos (fallaría aunque funcione)
- Que parezca un e-commerce lento con carrito, checkout y registro.
- Que un pedido deje el stock negativo o descuente a medias.

## Stack (pedido 3)
Next.js 16 + Server Actions en Cloudflare Workers (OpenNext), D1 (SQLite) con Drizzle, imágenes de productos en R2. Sin `cacheComponents` (cuelga el Worker, ver [[Stack]]).

## Datos
- `sabores`: id, nombre, orden, activo. Iniciales: Oreo, Chocotorta, Serenito, Mousse de limón, Rasta, Dubai.
- `productos`: id, sabor_id, nombre, precio (pesos enteros), stock (`CHECK stock >= 0`), imagen (clave en R2), orden, activo.
- `pedidos`: id (número visible), token (link del cliente), cliente_nombre, cliente_telefono, entrega (`retiro`|`envio`), direccion, nota, total, estado, creado, actualizado.
- `pedido_items`: pedido_id, producto_id, nombre (snapshot "Sabor · Producto"), precio (snapshot), cantidad.
- `ajustes` (una fila): nombre del local, WhatsApp del local, texto de retiro (dirección/indicaciones).
- **Nada se borra**: sabores y productos se archivan (como Lavadito); los pedidos se cancelan.

## Página pública (`/`)
- Encabezado con el nombre del local.
- Una sección por sabor (en su orden), cada producto con foto, nombre, precio, "quedan N" y un contador − n +. Sin stock: gris y sin contador.
- Barra fija abajo: "N paletas · $ total · Pedir". Abre el formulario en la misma pantalla.
- Datos: nombre (obligatorio), teléfono/WhatsApp (obligatorio) *(propuesta: hace falta para coordinar)*, Retiro / Envío, dirección (solo si es envío) *(propuesta)*, nota opcional.
- Al confirmar: pantalla con número de pedido, resumen y botón "Avisar por WhatsApp" al local con el pedido escrito *(propuesta)*. Link propio `/pedido/<token>` para ver el estado.
- Si algo se agotó mientras elegía: error claro y la lista se refresca.
- Anti-abuso: límite de pedidos por IP con el rate limiter de Workers *(propuesta; Turnstile queda pendiente)*.

## Admin (`/admin`)
- Ingreso con **una clave** (secreto `ADMIN_CLAVE`), cookie firmada de 30 días, como Lavadito *(propuesta: un solo usuario)*.
- **Pedidos**: los más nuevos arriba, filtro por estado. Estados: `nuevo` → `preparado` → `entregado`, o `cancelado` *(propuesta)*. Cancelar **devuelve el stock**. Cada pedido muestra cliente, entrega, dirección, ítems, total y botón WhatsApp al cliente. Se refresca solo cada 30 s.
- **Stock**: sabores (crear, renombrar, ordenar, archivar) y productos (crear, editar precio/nombre/foto, archivar) con **+/−** rápido de stock y campo para fijarlo. Abajo, los datos del local.
- Fotos: se achican en el navegador antes de subir (máx. 800 px, WebP) y se sirven desde `/img/<clave>` con caché larga.

## Reglas del servidor
- Toda Server Action valida sus datos; las del admin verifican la sesión adentro (las acciones se pueden llamar por POST directo).
- Crear pedido: lee precios del servidor (nunca del cliente), arma un `batch` de D1 con el alta del pedido, los ítems y los descuentos de stock; el `CHECK` hace fallar todo si algo se agotó.
- Montos en pesos enteros, formato es-AR. Fechas en UTC, se muestran en hora argentina.

## Entornos
- Prueba: Worker `la-paleteria` en `la-paleteria.lavadito.workers.dev`, D1 `la-paleteria`, R2 `la-paleteria-imagenes`.

## Estilo (pedido 5)
Tokens, colores con su contraste, tipografía y espacios: [[Plan UX-UI]] §3. Resumen: fondo crema, tinta chocolate, acento frambuesa `#c2255c` (`#f06595` en oscuro); estados como chips de fondo suave; títulos en Fraunces 600, texto en la fuente del sistema; toques de 44 px; todo en `app/globals.css`, sin librerías.
