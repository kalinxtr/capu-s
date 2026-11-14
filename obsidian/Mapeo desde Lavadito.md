---
tipo: referencia
actualizado: 2026-11-13
---

# Mapeo desde Lavadito

Cómo se traduce cada pieza de Lavadito-app a La Paletería. Lavadito: Cloudflare Workers + Hono + Postgres en Neon (vía Hyperdrive) + Vite/React, costo $0.

| Lavadito | La Paletería | Nota |
|---|---|---|
| `/turnos` público, flujo de 4 pasos (servicio → día → horario → datos) | Página pública de pedido: **una sola pantalla** (lista por sabor → datos → confirmar) | El usuario pide efectividad: no hay calendario ni horarios |
| Categorías (Auto/Camioneta/Moto) | **Sabores** (Oreo, Chocotorta, …) | Editables, se archivan en vez de borrarse |
| Servicios con `reservable_online` | **Productos** con **stock** | Sin stock = deshabilitado |
| Turno (`turnos`) con estados | **Pedido** con estados | Nombre, retiro/envío, monto, ítems |
| Verificar disponibilidad y crear el turno en una sola operación | Verificar **stock** y descontarlo en la misma transacción | Evita vender dos veces la última paleta |
| Token de cancelación + pantalla de confirmación | Pantalla de confirmación con resumen (+ link para ver el pedido) | |
| Turnstile anti-spam | Igual | Link público (Instagram) |
| Admin: Agenda | Admin: **Pedidos** | |
| Admin: Servicios | Admin: **Stock** (productos, sabores, cantidades) | |
| Botón WhatsApp con mensaje precargado | Igual, para avisar al cliente | Sin API paga |
| Precio copiado en cada ítem (snapshot) | Igual | El historial no cambia si sube un precio |
| Caja, Contador, Cierre, multicuenta | **Fuera** por ahora | El usuario pidió solo Pedidos y Stock |
