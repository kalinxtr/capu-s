---
tipo: decisiones
actualizado: 2026-11-19
---

# Decisiones y reglas de negocio

## Confirmadas por el usuario (pedido 1)
- **Se copia la lógica de flujo de Lavadito**: página pública sin login + admin con login.
- **La página pública no es una tienda**: es un **listado de stock**, una lista scrollable sencilla, separada por sabor. Se busca efectividad.
- **Solo se pide lo que hay en stock** en el momento del pedido. Sin stock → el producto se muestra **deshabilitado** (visible, no oculto).
- **Sabores = categorías**, totalmente editables desde el admin. Iniciales: Oreo, Chocotorta, Serenito, Mousse de limón, Rasta, Dubai.
- **Un pedido registra:** nombre del cliente, forma de retiro (envío o retiro en el local), monto de la compra y sus productos.
- **Admin con dos secciones:** Pedidos y Stock (desde Stock se cargan los productos).

## Confirmadas por el usuario (pedido 2)
- **"Encargo" y "pedido" son lo mismo**: llega un pedido desde la página pública y entra al dashboard. **No hay horarios ni fechas** en esta app.
- **Sin backend aparte**: la lógica del servidor va en **Server Actions** (Next.js).
- **Hosting en Cloudflare**, con una base en un **tier gratis decente**, chica.
- La app tiene que guardar **imágenes de productos y de pedidos**.

## Confirmadas por el usuario (pedido 3)
- **Stack A**: Next.js + Server Actions en Cloudflare Workers (OpenNext) + D1 + R2. Ver [[Stack]].

## Confirmadas por el usuario (pedido 4)
- **El pedido no lleva imagen ni comprobante**: "simplemente se emite la informacion". Las imágenes son solo de productos.
- **Se acepta el riesgo de CPU** del plan gratis de Workers.

## Tomadas en la construcción (pedido 4, razonables, corregibles)
- **Datos del pedido:** nombre, **teléfono/WhatsApp obligatorio** (para coordinar), retiro o envío, **dirección solo si es envío**, nota opcional. El usuario pidió nombre, forma de retiro, monto y productos; teléfono y dirección se agregaron porque sin eso no se puede entregar.
- **Estados del pedido:** `nuevo` → `preparado` → `entregado`, o `cancelado`. Se puede volver un paso atrás. **Cancelar solo desde nuevo o preparado, y devuelve el stock** (en el mismo batch; dos clics no lo devuelven dos veces). Un cancelado no se reabre.
- **El stock se descuenta al crear el pedido** (no al entregarlo).
- **Admin con una sola clave** (secreto `ADMIN_CLAVE`), cookie firmada de **30 días fijos**, como Lavadito. Cambiar la clave corta todas las sesiones.
- **Nada se borra:** sabores y productos se archivan (y se reactivan desde "Archivados" en Stock).
- **Datos del local** (nombre, WhatsApp, indicaciones de retiro) van abajo de todo en Stock, no en una sección aparte (el usuario pidió solo Pedidos y Stock).
- **Confirmación:** número de pedido, resumen, botón "Avisar por WhatsApp" al local (si cargó su número) y link privado `/pedido/<token>`.
- **Anti-abuso:** 5 pedidos por minuto por IP y 10 intentos de ingreso por minuto por IP (rate limiter de Workers). Sin Turnstile por ahora.
- **Fotos:** el navegador las achica a 320 px WebP de lado mayor (se muestran a 76 px; antes eran 800, pedido 7); viajan como data URL (base64) dentro de la Server Action, porque en el Worker los archivos binarios se pierden. Tope 700 KB. Se sirven desde `/img/<clave>` con caché de un año (la clave cambia si cambia la foto).
- **Sin Drizzle:** SQL directo sobre D1 y migraciones escritas a mano en `migrations/`. Son pocas consultas y así el Worker pesa menos.
- `cacheComponents` apagado: cuelga el Worker con OpenNext (ver [[Stack]]).
- Stock: `CHECK (stock >= 0)` y alta del pedido + descuento en un mismo batch de D1. Probado con pedidos simultáneos.
- Precios: siempre se leen de la base al crear el pedido; nombre y precio se copian en cada ítem.
- Montos en pesos enteros; fechas en milisegundos UTC, mostradas en hora argentina.

## Confirmadas por el usuario (pedido 5, mejoras UX/UI)
- **Fuente de títulos: Fraunces 600** (con `next/font`, se sirve como archivo estático). El texto sigue con la fuente del sistema.
- **"Recordar mis datos en este celular" viene marcado**: nombre, teléfono, entrega y dirección quedan solo en el navegador del cliente.
- **Textos al cliente**: "Te escribimos por WhatsApp cuando esté listo" y "Listo para retirar / enviar" (asumen que el local le escribe).

## Tomadas en el pedido 5 (corregibles)
- **La confirmación vive en `/pedido/<token>?nuevo=1`**: `crearPedido` redirige ahí. La URL no se pierde al recargar. Ese link muestra pasos (Recibido → Listo → Entregado) y se refresca cada 45 s.
- **Stock en el admin optimista y por diferencia**: los +/− se ven al instante y viajan como delta (si entra un pedido al mismo tiempo, no se pisa). El campo se guarda al salir de él.
- **Orden de sabores y productos con botones ↑/↓** (ya no con un número a mano).
- **La elección del cliente** sobrevive a una recarga (sessionStorage); si el stock bajó, se recorta y se avisa qué cambió.
- **Archivar y quitar foto piden un segundo toque**, como Cancelar.
- **Mensajes de WhatsApp al cliente según el estado** del pedido (recibido, listo, entregado, cancelado).
- **Pedidos nuevos**: número en la pestaña "(2) Pedidos" y en la barra; las tarjetas nuevas desde la última visita se marcan. Sin sonido.
- **Avisos flotantes** que se van solos; al marcar Preparado/Entregado traen "Deshacer".

## La Pizzería (pedido 10)
- **Misma sistemática que La Paletería**: todas las reglas de arriba valen igual; donde dicen "paleta", acá es "pizza".
- **Tomadas en la copia (corregibles):** nombre "La Pizzería"; color de acento tomate; logo de una porción con pepperoni.

- **Sabores (categorías) iniciales: Muzza, Pepperoni, Fugazzeta y Roquefort** (pedido 12, confirmado por el usuario).

## Abiertas (ver [[Pendientes]])
- Clave definitiva del admin.
- Nombre definitivo del negocio.
