import { describe, expect, it } from "vitest";
import { mailPedidoNuevo } from "../lib/mensajes";

const pedido = {
  id: 12,
  cliente_nombre: "Ana",
  cliente_telefono: "5491123456789",
  entrega: "envio" as const,
  direccion: "Av. Siempre Viva 742",
  nota: null,
  total: 25000,
  items: [
    { nombre: "Muzza · Grande", cantidad: 2, precio: 10000 },
    { nombre: "Fugazzeta · Chica", cantidad: 1, precio: 5000 },
  ],
};
const link = "https://la-pizzeria.lavadito.workers.dev/admin/pedidos";

describe("mailPedidoNuevo", () => {
  it("arma un asunto de una línea con número, cliente, total y entrega", () => {
    expect(mailPedidoNuevo(pedido, link).asunto).toBe("Pedido nuevo #12 · Ana · $ 25.000 · Envío");
    expect(mailPedidoNuevo({ ...pedido, cliente_nombre: "Ana\nBeto", entrega: "retiro" }, link).asunto).toBe(
      "Pedido nuevo #12 · Ana Beto · $ 25.000 · Retiro",
    );
  });

  it("el texto trae productos, dirección, teléfono legible, WhatsApp y el link al admin", () => {
    const { texto } = mailPedidoNuevo(pedido, link);
    expect(texto).toContain("• 2 × Muzza · Grande ($ 20.000)");
    expect(texto).toContain("Envío a: Av. Siempre Viva 742");
    expect(texto).toContain("Teléfono: 1123456789 (WhatsApp: https://wa.me/5491123456789)");
    expect(texto).toContain(`Ver en el admin: ${link}`);
  });

  it("escapa en el HTML lo que escribe el cliente", () => {
    const { html } = mailPedidoNuevo({ ...pedido, cliente_nombre: "<b>Ana</b>", nota: `sin "cebolla" & <script>` }, link);
    expect(html).toContain("&lt;b&gt;Ana&lt;/b&gt;");
    expect(html).toContain("sin &quot;cebolla&quot; &amp; &lt;script&gt;");
    expect(html).not.toContain("<script>");
  });

  it("sin nota no agrega el párrafo", () => {
    expect(mailPedidoNuevo(pedido, link).html).not.toContain("Nota:");
  });
});
