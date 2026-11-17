---
tipo: plan
actualizado: 2026-11-16
---

# Plan de arquitectura frontend (pedido 7)

> **Para agentes:** ejecutar tarea por tarea con superpowers:executing-plans. Los pasos usan casillas (`- [ ]`).

**Objetivo:** cerrar los 7 hallazgos de la [[Auditoría arquitectura frontend]] sobre el código de `ux-ui`, sin cambiar lo que ve el usuario salvo la sesión vencida (que pasa a mandar a ingresar) y el tamaño de las fotos nuevas.

**Arquitectura:** los errores esperados se vuelven valores o redirecciones, nunca excepciones. Una sola forma de llamar acciones desde el admin (`useAccion`). Módulos cliente partidos por tema. La lógica de entrada pasa a `lib/` como funciones puras con pruebas.

**Stack:** Next 16.4.6 (App Router, Server Actions), React 19.3, OpenNext en Workers, D1, R2, Vitest 5.

**Spec:** [[Auditoría arquitectura frontend]] (los hallazgos #1 a #7).

## Reglas globales

- Valen todas las de [[Plan UX-UI]] → "0. Reglas que no se tocan". En especial: toda acción del admin llama a `exigirSesion()`; el stock va por delta salvo `fijarStock`; se mantienen los tres formatos que lee `scripts/humo.mjs`; no hay D1 en el layout raíz ni en `not-found`; no hay `loading.tsx` fuera de `app/admin/(panel)/`.
- Sin dependencias nuevas (tampoco librerías para probar componentes).
- Antes de dar algo por terminado: `npm test`, `npm run typecheck` y la prueba de humo (README → "Prueba de humo").
- Comentarios del código en el idioma que ya usa el archivo (español).

## Puntos a revisar

1. **Sesión vencida con la pestaña Stock abierta:** tocar "+", "Guardar" o subir una foto lleva a `/admin/ingresar`. No aparece "Algo salió mal". → Tarea 1 (humo) y Tarea 3 (navegador).
2. **Corte de red durante una acción del admin:** error en línea "No se pudo guardar…", la página sigue en pie y el stock optimista vuelve atrás. → Tarea 3 (navegador).
3. **Dos toques rápidos en "+" del stock** siguen sumando 2 después de pasar a `useAccion`. → Tarea 3 (navegador).
4. **Foto vertical, horizontal y más chica que 320 px:** se respeta la proporción y no se agranda. → Tarea 4 (prueba).
5. **Pedido con un producto que se agota mientras la hoja está abierta:** la hoja se cierra si no queda nada y no se vuelve a abrir sola al elegir otra vez. → Tarea 5 (navegador).

---

### Tarea 1: la sesión vencida redirige (#1, #7)

**Archivos:**
- Modificar: `lib/sesion.ts` (`haySesion`, `exigirSesion`)
- Modificar: `scripts/humo.mjs:69-70`

**Interfaces:**
- Produce: `haySesion(): Promise<boolean>`, memorizada por request con `cache` de React. `exigirSesion(): Promise<void>`, que **redirige** a `/admin/ingresar` en vez de tirar.

- [ ] **Paso 1: endurecer la prueba de humo.** Cambiar el check de la línea 70 por dos: uno que pida `sinSesion.status === 200` y `x-action-redirect` hacia `/admin/ingresar` ("Una acción del admin sin sesión manda a ingresar"), y otro con `!sinSesion.ok` ("…y no se ejecuta").
- [ ] **Paso 2: confirmar que falla** contra el código actual (build + `wrangler dev` en un puerto libre, como dice el README). Esperado: ✗ en "manda a ingresar" (status 500, sin `x-action-redirect`).
- [ ] **Paso 3: implementar.** `haySesion = cache(async () => …)` con el mismo cuerpo. `exigirSesion` llama a `redirect("/admin/ingresar")` de `next/navigation`.
- [ ] **Paso 4: verificar.** `npm run typecheck` y la prueba de humo completa en verde.

### Tarea 2: partir `app/admin/componentes.tsx` por tema (#4)

Solo se mueve código: no cambia nada de lo que hace.

**Archivos:**
- Crear en `app/admin/_componentes/` (carpeta privada, no es ruta), todos con `"use client"`:
  - `avisos.tsx`: `Avisos`, `useAviso`
  - `formularios.tsx`: `FormAccion`, `BotonSeguro`
  - `nav.tsx`: `NavAdmin`
  - `pedidos.tsx`: `BotonEstado`, `RegistrarVistos`, `MarcaNueva` y el store de "visto"
  - `stock.tsx`: `ControlStock`
  - `foto.tsx`: `FotoProducto`, `achicar`, `aDataUrl`, `esHeic`
  - `ingreso.tsx`: `CampoClave`
- Borrar: `app/admin/componentes.tsx`
- Modificar imports: `app/admin/(panel)/layout.tsx`, `app/admin/(panel)/pedidos/page.tsx`, `app/admin/(panel)/stock/page.tsx`, `app/admin/ingresar/page.tsx`. Sin archivo índice: cada página importa del módulo que corresponde.

- [ ] **Paso 1: mover** cada export a su archivo, con sus imports.
- [ ] **Paso 2: verificar.** `npm run typecheck` sin errores, y ninguna referencia a `componentes"` en `app/`.

### Tarea 3: `useAccion`, una sola forma de llamar acciones en el admin (#3)

**Archivos:**
- Crear: `app/admin/_componentes/useAccion.ts`
- Modificar: `formularios.tsx` (`FormAccion`), `pedidos.tsx` (`BotonEstado`), `stock.tsx` (`ControlStock`), `foto.tsx` (`FotoProducto`)

**Interfaces:**
- Consume: `Resultado` de `lib/tipos.ts`.
- Produce:
  ```ts
  export type Accion = (prev: Resultado, form: FormData) => Promise<Resultado>;
  export const ERROR_INESPERADO = "No se pudo guardar. Revisá la conexión y probá de nuevo.";
  export function useAccion(): {
    ejecutar: (accion: Accion, datos: FormData, antes?: () => void) => Promise<Resultado>;
    pendiente: boolean;
  };
  ```
  `ejecutar` corre `antes()` (para `useOptimistic`) y la acción dentro de `useTransition`, y resuelve con el `Resultado`. Si la acción tira, ejecuta `unstable_rethrow(e)` (de `next/navigation`), registra el error con `console.error` y resuelve `{ ok: false, error: ERROR_INESPERADO }`. Nunca rechaza.

- [ ] **Paso 1: crear el hook** con esa firma.
- [ ] **Paso 2: `FormAccion`** usa `ejecutar(accion, datos)` y su `pendiente`. El resto queda igual (error en línea; si sale bien, `reset()` y aviso con `mensaje`).
- [ ] **Paso 3: `BotonEstado`** usa `ejecutar(cambiarEstado, …)` para el cambio y también para "Deshacer". Los errores salen como aviso de tipo `"error"`, como hoy.
- [ ] **Paso 4: `ControlStock`** usa `ejecutar(c.tipo === "sumar" ? ajustarStock : fijarStock, fd, () => aplicar(c))`. Si hay error, `setError`.
- [ ] **Paso 5: `FotoProducto`** deja `useActionState` y el `useEffect` que avisaba. Subir: `const r = await ejecutar(subirFoto, fd)` → aviso con `r.mensaje` o error en línea. Quitar: `<FormAccion accion={quitarFoto} ocultos={{ id }}>` con el mismo `BotonSeguro`. Un solo estado `error` local.
- [ ] **Paso 6: verificar.** Ningún `useActionState` en `app/admin`. `npm run typecheck`. Prueba de humo en verde. En el navegador (Puntos a revisar 1 a 3): borrar la cookie `sesion` y tocar "+" en Stock → va a ingresar; con la red cortada, "Guardar" → error en línea; dos toques rápidos en "+" → suma 2.

### Tarea 4: fotos a 320 px (#2)

**Archivos:**
- Crear: `lib/foto.ts`
- Modificar: `app/admin/_componentes/foto.tsx` (`achicar`)
- Test: `tests/foto.test.ts`
- Modificar: `obsidian/Decisiones.md:38`, `README.md:61` (800 → 320 px)

**Interfaces:**
- Produce: `LADO_FOTO = 320` y `medidaAchicada(ancho: number, alto: number, lado = LADO_FOTO): { ancho: number; alto: number }`. Escala para que el lado mayor sea `lado`, nunca agranda y redondea con mínimo 1.

- [ ] **Paso 1: escribir la prueba que falla.**
  ```ts
  expect(medidaAchicada(4000, 3000)).toEqual({ ancho: 320, alto: 240 });
  expect(medidaAchicada(3000, 4000)).toEqual({ ancho: 240, alto: 320 });
  expect(medidaAchicada(200, 100)).toEqual({ ancho: 200, alto: 100 });
  expect(medidaAchicada(5000, 10)).toEqual({ ancho: 320, alto: 1 });
  ```
- [ ] **Paso 2:** `npx vitest run tests/foto.test.ts` → falla (no existe el módulo).
- [ ] **Paso 3: implementar** `lib/foto.ts`, y que `achicar` use `medidaAchicada(bmp.width, bmp.height)` para el canvas.
- [ ] **Paso 4:** `npm test` en verde y las dos notas actualizadas.

### Tarea 5: `Pedir` en dos hooks (#5)

Sin cambios de comportamiento. La lógica pura (`lib/eleccion.ts`) ya tiene pruebas.

**Archivos:**
- Crear: `app/useEleccion.ts`, `app/useSaborVisible.ts`
- Modificar: `app/Pedir.tsx`

**Interfaces:**
- Produce:
  ```ts
  useEleccion(productos: { id: number; nombre: string; stock: number }[]): {
    cantidades: Eleccion;
    cambiar: (id: number, delta: number) => number; // devuelve la cantidad nueva
    recortes: Recorte[];
    descartarRecortes: () => void;
  };
  useSaborVisible(secciones: { id: number }[], nav: RefObject<HTMLElement | null>): number | null;
  ```
  `nombre` es el nombre completo ("Oreo · Paleta"), el que hoy arma el `Map` `completo`.

- [ ] **Paso 1: `useEleccion`** se lleva los efectos de ref, carga + recorte y guardado en `sessionStorage`, y la lógica de `cambiar` (que lee y actualiza el ref en el momento, para que dos toques rápidos sumen 2).
- [ ] **Paso 2: `useSaborVisible`** se lleva el `IntersectionObserver` y el `scrollIntoView` de la barra.
- [ ] **Paso 3: en `Pedir`**, borrar el efecto `unidades === 0 → setAbierto(false)` y pasarle a `HojaPedido` `abierto={abierto && unidades > 0}`. Cuando la hoja recibe `false`, cierra el `<dialog>`; su `onClose` llama a `onCerrar` y eso deja `abierto` en `false`. Así no se vuelve a abrir sola (Punto a revisar 5).
- [ ] **Paso 4: verificar.** `npm run typecheck`, prueba de humo en verde, y en el navegador: elegir, recargar (la elección sigue), barra de sabores al scrollear, abrir la hoja y confirmar.

### Tarea 6: validación del admin pura y con pruebas (#6)

**Archivos:**
- Crear: `lib/entradas.ts`
- Modificar: `lib/foto.ts` (agrega `leerFotoDataUrl`), `app/admin/acciones.ts` (borra `entero`, `texto`, `TIPOS_FOTO` y la regex de la foto; importa de `lib/`)
- Test: `tests/entradas.test.ts`, `tests/foto.test.ts`

**Interfaces:**
- Produce:
  ```ts
  // lib/entradas.ts
  entero(form: FormData, campo: string, min = 0, max = 1_000_000): number | null;
  texto(form: FormData, campo: string, max: number): string;
  // lib/foto.ts
  leerFotoDataUrl(valor: string): { tipo: "image/webp" | "image/jpeg" | "image/png"; ext: "webp" | "jpg" | "png"; bytes: Uint8Array } | null;
  ```
  Mismo comportamiento que hoy. El tope de tamaño (`MAX_FOTO`) y sus mensajes quedan en la acción.

- [ ] **Paso 1: escribir las pruebas que fallan.**
  - `entero`: `"12"` → 12; `" 7 "` → 7; `"-1"` con min 0 → null; `"-3"` con min -10 → -3; `"1.5"`, `"abc"`, `""` y el campo ausente → null; `"2000000"` con el máximo por defecto → null.
  - `texto`: `"  hola  "` → `"hola"`; recorta a `max`; el campo ausente → `""`.
  - `leerFotoDataUrl`: `"data:image/png;base64,iVBORw0KGgo="` → tipo `image/png`, ext `png`, 8 bytes; `"data:image/gif;base64,R0lG"` → null; `"data:image/webp;base64,@@@"` → null; `""` → null.
- [ ] **Paso 2:** `npm test` → fallan (no existen los módulos).
- [ ] **Paso 3: implementar** moviendo el código de `app/admin/acciones.ts` sin cambiar la lógica.
- [ ] **Paso 4:** `npm test`, `npm run typecheck` y la prueba de humo en verde (cubre subir foto, precios y stock).

---

## Al terminar

- Vault: [[Bitácora]], [[Pendientes]], [[Pedidos del usuario]] (pedido 7) e [[Inicio]].
- Reporte al usuario: cómo queda `ux-ui` contra `main`.
