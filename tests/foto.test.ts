import { describe, expect, it } from "vitest";
import { LADO_FOTO, leerFotoDataUrl, medidaAchicada } from "../lib/foto";

describe("leerFotoDataUrl", () => {
  it("lee un PNG en base64", () => {
    const f = leerFotoDataUrl("data:image/png;base64,iVBORw0KGgo=");
    expect(f?.tipo).toBe("image/png");
    expect(f?.ext).toBe("png");
    expect(f?.bytes.length).toBe(8);
  });

  it("rechaza tipos y contenidos que no son una foto aceptada", () => {
    expect(leerFotoDataUrl("data:image/gif;base64,R0lG")).toBeNull();
    expect(leerFotoDataUrl("data:image/webp;base64,@@@")).toBeNull();
    expect(leerFotoDataUrl("")).toBeNull();
  });

  it("rechaza base64 de largo inválido sin tirar", () => {
    expect(leerFotoDataUrl("data:image/png;base64,iVBOR")).toBeNull();
    expect(leerFotoDataUrl("data:image/png;base64,iVBORw0KGgo==")).toBeNull();
  });
});

describe("medidaAchicada", () => {
  it("lleva el lado mayor a 320 px", () => {
    expect(LADO_FOTO).toBe(320);
    expect(medidaAchicada(4000, 3000)).toEqual({ ancho: 320, alto: 240 });
    expect(medidaAchicada(3000, 4000)).toEqual({ ancho: 240, alto: 320 });
  });

  it("no agranda una foto chica", () => {
    expect(medidaAchicada(200, 100)).toEqual({ ancho: 200, alto: 100 });
  });

  it("nunca deja un lado en 0", () => {
    expect(medidaAchicada(5000, 10)).toEqual({ ancho: 320, alto: 1 });
  });
});
