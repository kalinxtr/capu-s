---
tipo: pendientes
actualizado: 2026-11-19
---

# Pendientes

## 1. Copia de La Paletería: HECHA (pedido 10)
Ver [[Bitácora]] → sesión 4.

## 2. Lo que falta (del usuario)
- [ ] **Confirmar el nombre del negocio.** Hoy es "La Pizzería" (layout, ajustes iniciales, imagen para compartir). El nombre visible se cambia desde Stock → datos del local; si cambia, regenerar `public/og.png`.
- [x] Sabores iniciales: Muzza, Pepperoni, Fugazzeta y Roquefort (pedido 12).
- [ ] **Crear los recursos en Cloudflare** (pasos en `README.md` → "Primer deploy"): `npx wrangler d1 create la-pizzeria` (copiar el id a `wrangler.jsonc`), `npx wrangler r2 bucket create la-pizzeria-imagenes`, `npm run db:remota`, los secretos `ADMIN_CLAVE` y `SESION_SECRETO`, y `npm run deploy`.
- [ ] Cargar productos, precios, stock y fotos, y el WhatsApp del local.
- [ ] Probarla en el celular.

## 3. Ideas para después (heredadas, no pedidas)
- Aviso sonoro de pedido nuevo en el admin.
- Paginar pedidos (hoy solo avisa "Mostrando los últimos 100").
- Turnstile en el formulario público.
- Dominio propio.
