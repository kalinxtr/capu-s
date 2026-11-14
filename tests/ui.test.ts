import { describe, expect, it } from "vitest";
import {
  leerDatosCliente,
  leerEleccion,
  recortarEleccion,
  textoRecorte,
  textoStock,
} from "../lib/eleccion";
import { haceCuanto, linkMapa, linkTelefono, numero, origenSitio, telefonoLegible } from "../lib/formato";
import { mensajeAlCliente, mensajeAlLocal } from "../lib/mensajes";
import { aPreparar, pasosDelPedido, textoEstadoCliente } from "../lib/pedido";
import { moverEnLista, resumenStock } from "../lib/stock";

const ejemplo = {
  id: 7,
  cliente_nombre: "Ana",
  entrega: "envio" as const,
  direccion: "Calle 123",
  nota: null,
  total: 7500,
  items: [
    { nombre: "Oreo · Paleta", cantidad: 2, precio: 2500 },
    { nombre: "Dubai · Paleta", cantidad: 1, precio: 2500 },
  ],
};

describe("haceCuanto", () => {
  const ahora = Date.UTC(2026, 10, 14, 21, 40); // 18:40 en Argentina
  const min = 60_000;

  it("recién, para menos de un minuto (o reloj adelantado)", () => {
    expect(haceCuanto(ahora - 30_000, ahora)).toBe("recién");
    expect(haceCuanto(ahora + 10_000, ahora)).toBe("recién");
  });

  it("minutos dentro de la hora", () => {
    expect(haceCuanto(ahora - min, ahora)).toBe("hace 1 min");
    expect(haceCuanto(ahora - 59 * min, ahora)).toBe("hace 59 min");
  });

  it("hoy, ayer y fecha corta", () => {
    expect(haceCuanto(ahora - 120 * min, ahora)).toBe("hoy 16:40");
    expect(haceCuanto(Date.UTC(2026, 10, 14, 1, 0), ahora)).toBe("ayer 22:00");
    expect(haceCuanto(ahora - 3 * 86_400_000, ahora)).toBe("11/11 18:40");
  });
});

describe("formato para el admin", () => {
  it("teléfono legible y link tel:", () => {
    expect(telefonoLegible("5491123456789")).toBe("1123456789");
    expect(telefonoLegible("12345678")).toBe("12345678");
    expect(linkTelefono("5491123456789")).toBe("tel:+5491123456789");
    expect(linkTelefono("12345678")).toBe("tel:12345678");
  });

  it("link a Google Maps", () => {
    expect(linkMapa("Av. Siempreviva 742")).toBe(
      "https://www.google.com/maps/search/?api=1&query=Av.%20Siempreviva%20742",
    );
  });

  it("número con separador de miles", () => {
    expect(numero(2500)).toBe("2.500");
  });

  it("origen del sitio", () => {
    expect(origenSitio("localhost:8787")).toBe("http://localhost:8787");
    expect(origenSitio("127.0.0.1:3000")).toBe("http://127.0.0.1:3000");
    expect(origenSitio("x.workers.dev")).toBe("https://x.workers.dev");
    expect(origenSitio(null)).toBe("https://la-paleteria.lavadito.workers.dev");
  });
});

