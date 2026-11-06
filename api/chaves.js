import crypto from "node:crypto";
import { q } from "../lib/db.js";
import { enviar, lerJson, rota } from "../lib/http.js";
import { exigirUsuario, hashChave, novaChave } from "../lib/auth.js";

// Gerencia as chaves de integração do cliente logado.
// GET: lista | POST { nome }: cria (a chave aparece só uma vez) | DELETE { id }: apaga
export default rota(["GET", "POST", "DELETE"], async (req, res) => {
  const u = await exigirUsuario(req);
  if (req.method === "GET") {
    const r = await q("select id, nome, final, criado_em, usado_em from chaves where user_id = $1 order by criado_em desc", [u.id]);
    return enviar(res, 200, { chaves: r });
  }
  const corpo = await lerJson(req);
  if (req.method === "DELETE") {
    const r = await q("delete from chaves where id = $1 and user_id = $2 returning id", [String(corpo.id || ""), u.id]);
    if (!r.length) return enviar(res, 404, { erro: "Chave não encontrada." });
    return enviar(res, 200, { ok: true });
  }
  const nome = String(corpo.nome || "").trim().slice(0, 60) || "Integração";
  const total = await q("select count(*)::int as n from chaves where user_id = $1", [u.id]);
  if (total[0].n >= 10) return enviar(res, 400, { erro: "Limite de 10 chaves. Apague uma antes." });
  const chave = novaChave();
  const id = crypto.randomUUID();
  await q("insert into chaves (id, user_id, nome, hash, final) values ($1, $2, $3, $4, $5)", [id, u.id, nome, hashChave(chave), chave.slice(-4)]);
  enviar(res, 200, { id, nome, chave, aviso: "Guarde esta chave agora. Ela não aparece de novo." });
});
