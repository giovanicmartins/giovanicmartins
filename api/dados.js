import { q } from "../lib/db.js";
import { enviar, lerJson, rota } from "../lib/http.js";
import { exigirUsuario } from "../lib/auth.js";

export default rota(["GET", "PUT"], async (req, res) => {
  const u = await exigirUsuario(req);
  if (req.method === "GET") {
    const r = await q("select conteudo, versao from dados where user_id = $1", [u.id]);
    return enviar(res, 200, r.length ? r[0] : { conteudo: null, versao: 0 });
  }
  const { conteudo, versao } = await lerJson(req);
  if (!conteudo || typeof conteudo !== "object" || Array.isArray(conteudo)) return enviar(res, 400, { erro: "Dados inválidos." });
  if (versao && !(Number.isInteger(versao) && versao > 0)) return enviar(res, 400, { erro: "Versão inválida." });
  const json = JSON.stringify(conteudo);
  if (json.length > 4 * 1024 * 1024) return enviar(res, 413, { erro: "Dados grandes demais." });
  let r;
  if (!versao) {
    r = await q("insert into dados (user_id, conteudo, versao) values ($1, $2::jsonb, 1) on conflict (user_id) do nothing returning versao", [u.id, json]);
  } else {
    r = await q("update dados set conteudo = $2::jsonb, versao = versao + 1, atualizado_em = now() where user_id = $1 and versao = $3 returning versao", [u.id, json, versao]);
  }
  if (!r.length) return enviar(res, 409, { erro: "conflito" });
  enviar(res, 200, { versao: r[0].versao });
});
