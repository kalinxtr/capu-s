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

/** Mensaje de WhatsApp del cliente al local: el pedido completo si es nuevo, o una consulta. */
export function mensajeAlLocal(p: PedidoTexto, nuevo: boolean): string {
  return nuevo ? `Hola! Hice este pedido:\n${textoPedido(p)}` : `Hola! Te escribo por mi pedido #${p.id}.`;
}
