import { env } from "@/lib/cloudflare";

/**
 * Sirve las fotos de productos desde R2. Cada foto tiene una clave única (UUID), así que
 * se puede cachear para siempre: si se cambia la foto, cambia la clave.
 */
export async function GET(_req: Request, ctx: RouteContext<"/img/[...clave]">) {
  const { clave } = await ctx.params;
  const key = clave.join("/");
  if (!/^productos\/[0-9a-f-]{36}\.(webp|jpe?g|png)$/.test(key)) return new Response("No existe", { status: 404 });
  const obj = await (await env()).IMAGENES.get(key);
  if (!obj) return new Response("No existe", { status: 404 });
  return new Response(obj.body, {
    headers: {
      "Content-Type": obj.httpMetadata?.contentType ?? "image/webp",
      "Cache-Control": "public, max-age=31536000, immutable",
      ETag: obj.httpEtag,
    },
  });
}
