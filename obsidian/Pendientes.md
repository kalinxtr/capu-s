---
tipo: pendientes
actualizado: 2026-11-26
---

# Pendientes

## 1. Copia de La Paletería: HECHA (pedido 10)
Ver [[Bitácora]] → sesión 4.

## 2. Lo que falta (del usuario)
- [x] Nombre del negocio: **Capu's** (pedido 17). Publicado el 2026-11-23 (migración 0002 en la D1 remota + deploy).
- [x] Sabores iniciales: Muzza, Pepperoni, Fugazzeta y Roquefort (pedido 12).
- [x] Publicada en Cloudflare (pedido 16): https://la-pizzeria.lavadito.workers.dev.
- [ ] **Cambiar la clave del admin** si se quiere una propia: `! npx wrangler secret put ADMIN_CLAVE` (corta las sesiones abiertas). La actual se le pasó al usuario en la conversación.
- [ ] Cargar productos, precios, stock y fotos, y el WhatsApp del local.
- [ ] Probarla en el celular.
- [x] Fondo con logos de Capu's en la página de pedidos (pedidos 19 y 20), con capa oscura y tema oscuro fijo. Publicado el 2026-11-23 (pedido 22).
- [ ] Decidir si la confirmación (`/pedido/<token>`) también lleva el fondo: hoy vuelve al tema crema.
- [ ] Íconos (favicon, `icon.svg`, `apple-touch-icon.png`): siguen con la porción de pizza. Si se quiere, armar uno con el gorro de chef o la "C" del logo (el logo entero no se lee tan chico).
- [x] Fondo y logo publicados el 2026-11-23 (pedido 22, versión `33044aa9`). WhatsApp guarda en caché la vista previa de los links ya compartidos, así que la `og.png` nueva puede tardar en verse.

## 3. Aviso por mail de pedidos nuevos (pedidos 23 a 25): rama `feat/aviso-pedidos-mail`
- [x] Código, pruebas y prueba de humo local.
- [x] Clave de Resend `la-pizzeria-avisos` (solo envío, dominio `nextstarting.com.ar`) y secreto `AVISO_MAIL` en el Worker.
- [x] Clave de Resend cargada como secreto `RESEND_CLAVE` (la cargó el usuario el 2026-11-26).
- [x] Probada con un pedido (Resend lo entregó) y publicada desde `main` (versión `0b20c9db`, 2026-11-27).
- [ ] El usuario confirma si llegó a la bandeja de entrada o a spam, y si hay que cambiar algo del mail.
- [ ] Cuando se pase a producción real: cambiar el destino por el mail del cliente con `! npx wrangler secret put AVISO_MAIL` (no hace falta redeployar).
- [ ] Si Capu's tiene dominio propio: verificarlo en Resend (o pasar al mail de Cloudflare) y cambiar `AVISO_REMITENTE` en `wrangler.jsonc`.

## 4. Ideas para después (heredadas, no pedidas)
- Aviso sonoro de pedido nuevo en el admin.
- Paginar pedidos (hoy solo avisa "Mostrando los últimos 100").
- Turnstile en el formulario público.
- Dominio propio.
