---
tipo: pendientes
actualizado: 2026-11-14
---

# Pendientes

## 1. Diseño: HECHO
- [x] "Encargo" = pedido, sin fechas (pedido 2).
- [x] Stack A elegido y probado (pedido 3). Ver [[Stack]].
- [x] El pedido no lleva imagen (pedido 4).
- [x] [[Diseño]] escrito (pedido 4: "avanza hasta donde puedas").

## 2. v1: HECHA y publicada en prueba (pedido 4)
https://la-paleteria.lavadito.workers.dev. Ver [[Bitácora]].

## 3. Lo que falta (del usuario)
- [ ] **Probarla en el celular**: hacer un pedido, verlo en `/admin/pedidos`, cancelarlo y ver que vuelve el stock.
- [ ] **Cambiar la clave del admin**: hoy tiene una clave de prueba (la de `ADMIN_CLAVE` en `.dev.vars`). Con `! npx wrangler secret put ADMIN_CLAVE` se pone la definitiva (corta las sesiones abiertas).
- [ ] **Cargar productos, precios, stock y fotos** en `/admin/stock`, y el WhatsApp del local + indicaciones de retiro (abajo de todo en Stock).
- [ ] Confirmar las propuestas marcadas en [[Decisiones]] → "Tomadas en la construcción" (teléfono obligatorio, estados, etc.).

## 3b. Mejoras UX/UI (pedido 5): HECHAS en la rama `ux-ui`
Ver [[Reporte UX-UI]], [[Plan UX-UI]] y [[Bitácora]]. Falta:
- [ ] **Revisar la rama y decidir si se fusiona a `main`** y se publica. No hay migraciones nuevas: alcanza con `npm run deploy`.
- [ ] Probarla en un celular de verdad (se probó con Edge sin ventana a 390 px y 1100 px, claro y oscuro).
- [ ] Pegar el link en WhatsApp después de publicar y ver la vista previa (imagen `public/og.png`).

## 4. Ideas para después (no pedidas)
- Aviso sonoro de pedido nuevo en el admin (diferido: necesita un interruptor y permiso de audio).
- Paginar pedidos (hoy solo avisa "Mostrando los últimos 100").
- Turnstile en el formulario público (hoy hay límite de 5 pedidos por minuto por IP).
- Dominio propio.

## 5. Limpieza
- [ ] Borrar la prueba descartable (Worker `paleteria-spike` y D1 `paleteria-spike`) cuando el usuario diga.
