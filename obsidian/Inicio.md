---
tipo: indice
actualizado: 2026-11-19
---

# La Pizzería: notas del proyecto

App para un emprendimiento de pizzas: una **página pública de pedidos** (listado de stock por sabor) y un **admin** con secciones de Pedidos y Stock. **Es una copia de La Paletería** (`$Dev/la-paleteria`, remoto `upstream`) con la misma lógica: solo cambian la marca, los colores, el logo y los sabores iniciales (pedido 10).

Las notas de abajo (salvo [[Inicio]], [[Pendientes]] y la última sesión de [[Bitácora]]) son **heredadas de La Paletería**: donde dicen "paleta", acá es "pizza". Las reglas de [[Decisiones]] valen igual.

**Para retomar, leé en este orden:**
1. [[Pendientes]]: qué falta.
2. [[Decisiones]]: reglas de negocio (mandan sobre el brief).
3. [[Pedidos del usuario]]: cada pedido textual, crudo.
4. [[Bitácora]]: qué se hizo en cada sesión.
5. Heredadas: [[Brief original]], [[Mapeo desde Lavadito]], [[Stack]], [[Diseño]], [[Reporte UX-UI]], [[Plan UX-UI]], [[Auditoría arquitectura frontend]], [[Plan arquitectura frontend]].

**Estado actual (2026-11-19):** **publicada** en https://la-pizzeria.lavadito.workers.dev (admin en `/admin`), misma cuenta de Cloudflare que La Paletería. D1 `la-pizzeria` (solo los 4 sabores, sin productos), fotos en R2 `la-pizzeria-imagenes`. Prueba de humo de 30 pasos en verde contra lo publicado (y sus datos borrados). Repo: https://github.com/kalinxtr/capu-s. Ver [[Pendientes]].

Comandos, deploy y trampas: `README.md` en la raíz del repo.
