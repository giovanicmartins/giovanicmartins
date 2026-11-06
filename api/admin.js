import crypto from "node:crypto";
import { q } from "../lib/db.js";
import { enviar, lerJson, rota } from "../lib/http.js";
import { exigirAdmin, normEmail, emailValido, hashSenha } from "../lib/auth.js";
import { limparFalhas } from "../lib/bloqueio.js";

export default rota(["POST"], async (req, res) => {
  exigirAdmin(req);
  const { acao, email: e } = await lerJson(req);
  const email = normEmail(e);
  if (acao === "listar") {
    const r = await q(`select c.email, c.criado_em, c.origem, (u.id is not null) as tem_conta
                       from compradores c left join usuarios u on u.email = c.email order by c.criado_em desc`);
    return enviar(res, 200, { compradores: r });
  }
  if (!emailValido(email)) return enviar(res, 400, { erro: "E-mail inválido." });
  if (acao === "adicionar") {
    await q("insert into compradores (email) values ($1) on conflict do nothing", [email]);
    return enviar(res, 200, { ok: true });
  }
  if (acao === "remover") {
    await q("delete from compradores where email = $1", [email]);
    return enviar(res, 200, { ok: true });
  }
  if (acao === "resetar") {
    const nova = crypto.randomBytes(5).toString("hex");
    const r = await q("update usuarios set senha = $2 where email = $1 returning id", [email, hashSenha(nova)]);
    if (!r.length) return enviar(res, 404, { erro: "Esse e-mail ainda não criou conta." });
    await limparFalhas(email);
    return enviar(res, 200, { senha: nova });
  }
  enviar(res, 400, { erro: "Ação desconhecida." });
});
