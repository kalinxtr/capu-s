import { describe, expect, it } from "vitest";
import { firmarSesion, iguales, sesionValida } from "../lib/firma";
import { linkWhatsApp, normalizarTelefono, parsePesos, pesos } from "../lib/formato";
import { leerPedido, textoPedido } from "../lib/pedido";

const base: [string, string][] = [
  ["nombre", "Ana"],
  ["telefono", "11 2345 6789"],
  ["entrega", "retiro"],
];

describe("leerPedido", () => {
  it("lee las cantidades y descarta las que están en 0", () => {
    const r = leerPedido([...base, ["cant_3", "2"], ["cant_4", "0"], ["cant_9", "1"]]);
    expect(r).toEqual({
      ok: true,
      datos: {
        nombre: "Ana",
        telefono: "11 2345 6789",
        entrega: "retiro",
        direccion: null,
        nota: null,
        lineas: [
          { productoId: 3, cantidad: 2 },
          { productoId: 9, cantidad: 1 },
        ],
      },
    });
  });

  it("pide al menos un producto", () => {
    expect(leerPedido([...base, ["cant_1", "0"]])).toEqual({ ok: false, error: "Elegí al menos una pizza." });
  });

  it("rechaza cantidades negativas, decimales o enormes", () => {
    for (const v of ["-1", "1.5", "abc", "100"]) {
      expect(leerPedido([...base, ["cant_1", v]]).ok).toBe(false);
    }
  });

  it("exige nombre y teléfono, y dice qué campo falló", () => {
    expect(leerPedido([["telefono", "1123456789"], ["entrega", "retiro"], ["cant_1", "1"]])).toEqual({
      ok: false,
      error: "Escribí tu nombre.",
      campo: "nombre",
    });
    expect(leerPedido([["nombre", "Ana"], ["telefono", "123"], ["entrega", "retiro"], ["cant_1", "1"]])).toEqual({
      ok: false,
      error: "Revisá el teléfono: con código de área.",
      campo: "telefono",
    });
  });

  it("con envío exige dirección; con retiro la ignora", () => {
    const envio: [string, string][] = [["nombre", "Ana"], ["telefono", "1123456789"], ["entrega", "envio"], ["cant_1", "1"]];
    expect(leerPedido(envio)).toEqual({ ok: false, error: "Escribí la dirección de envío.", campo: "direccion" });
    const ok = leerPedido([...envio, ["direccion", "Calle 123"]]);
    expect(ok.ok && ok.datos.direccion).toBe("Calle 123");
    const retiro = leerPedido([...base, ["direccion", "Calle 123"], ["cant_1", "1"]]);
    expect(retiro.ok && retiro.datos.direccion).toBe(null);
  });

  it("rechaza una forma de entrega desconocida", () => {
    expect(leerPedido([["nombre", "Ana"], ["telefono", "1123456789"], ["entrega", "dron"], ["cant_1", "1"]]).ok).toBe(false);
  });
});

describe("textoPedido", () => {
  it("arma el mensaje de WhatsApp", () => {
    const t = textoPedido({
      id: 7,
      cliente_nombre: "Ana",
      entrega: "envio",
      direccion: "Calle 123",
      nota: "Sin timbre",
      total: 7500,
      items: [
        { nombre: "Muzzarella · Grande", cantidad: 2, precio: 2500 },
        { nombre: "Napolitana · Grande", cantidad: 1, precio: 2500 },
      ],
    });
    expect(t).toBe(
      "Pedido #7 · Ana\n• 2 × Muzzarella · Grande ($ 5.000)\n• 1 × Napolitana · Grande ($ 2.500)\nTotal: $ 7.500\nEnvío a: Calle 123\nNota: Sin timbre",
    );
  });
});

describe("formato", () => {
  it("pesos enteros es-AR", () => {
    expect(pesos(20000)).toBe("$ 20.000");
    expect(parsePesos("$2.500")).toBe(2500);
    expect(parsePesos("")).toBe(null);
  });

  it("normaliza teléfonos argentinos para wa.me", () => {
    expect(normalizarTelefono("11 15 2345 6789")).toBe("5491123456789");
    expect(normalizarTelefono("+54 9 11 2345-6789")).toBe("5491123456789");
    expect(linkWhatsApp("1123456789", "hola")).toBe("https://wa.me/5491123456789?text=hola");
  });
});

describe("sesión firmada", () => {
  const secreto = "x".repeat(32);

  it("acepta una firma válida y vigente", async () => {
    const vence = Math.floor(Date.now() / 1000) + 60;
    const v = await firmarSesion(secreto, "clave", vence);
    expect(await sesionValida(secreto, "clave", v, Date.now())).toBe(true);
  });

  it("rechaza si venció, si cambió la clave o si la tocaron", async () => {
    const vence = Math.floor(Date.now() / 1000) + 60;
    const v = await firmarSesion(secreto, "clave", vence);
    expect(await sesionValida(secreto, "clave", v, (vence + 1) * 1000)).toBe(false);
    expect(await sesionValida(secreto, "otra", v, Date.now())).toBe(false);
    expect(await sesionValida(secreto, "clave", `${vence + 999}.${v.split(".")[1]}`, Date.now())).toBe(false);
    expect(await sesionValida(secreto, "clave", "basura", Date.now())).toBe(false);
  });

  it("iguales compara bien", () => {
    expect(iguales("abc", "abc")).toBe(true);
    expect(iguales("abc", "abd")).toBe(false);
    expect(iguales("abc", "ab")).toBe(false);
  });
});
