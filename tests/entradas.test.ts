import { describe, expect, it } from "vitest";
import { entero, texto } from "../lib/entradas";

const form = (campos: Record<string, string>) => {
  const f = new FormData();
  for (const [k, v] of Object.entries(campos)) f.set(k, v);
  return f;
};

describe("entero", () => {
  it("lee enteros con espacios alrededor", () => {
    expect(entero(form({ n: "12" }), "n")).toBe(12);
    expect(entero(form({ n: " 7 " }), "n")).toBe(7);
  });

  it("respeta el mínimo y el máximo", () => {
    expect(entero(form({ n: "-1" }), "n")).toBeNull();
    expect(entero(form({ n: "-3" }), "n", -10)).toBe(-3);
    expect(entero(form({ n: "2000000" }), "n")).toBeNull();
  });

  it("rechaza lo que no es un entero", () => {
    expect(entero(form({ n: "1.5" }), "n")).toBeNull();
    expect(entero(form({ n: "abc" }), "n")).toBeNull();
    expect(entero(form({ n: "" }), "n")).toBeNull();
    expect(entero(form({}), "n")).toBeNull();
  });
});

describe("texto", () => {
  it("recorta espacios y largo", () => {
    expect(texto(form({ t: "  hola  " }), "t", 60)).toBe("hola");
    expect(texto(form({ t: "abcdef" }), "t", 3)).toBe("abc");
  });

  it("un campo ausente es texto vacío", () => {
    expect(texto(form({}), "t", 10)).toBe("");
  });
});
