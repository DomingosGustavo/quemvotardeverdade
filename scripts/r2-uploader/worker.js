// Worker temporário usado só durante o deploy para gravar as fotos no R2.
// Exige o segredo UPLOAD_SECRET; é apagado ao final do deploy.
export default {
  async fetch(req, env) {
    if (req.headers.get("x-upload-secret") !== env.UPLOAD_SECRET) return new Response("forbidden", { status: 403 });
    const key = decodeURIComponent(new URL(req.url).pathname.slice(1));
    if (!/^[0-9]+\.webp$/.test(key)) return new Response("bad key", { status: 400 });
    if (req.method !== "PUT") return new Response("method", { status: 405 });
    await env.FOTOS.put(key, req.body, { httpMetadata: { contentType: "image/webp", cacheControl: "public, max-age=2592000" } });
    return new Response("ok");
  },
};