describe("mensajeAlCliente", () => {
  it("nuevo, con y sin link", () => {
    const sin = mensajeAlCliente({ ...ejemplo, estado: "nuevo" });
    expect(sin).toBe(
      "Hola Ana! Recibimos tu pedido #7:\nPedido #7 · Ana\n• 2 × Oreo · Paleta ($ 5.000)\n• 1 × Dubai · Paleta ($ 2.500)\nTotal: $ 7.500\nEnvío a: Calle 123",
    );
    const con = mensajeAlCliente({ ...ejemplo, estado: "nuevo" }, { link: "https://x/pedido/abc" });
    expect(con).toBe(sin + "\nSeguilo acá: https://x/pedido/abc");
  });

  it("preparado con retiro, con y sin indicaciones", () => {
    const p = { ...ejemplo, entrega: "retiro" as const, direccion: null, estado: "preparado" as const };
    expect(mensajeAlCliente(p)).toBe("Hola Ana! Tu pedido #7 ya está listo para retirar.");
    expect(mensajeAlCliente(p, { textoRetiro: "Av. 1, de 14 a 20 h" })).toBe(
      "Hola Ana! Tu pedido #7 ya está listo para retirar.\nAv. 1, de 14 a 20 h",
    );
  });

  it("preparado con envío", () => {
    expect(mensajeAlCliente({ ...ejemplo, estado: "preparado" })).toBe(
      "Hola Ana! Tu pedido #7 ya está listo y sale para Calle 123.",
    );
  });

  it("entregado y cancelado", () => {
    expect(mensajeAlCliente({ ...ejemplo, estado: "entregado" })).toBe(
      "Hola Ana! Gracias por tu pedido #7. ¡Que lo disfrutes!",
    );
    expect(mensajeAlCliente({ ...ejemplo, estado: "cancelado" })).toBe(
      "Hola Ana! Tu pedido #7 fue cancelado. Si fue un error, escribinos y lo vemos.",
    );
  });
});

describe("mensajeAlLocal", () => {
  it("pedido nuevo o consulta", () => {
    expect(mensajeAlLocal(ejemplo, true).startsWith("Hola! Hice este pedido:\nPedido #7 · Ana")).toBe(true);
    expect(mensajeAlLocal(ejemplo, false)).toBe("Hola! Te escribo por mi pedido #7.");
  });
});

describe("pasosDelPedido", () => {
  it("nuevo con retiro", () => {
    expect(pasosDelPedido("nuevo", "retiro")).toEqual([
      { nombre: "Recibido", estado: "actual" },
      { nombre: "Listo para retirar", estado: "pendiente" },
      { nombre: "Entregado", estado: "pendiente" },
    ]);
  });

  it("preparado con envío", () => {
    expect(pasosDelPedido("preparado", "envio")).toEqual([
      { nombre: "Recibido", estado: "hecho" },
      { nombre: "Listo para enviar", estado: "actual" },
      { nombre: "Entregado", estado: "pendiente" },
    ]);
  });

  it("entregado y cancelado", () => {
    expect(pasosDelPedido("entregado", "retiro").map((p) => p.estado)).toEqual(["hecho", "hecho", "actual"]);
    expect(pasosDelPedido("cancelado", "retiro")).toEqual([]);
  });
});

describe("textoEstadoCliente", () => {
  it("los cinco textos", () => {
    expect(textoEstadoCliente("nuevo", "retiro")).toBe("Ya lo recibimos. Te escribimos por WhatsApp cuando esté listo.");
    expect(textoEstadoCliente("preparado", "retiro")).toBe("¡Está listo! Ya podés pasar a retirarlo.");
    expect(textoEstadoCliente("preparado", "envio")).toBe("¡Está listo! En breve sale para tu dirección.");
    expect(textoEstadoCliente("entregado", "envio")).toBe("Entregado. ¡Gracias por tu pedido!");
    expect(textoEstadoCliente("cancelado", "envio")).toBe("Este pedido fue cancelado. Si tenés dudas, escribinos.");
  });
});

describe("aPreparar", () => {
  it("suma por producto y ordena", () => {
    expect(
      aPreparar([
        { items: [{ nombre: "Oreo · Paleta", cantidad: 2 }, { nombre: "Dubai · Paleta", cantidad: 1 }] },
        { items: [{ nombre: "Oreo · Paleta", cantidad: 1 }] },
      ]),
    ).toEqual([
      { nombre: "Oreo · Paleta", cantidad: 3 },
      { nombre: "Dubai · Paleta", cantidad: 1 },
    ]);
  });

  it("empates por nombre", () => {
    expect(
      aPreparar([{ items: [{ nombre: "Rasta", cantidad: 1 }, { nombre: "Dubai", cantidad: 1 }] }]).map((x) => x.nombre),
    ).toEqual(["Dubai", "Rasta"]);
  });
});

