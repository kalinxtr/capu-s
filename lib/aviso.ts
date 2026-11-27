import "server-only";
import type { MailPedido } from "./mensajes";

/** Sin dominio propio, Resend solo deja mandar desde esta dirección y a la del dueño de la cuenta. */
const REMITENTE_POR_DEFECTO = "Pedidos Capu's <onboarding@resend.dev>";

export type ConfigAviso = { RESEND_CLAVE?: string; AVISO_MAIL?: string; AVISO_REMITENTE?: string };

/**
 * Manda el mail de pedido nuevo al dueño. Corre después de responder (con `after`), así que nunca
 * frena ni rompe el pedido: si falta configuración o Resend falla, solo queda en los logs del Worker.
 */
export async function avisarPorMail(cfg: ConfigAviso, mail: MailPedido, idempotencia: string): Promise<void> {
  const para = (cfg.AVISO_MAIL ?? "").split(",").map((s) => s.trim()).filter(Boolean);
  if (!cfg.RESEND_CLAVE || para.length === 0) {
    console.log("aviso por mail: sin RESEND_CLAVE o AVISO_MAIL, no se manda");
    return;
  }
  try {
    const r = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${cfg.RESEND_CLAVE}`,
        "Content-Type": "application/json",
        "User-Agent": "la-pizzeria-worker",
        // Si el mismo pedido se avisara dos veces, Resend manda uno solo.
        "Idempotency-Key": idempotencia,
      },
      body: JSON.stringify({
        from: cfg.AVISO_REMITENTE || REMITENTE_POR_DEFECTO,
        to: para,
        subject: mail.asunto,
        text: mail.texto,
        html: mail.html,
      }),
      signal: AbortSignal.timeout(10_000),
    });
    if (!r.ok) console.error(`aviso por mail: Resend respondió ${r.status}: ${(await r.text()).slice(0, 500)}`);
  } catch (e) {
    console.error("aviso por mail: falló el envío", e);
  }
}
