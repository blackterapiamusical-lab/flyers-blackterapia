// API dos flyers — Rádio Blackterapia
// GET  /api/flyers          → flyers visíveis hoje (público, usado pelo slider)
// GET  /api/flyers?todos=1  → todos os flyers (exige senha, usado pelo painel)
// POST /api/flyers          → { acao: "entrar" | "criar" | "editar" | "apagar" | "ordenar", ... } (exige senha)
import { getStore } from "@netlify/blobs";
import { createHash, timingSafeEqual } from "node:crypto";

const MAX_IMG = 3 * 1024 * 1024; // 3 MB por imagem (o painel já comprime antes de enviar)
const FUSO = -3;                 // horário de Brasília, para decidir se o flyer já começou/venceu

const loja = () => getStore({ name: "flyers", consistency: "strong" });

const resposta = (data, status = 200, headers = {}) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store", ...headers },
  });

const hoje = () => new Date(Date.now() + FUSO * 3600e3).toISOString().slice(0, 10);

function autorizado(req) {
  const senha = (globalThis.Netlify?.env.get("ADMIN_SENHA") ?? process.env.ADMIN_SENHA) || "";
  if (!senha) return false;
  const enviada = req.headers.get("x-senha") || "";
  const h = (s) => createHash("sha256").update(s).digest();
  return timingSafeEqual(h(senha), h(enviada));
}

class Erro extends Error {}

const lerLista = async (s) => (await s.get("lista", { type: "json" })) || [];
const salvarLista = (s, lista) => s.setJSON("lista", lista);

const texto = (v, max = 120) => String(v ?? "").trim().slice(0, max);
const data = (v) => (/^\d{4}-\d{2}-\d{2}$/.test(v || "") ? v : "");
const link = (v) => { v = texto(v, 500); return /^https?:\/\//i.test(v) ? v : ""; };
const num = (v) => (Number.isFinite(+v) && +v > 0 ? Math.round(+v) : 0);

function campos(b) {
  const c = {
    titulo: texto(b.titulo),
    programa: texto(b.programa, 60),
    link: link(b.link),
    inicio: data(b.inicio),
    fim: data(b.fim),
    ativo: b.ativo !== false,
  };
  if (c.inicio && c.fim && c.fim < c.inicio) throw new Erro("A data de término vem antes da data de início.");
  return c;
}

async function guardarImagem(s, dataUrl) {
  const m = /^data:(image\/(?:jpeg|png|webp|gif));base64,([A-Za-z0-9+/=]+)$/.exec(dataUrl || "");
  if (!m) throw new Erro("Imagem inválida. Envie um arquivo JPG, PNG, WEBP ou GIF.");
  const buf = Buffer.from(m[2], "base64");
  if (buf.length > MAX_IMG) throw new Erro("Imagem grande demais. O limite é 3 MB.");
  const chave = crypto.randomUUID().replace(/-/g, "");
  await s.set("img/" + chave, new Blob([buf], { type: m[1] }), { metadata: { tipo: m[1] } });
  return chave;
}

export default async (req) => {
  const s = loja();

  if (req.method === "GET") {
    const lista = await lerLista(s);
    if (new URL(req.url).searchParams.has("todos")) {
      if (!autorizado(req)) return resposta({ erro: "Senha incorreta." }, 401);
      return resposta({ flyers: lista, hoje: hoje() });
    }
    const d = hoje();
    const visiveis = lista
      .filter((f) => f.ativo && (!f.inicio || f.inicio <= d) && (!f.fim || f.fim >= d))
      .map(({ id, titulo, programa, link, img, w, h }) => ({ id, titulo, programa, link, img, w, h }));
    return resposta({ flyers: visiveis }, 200, { "cache-control": "public, max-age=60" });
  }

  if (req.method !== "POST") return resposta({ erro: "Método não permitido." }, 405);
  if (!autorizado(req)) return resposta({ erro: "Senha incorreta." }, 401);

  let b;
  try { b = await req.json(); } catch { return resposta({ erro: "Pedido inválido." }, 400); }

  try {
    const lista = await lerLista(s);
    const achar = () => {
      const i = lista.findIndex((f) => f.id === b.id);
      if (i < 0) throw new Erro("Esse flyer não existe mais. Recarregue a página.");
      return i;
    };

    switch (b.acao) {
      case "entrar":
        return resposta({ ok: true });

      case "criar": {
        const c = campos(b);
        const img = await guardarImagem(s, b.imagem);
        const f = { id: crypto.randomUUID(), ...c, img, w: num(b.w), h: num(b.h), criado: new Date().toISOString() };
        lista.unshift(f);
        await salvarLista(s, lista);
        return resposta({ flyer: f });
      }

      case "editar": {
        const i = achar();
        const f = { ...lista[i], ...campos(b), editado: new Date().toISOString() };
        if (b.imagem) {
          const antiga = f.img;
          f.img = await guardarImagem(s, b.imagem);
          f.w = num(b.w); f.h = num(b.h);
          await s.delete("img/" + antiga);
        }
        lista[i] = f;
        await salvarLista(s, lista);
        return resposta({ flyer: f });
      }

      case "apagar": {
        const i = achar();
        const [f] = lista.splice(i, 1);
        await salvarLista(s, lista);
        await s.delete("img/" + f.img);
        return resposta({ ok: true });
      }

      case "ordenar": {
        const ids = Array.isArray(b.ids) ? b.ids : [];
        const pos = new Map(ids.map((id, i) => [id, i]));
        lista.sort((a, c) => (pos.get(a.id) ?? 1e9) - (pos.get(c.id) ?? 1e9));
        await salvarLista(s, lista);
        return resposta({ ok: true });
      }

      default:
        return resposta({ erro: "Ação desconhecida." }, 400);
    }
  } catch (e) {
    if (e instanceof Erro) return resposta({ erro: e.message }, 400);
    console.error(e);
    return resposta({ erro: "Erro no servidor. Tente de novo em instantes." }, 500);
  }
};

export const config = { path: "/api/flyers" };
