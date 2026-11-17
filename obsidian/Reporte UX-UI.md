---
tipo: reporte
actualizado: 2026-11-14
---

# Reporte UX/UI (v1)

Revisión de todo el frontend leyendo el código (`app/`, `app/globals.css`, `lib/` que usa la UI). No se probó en un navegador. Pedido 5 en [[Pedidos del usuario]].

Límites que respeta: [[Decisiones]] (lista y no tienda, sin carrito ni pasos, solo Pedidos y Stock, nada se borra), el tope de 3 MiB del Worker, sin `cacheComponents`, CSS plano sin dependencias nuevas pesadas.

Prioridad: **P0** = error o barrera real · **P1** = mejora clara de uso · **P2** = pulido e identidad.

## Página pública (`/` y `app/Pedir.tsx`)

| # | Prio | Hallazgo | Propuesta |
|---|---|---|---|
| 1 | P0 | La confirmación vive solo en memoria (`res.ok`): si el cliente recarga o el navegador descarta la pestaña al abrir WhatsApp, pierde el número de pedido y el link. | Al crear el pedido, redirigir a `/pedido/<token>?nuevo=1`. Esa página pasa a ser la confirmación (URL estable, se puede guardar). |
| 2 | P0 | La hoja del pedido es un `div` con fondo: sin `role="dialog"`, sin foco inicial, sin trampa de foco, sin Esc, y el fondo sigue scrolleando. | Usar `<dialog>` nativo con `showModal()` (trae foco, Esc, fondo y capa superior). Bloquear el scroll del body. |
| 3 | P0 | Agotado = `opacity: .5` sobre toda la fila: el texto "Sin stock" y el precio quedan con contraste insuficiente. | Solo la foto en gris; texto con contraste normal; etiqueta "Agotado" clara. |
| 4 | P0 | El error aparece abajo de todo del formulario; con el teclado abierto en el celular no se ve. | Llevar el foco/scroll al error; marcar el campo con `aria-invalid`. |
| 5 | P1 | Si algo se agotó, la lista se recorta en silencio (el `useEffect` baja cantidades). El cliente no sabe qué cambió. | Avisar qué producto se recortó ("Oreo · Paleta: quedaban 2, te dejamos 2"). |
| 6 | P1 | Al recargar se pierde todo lo elegido. | Guardar cantidades en `sessionStorage` (y limpiarlas al confirmar). |
| 7 | P1 | Cliente que repite tiene que volver a escribir nombre, teléfono y dirección. | Recordarlos en `localStorage` (solo en su navegador) y precargar. |
| 8 | P1 | Botones − / + de 40 px (debajo de 44 px recomendados); el `output aria-live` anuncia un número sin contexto. | 44 px; grupo con `aria-label` "Cantidad de …"; anuncio con nombre. |
| 9 | P1 | Teléfono es `type="text"` con `inputMode`. | `type="tel"` (mejor autocompletado y teclado). |
| 10 | P1 | La barra de sabores no marca en qué sabor estás ni cuántas elegiste de cada uno. | Resaltar el sabor visible (IntersectionObserver) y mostrar un puntito/numero si hay elegidas. |
| 11 | P1 | "Quedan N" siempre igual. | Destacar stock bajo ("¡Últimas 2!") cuando quedan ≤ 3. |
| 12 | P1 | Antes de pedir no se explica cómo sigue (¿pago?, ¿cuándo?, ¿retiro dónde?). | Línea corta arriba: "Elegí, pedí y te escribimos por WhatsApp para coordinar", y las indicaciones de retiro visibles. |
| 13 | P2 | Encabezado de solo texto con fuente del sistema; no hay identidad de marca. | Tipografía de títulos con carácter (vía `next/font`, autoalojada), encabezado con más presencia, sin volverlo una tienda. |
| 14 | P2 | La barra inferior aparece de golpe; `scroll-behavior: smooth` no respeta `prefers-reduced-motion`. | Transición corta de entrada; desactivar animaciones con movimiento reducido. |
| 15 | P2 | Fotos de 64 px: chicas para algo que se elige por la foto. | 72–80 px, primeras fotos `loading="eager"`. |

## Link del cliente (`/pedido/[token]`)

| # | Prio | Hallazgo | Propuesta |
|---|---|---|---|
| 16 | P1 | Muestra el estado como una etiqueta suelta; no se ve el recorrido. | Línea de pasos: Recibido → Preparado → Entregado (o Cancelado). |
| 17 | P1 | No se actualiza sola. | Refrescar cada 30–60 s mientras está visible (mismo `Refrescar` del admin). |
| 18 | P1 | Con retiro no muestra dónde retirar; no hay forma de escribirle al local. | Mostrar indicaciones de retiro y botón WhatsApp al local. |
| 19 | P1 | No hay forma fácil de guardar el link. | Botón "Copiar link" / compartir (`navigator.share` con caída a portapapeles). |

## Admin: Pedidos