describe("elección guardada", () => {
  it("leerEleccion tolera cualquier cosa", () => {
    expect(leerEleccion(null)).toEqual({});
    expect(leerEleccion("basura")).toEqual({});
    expect(leerEleccion("[1,2]")).toEqual({});
    expect(leerEleccion('{"3":2,"x":1,"4":-1,"5":1.5,"6":500}')).toEqual({ 3: 2 });
  });

  it("recortarEleccion recorta y avisa", () => {
    const r = recortarEleccion({ 1: 3, 2: 1, 9: 2 }, [
      { id: 1, nombre: "Oreo · Paleta", stock: 2 },
      { id: 2, nombre: "Dubai · Paleta", stock: 0 },
    ]);
    expect(r.eleccion).toEqual({ 1: 2 });
    expect(r.recortes).toEqual([
      { id: 1, nombre: "Oreo · Paleta", pedidas: 3, quedan: 2 },
      { id: 2, nombre: "Dubai · Paleta", pedidas: 1, quedan: 0 },
    ]);
    expect(r.cambio).toBe(true);
  });

  it("recortarEleccion sin cambios devuelve la misma referencia", () => {
    const e = { 1: 2 };
    const r = recortarEleccion(e, [{ id: 1, nombre: "Oreo · Paleta", stock: 5 }]);
    expect(r.cambio).toBe(false);
    expect(r.eleccion).toBe(e);
    expect(r.recortes).toEqual([]);
  });

  it("textoRecorte", () => {
    expect(textoRecorte({ id: 1, nombre: "Oreo · Paleta", pedidas: 3, quedan: 2 })).toBe(
      "Oreo · Paleta: quedaban 2, te dejamos 2.",
    );
    expect(textoRecorte({ id: 1, nombre: "Oreo · Paleta", pedidas: 3, quedan: 1 })).toBe(
      "Oreo · Paleta: quedaba 1, te dejamos 1.",
    );
    expect(textoRecorte({ id: 1, nombre: "Oreo · Paleta", pedidas: 3, quedan: 0 })).toBe(
      "Oreo · Paleta se agotó y la sacamos de tu pedido.",
    );
  });
});

describe("leerDatosCliente", () => {
  const valido = { nombre: "Ana", telefono: "1123456789", entrega: "envio", direccion: "Calle 123" };

  it("acepta datos válidos", () => {
    expect(leerDatosCliente(JSON.stringify(valido))).toEqual(valido);
  });

  it("rechaza tipos o valores raros", () => {
    expect(leerDatosCliente(null)).toBe(null);
    expect(leerDatosCliente("basura")).toBe(null);
    expect(leerDatosCliente(JSON.stringify({ ...valido, entrega: "dron" }))).toBe(null);
    expect(leerDatosCliente(JSON.stringify({ ...valido, nombre: 5 }))).toBe(null);
  });

  it("recorta textos largos", () => {
    expect(leerDatosCliente(JSON.stringify({ ...valido, nombre: "a".repeat(100) }))?.nombre).toHaveLength(60);
  });
});

describe("textoStock", () => {
  it("agotado, últimas y quedan", () => {
    expect(textoStock(0)).toEqual({ texto: "Agotado", bajo: false });
    expect(textoStock(1)).toEqual({ texto: "¡Última!", bajo: true });
    expect(textoStock(3)).toEqual({ texto: "¡Últimas 3!", bajo: true });
    expect(textoStock(4)).toEqual({ texto: "Quedan 4", bajo: false });
  });
});

describe("stock del admin", () => {
  it("moverEnLista", () => {
    expect(moverEnLista([1, 2, 3], 2, "arriba")).toEqual([2, 1, 3]);
    expect(moverEnLista([1, 2, 3], 2, "abajo")).toEqual([1, 3, 2]);
    expect(moverEnLista([1, 2, 3], 1, "arriba")).toBe(null);
    expect(moverEnLista([1, 2, 3], 3, "abajo")).toBe(null);
    expect(moverEnLista([1, 2, 3], 9, "abajo")).toBe(null);
  });

  it("resumenStock", () => {
    expect(resumenStock([{ stock: 0 }, { stock: 5 }, { stock: 0 }])).toEqual({ activos: 3, sinStock: 2 });
  });
});
