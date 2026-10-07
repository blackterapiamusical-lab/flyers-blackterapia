// Entrega as imagens dos flyers: /img/<chave>
// Cada upload ganha uma chave nova, então a imagem pode ficar em cache "para sempre".
import { getStore } from "@netlify/blobs";

export default async (req, context) => {
  const chave = String(context.params?.chave || "");
  if (!/^[a-f0-9]{32}$/.test(chave)) return new Response("Não encontrado", { status: 404 });
  const r = await getStore({ name: "flyers" }).getWithMetadata("img/" + chave, { type: "arrayBuffer" });
  if (!r) return new Response("Não encontrado", { status: 404 });
  return new Response(r.data, {
    headers: {
      "content-type": r.metadata?.tipo || "image/jpeg",
      "cache-control": "public, max-age=31536000, immutable",
    },
  });
};

export const config = { path: "/img/:chave" };