| # | Prio | Hallazgo | Propuesta |
|---|---|---|---|
| 20 | P0 | **No se ve el teléfono del cliente**: solo el botón WhatsApp. No se puede llamar ni copiarlo. | Mostrar el teléfono como link `tel:`. |
| 21 | P0 | El mensaje de WhatsApp para un pedido **cancelado o entregado** dice "Recibimos tu pedido". | Mensaje según estado (nuevo: recibido; preparado: listo; entregado: gracias; cancelado: cancelado). |
| 22 | P1 | Entra un pedido nuevo con el refresco de 30 s y no hay ninguna señal. | Contador en el título de la pestaña "(2) Pedidos", resaltar las tarjetas nuevas desde la última vista; aviso sonoro opcional. |
| 23 | P1 | Al marcar "Entregado" la tarjeta desaparece de "Por resolver" sin forma rápida de deshacer. | Mensaje breve con "Deshacer". |
| 24 | P1 | Hora absoluta ("13/11 18:40"); para una cola sirve más la relativa. | "hace 5 min" con la hora exacta en `title`. |
| 25 | P1 | Envío: la dirección es texto. | Link a Google Maps. |
| 26 | P1 | Tope de 100 pedidos sin aviso. | Avisar "Mostrando los últimos 100" (o paginar). |
| 27 | P1 | La barra del admin no marca la sección actual ni avisa pedidos nuevos. | Sección activa + número de nuevos junto a "Pedidos". |
| 28 | P2 | No hay resumen para producir. | Arriba de "Por resolver": cuántas de cada producto hay que preparar. |

## Admin: Stock

| # | Prio | Hallazgo | Propuesta |
|---|---|---|---|
| 29 | P0 | **Fijar stock no se descubre**: el número solo se guarda con Enter; si lo cambiás y salís del campo, no se guarda y no avisa. | Guardar al salir del campo (o botón visible) y marcar "sin guardar". |
| 30 | P0 | "Archivar sabor", "Archivar" producto y "quitar" foto son de un toque, sin confirmación. Archivar un sabor saca todos sus productos de la página. | Usar `BotonSeguro` (dos toques), como Cancelar. |
| 31 | P0 | Los mensajes "Guardado." quedan pegados para siempre. | Mensajes que se van solos (aviso flotante corto). |
| 32 | P1 | + / − de stock hace un viaje al servidor y bloquea el formulario: tocar rápido "+ + +" no funciona. | Cambio optimista (`useOptimistic`) y envío del total. |
| 33 | P1 | Nombre y precio se editan con "Guardar" por fila, sin indicar cambios pendientes. | Mostrar "Guardar" solo si hay cambios / resaltarlo. |
| 34 | P1 | Orden de sabores con un número a mano; los productos no se pueden ordenar. | Botones ↑ / ↓ para sabores y productos. |
| 35 | P1 | Precio sin formato ni "$". | Prefijo "$" y separador de miles al mostrar. |
| 36 | P1 | En el celular la fila de producto queda desordenada (foto, formulario, stock y "Archivar" sueltos). | Fila con estructura clara: foto · nombre/precio · stock · menú. |
| 37 | P1 | Lista larga sin resumen. | Arriba: productos activos, cuántos sin stock, link a "Datos del local". |
| 38 | P2 | Foto: con fotos HEIC de iPhone el mensaje es genérico. | Mensaje específico ("Probá con una captura o JPG"). |

## Admin: Ingreso y general

| # | Prio | Hallazgo | Propuesta |
|---|---|---|---|
| 39 | P1 | Títulos de pestaña iguales en todo el admin. | Títulos por página ("Pedidos · Admin", "Stock · Admin"). |
| 40 | P2 | Ingresar sin nombre del local ni mostrar/ocultar clave. | Agregarlos. |

## Transversal

| # | Prio | Hallazgo | Propuesta |
|---|---|---|---|
| 41 | P0 | Contraste: blanco sobre `--preparado` #c47f00 ≈ 2,9:1 (no llega a 4,5); `--acento` sobre `--fondo` está al límite para texto chico. | Ajustar tokens para AA en claro y oscuro. |
| 42 | P0 | Modo oscuro: `.foto-subiendo` con fondo blanco fijo; `themeColor` fijo en claro. | Tokens para esos casos; `themeColor` por `media`. |
| 43 | P0 | No hay `not-found`, `error` ni `loading` propios: un token inválido o un error de la base muestra la página genérica de Next. | `app/not-found.tsx`, `app/error.tsx`, `app/admin/(panel)/error.tsx` y `loading.tsx` con el estilo de la app. |
| 44 | P1 | Ícono por defecto de Next; sin imagen para compartir. El link se reparte por Instagram/WhatsApp. | `app/icon.svg`, `apple-icon`, y una imagen OG estática (no `next/og`, para no sumar peso al Worker). |
| 45 | P1 | Un solo `globals.css` de 720 líneas sin escala de espacios ni tipografía. | Tokens de espacio y tipo, y ordenar el CSS por secciones (seguir con CSS plano). |
| 46 | P2 | No hay pruebas de la lógica nueva de UI. | Pruebas unitarias de lo puro (mensajes por estado, guardado del pedido en el navegador, recortes de stock). |

## Lo que está bien y se mantiene
- Una sola pantalla, contador directo y barra fija: es lo pedido ("efectividad").
- Precios siempre del servidor, stock atómico, `BotonSeguro` en lugar de `confirm()`.
- `aria-label` en los botones de cantidad, `lang="es-AR"`, foco visible, `safe-area-inset`.
