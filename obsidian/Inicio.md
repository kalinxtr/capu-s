---
tipo: indice
actualizado: 2026-11-13
---

# La Paletería: notas del proyecto

App para un negocio de paletas heladas: una **página pública de pedidos** (listado de stock por sabor) y un **admin** con secciones de Pedidos y Stock. Copia la lógica de flujo de [Lavadito-app](../../Lavadito-app/obsidian/Inicio.md) (reserva pública + admin).

**Para retomar, leé en este orden:**
1. [[Pendientes]]: qué falta y en qué quedó lo último.
2. [[Decisiones]]: reglas de negocio confirmadas (mandan sobre el brief).
3. [[Pedidos del usuario]]: cada pedido textual, crudo.
4. [[Bitácora]]: qué se hizo en cada sesión.
5. [[Brief original]]: la sinopsis inicial, cruda.
6. [[Mapeo desde Lavadito]]: qué se reutiliza de Lavadito y cómo se traduce.
7. [[Stack]]: propuesta de tecnologías.
8. [[Diseño]]: diseño v1 (qué se construye).

**Estado actual (2026-11-13):** **v1 construida y publicada en un entorno de prueba**: https://la-paleteria.lavadito.workers.dev (admin en `/admin`). Base D1 `la-paleteria` (vacía: solo los 6 sabores), fotos en R2 `la-paleteria-imagenes`. Prueba de humo de 25 pasos en verde, en local y publicada. Falta que el usuario la pruebe y cargue sus productos. Ver [[Pendientes]].

Comandos, deploy y trampas: `README.md` en la raíz del repo.
