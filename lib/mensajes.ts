import { pesos, telefonoLegible } from "./formato";
import { textoPedido } from "./pedido";
import type { EstadoPedido } from "./tipos";

type PedidoTexto = Parameters<typeof textoPedido>[0];

/** Mensaje de WhatsApp del local al cliente, según el estado del pedido. */
export function mensajeAlCliente(
  p: PedidoTexto & { estado: EstadoPedido },
  extra: { textoRetiro?: string | null; link?: string | null } = {},
): string {
  const hola = `Hola ${p.cliente_nombre}!`;
  switch (p.estado) {
    case "nuevo":
      return `${hola} Recibimos tu pedido #${p.id}:\n${textoPedido(p)}` + (extra.link ? `\nSeguilo acá: ${extra.link}` : "");
    case "preparado":
      return p.entrega === "retiro"
        ? `${hola} Tu pedido #${p.id} ya está listo para retirar.` + (extra.textoRetiro ? `\n${extra.textoRetiro}` : "")
        : `${hola} Tu pedido #${p.id} ya está listo y sale para ${p.direccion}.`;
    case "entregado":
      return `${hola} Gracias por tu pedido #${p.id}. ¡Que lo disfrutes!`;
    case "cancelado":
      return `${hola} Tu pedido #${p.id} fue cancelado. Si fue un error, escribinos y lo vemos.`;
  }
}

export type MailPedido = { asunto: string; texto: string; html: string };

/** Mail que recibe el dueño cuando entra un pedido: lo justo para atenderlo sin abrir el admin. */
export function mailPedidoNuevo(p: PedidoTexto & { cliente_telefono: string }, linkAdmin: string): MailPedido {
  const tel = telefonoLegible(p.cliente_telefono);
  const wa = `https://wa.me/${p.cliente_telefono.replace(/\D/g, "")}`;
  const entrega = p.entrega === "envio" ? "Envío" : "Retiro";
  // Una sola línea: un nombre raro no tiene que romper el asunto.
  const asunto = `Pedido nuevo #${p.id} · ${p.cliente_nombre} · ${pesos(p.total)} · ${entrega}`.replace(/\s+/g, " ");

  const texto = [textoPedido(p), `Teléfono: ${tel} (WhatsApp: ${wa})`, "", `Ver en el admin: ${linkAdmin}`].join("\n");

  const e = escaparHtml;
  const items = p.items
    .map((i) => `<li>${i.cantidad} × ${e(i.nombre)} <span style="color:#666">(${pesos(i.precio * i.cantidad)})</span></li>`)
    .join("");
  const html = `<div style="font-family:system-ui,sans-serif;font-size:16px;line-height:1.5;color:#222">
<h2 style="margin:0 0 8px">Pedido #${p.id} · ${e(p.cliente_nombre)}</h2>
<ul style="padding-left:20px;margin:0 0 8px">${items}</ul>
<p style="margin:0 0 8px"><strong>Total: ${pesos(p.total)}</strong></p>
<p style="margin:0 0 8px">${p.entrega === "envio" ? `Envío a: ${e(p.direccion ?? "")}` : "Retiro en el local"}</p>
${p.nota ? `<p style="margin:0 0 8px">Nota: ${e(p.nota)}</p>` : ""}
<p style="margin:0 0 16px">Teléfono: <a href="${e(wa)}">${e(tel)}</a> (WhatsApp)</p>
<p style="margin:0"><a href="${e(linkAdmin)}" style="display:inline-block;padding:10px 16px;background:#c2410c;color:#fff;border-radius:8px;text-decoration:none">Ver en el admin</a></p>
</div>`;

  return { asunto, texto, html };
}

function escaparHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
}

/** Mensaje de WhatsApp del cliente al local: el pedido completo si es nuevo, o una consulta. */
export function mensajeAlLocal(p: PedidoTexto, nuevo: boolean): string {
  return nuevo ? `Hola! Hice este pedido:\n${textoPedido(p)}` : `Hola! Te escribo por mi pedido #${p.id}.`;
}
