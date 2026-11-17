---
tipo: reporte
actualizado: 2026-11-16
---

# Auditoría de arquitectura frontend

Pedido 7 en [[Pedidos del usuario]]. Revisión leyendo el código, con los criterios de las skills de ECC `frontend-patterns` y `react-patterns` y la guía de errores de Next 16 instalada (`node_modules/next/dist/docs/01-app/01-getting-started/10-error-handling.md`).

**Qué código se auditó.** El de la rama `ux-ui` (el frontend vigente después del pedido 5), comparado con la v1 de `main`. Lo que la sesión 2 ya resolvió no se repite. El plan ([[Plan arquitectura frontend]]) se escribió y se ejecutó sobre `ux-ui`.

**Foco.** Arquitectura: límites servidor/cliente, contrato de errores, estado, flujo de datos y organización de módulos. Lo visual y de usabilidad está en el [[Reporte UX-UI]].

## Lo que está bien (se mantiene)

- **Límite servidor/cliente limpio.** Las páginas son Server Components que leen D1 y le pasan al cliente solo lo necesario (`app/page.tsx` recorta los productos a 5 campos). Hay componentes cliente solo donde hay interacción.
- **`server-only`** en `lib/datos.ts`, `lib/sesion.ts` y `lib/cloudflare.ts`. La lógica pura (`lib/pedido`, `lib/eleccion`, `lib/formato`, `lib/mensajes`) se usa en los dos lados y tiene pruebas.
- **El precio nunca viene del cliente**, el stock se descuenta en un batch atómico y las acciones del admin verifican la sesión adentro.
- **`requerirSesion()` en cada página y no solo en el layout.** Es lo correcto: en una navegación del lado del cliente el layout no se vuelve a ejecutar.
- **La URL como estado** (`?estado=`), y `React.cache` para no consultar dos veces entre la metadata y la página.
- `<dialog>` nativo, `useOptimistic` con diferencias de stock (no se pisa con un pedido que entra al mismo tiempo), `useSyncExternalStore` para "visto", un `Refrescar` que tiene en cuenta si la pestaña está visible, y `error.tsx`, `not-found.tsx` y `loading.tsx` propios.

## Hallazgos

Prioridad: **A** = error que el usuario va a encontrar · **M** = deuda que encarece cada cambio · **B** = pulido.

| # | Prio | Hallazgo | Estado en `main` |
|---|---|---|---|
| 1 | A | **La sesión vencida es una excepción, no un error esperado.** `exigirSesion()` hace `throw` en todas las acciones del admin, y ningún llamador del cliente lo atrapa. Next 16 pide modelar los errores esperados como valor de retorno. | Peor: página de error genérica de Next |
| 2 | M | **Las fotos se guardan a 800 px y se muestran a 76 px** (64 px en el admin). Ninguna vista usa más. La lista pública baja unas 10 veces más píxeles de los necesarios, en el celular. | Igual |
| 3 | M | **Cuatro formas de llamar a una Server Action desde el cliente**, cada una con su propio manejo de errores: `FormAccion` (transición a mano), `BotonEstado` y `ControlStock` (transición imperativa), `FotoProducto` (`useActionState` + un efecto para avisar). Solo algunas muestran el error. | Una sola forma, pero con los problemas de React 19 que `ux-ui` ya resolvió |
| 4 | M | **`app/admin/componentes.tsx` mezcla siete temas en un solo módulo cliente de 489 líneas**: avisos, formularios, navegación, pedidos y "visto", stock, fotos e ingreso. | 135 líneas |
| 5 | M | **`Pedir.tsx` reúne cuatro responsabilidades en seis efectos**: guardar la elección, recortarla al stock, el sabor visible y la hoja. Hay estado derivado sincronizado con un efecto (`unidades === 0 → setAbierto(false)`) y un ref que copia el estado. | 1 efecto (estado derivado) |
| 6 | B | **La validación del admin no tiene pruebas.** `entero`, `texto` y el parseo de la foto están dentro de `app/admin/acciones.ts`. La del pedido público sí es pura y tiene pruebas (`leerPedido`). | Igual |
| 7 | B | **`haySesion()` se calcula hasta 3 veces por request** (metadata, layout y página). Cada vez lee la cookie y calcula el HMAC. | 2 veces |

### Detalle

**1. Sesión vencida.** Va a pasar seguro: la cookie dura 30 días fijos y **cambiar `ADMIN_CLAVE` corta todas las sesiones** ([[Decisiones]]). Cambiarla es justamente un pendiente del usuario. Caso concreto: se cambia la clave desde la compu con la pestaña Stock abierta en el celular. El siguiente toque en "+" lanza una excepción, `useOptimistic` revierte el cambio y el `error.tsx` del admin tapa la página con "Algo salió mal". Pedidos zafa porque su `Refrescar` pasa por `requerirSesion()` y redirige. En Stock no hay refresco.
Arreglo: `exigirSesion()` hace `redirect("/admin/ingresar")`. Next lo maneja solo en una Server Action, también cuando se la llama directo desde una transición: llega en el header `x-action-redirect`, el mismo que ya usa la prueba de humo con `crearPedido` e `ingresar`.

**2. Fotos.** El navegador ya achica antes de subir, así que el arreglo es bajar el tope de 800 a 320 px (cubre 76 px en pantallas 3x, con margen). Conviene hacerlo **antes de que el usuario cargue sus productos**, que es un pendiente suyo. Las fotos subidas antes del cambio quedan a 800 px hasta que se vuelvan a subir.

**3 y 4.** Un hook `useAccion()` con una sola forma de llamar: dentro de una transición, con los errores inesperados convertidos en mensaje en lugar de tirar la página. `componentes.tsx` se parte por tema en `app/admin/_componentes/`.

**5.** La lógica ya es pura y tiene pruebas (`lib/eleccion.ts`). Falta sacar el cableado a dos hooks (`useEleccion`, `useSaborVisible`) y derivar "hoja abierta" en vez de sincronizarla con un efecto. No cambia el comportamiento.

## Revisado y descartado

- **`error.tsx` recibe `retry` y no `reset`.** Es correcto en Next 16 (lo dice la guía instalada).
- **Pasar Server Actions como props a componentes cliente**: es serializable y es el patrón documentado.
- **Hidratar toda la lista pública en un solo componente cliente**: con decenas de productos no pesa. Recién valdría separarlo con varios cientos.
- **`router.refresh()` cada 30 s en el admin**: respeta lo que se está escribiendo (`borrador` en `ControlStock`, `defaultValue` en los formularios).
- **Store a nivel de módulo para "visto"**: es correcto con `useSyncExternalStore`. No sincroniza entre pestañas, lo que no importa con un solo admin.
- **`HojaPedido` (público) no se pasa a `useAccion`**: usa `useActionState` para que el formulario ande antes de que cargue el JS, y ante un error inesperado lo que el cliente eligió ya está guardado (`sessionStorage`), igual que sus datos si marcó "Recordar".
