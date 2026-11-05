import { q } from "../lib/db.js";
import { enviar, lerJson, rota } from "../lib/http.js";
import { normEmail, conferirSenha, cookieSessao, temCompra } from "../lib/auth.js";

export default rota(["POST"], async (req, res) => {
  const { email: e, senha } = await lerJson(req);
  const email = normEmail(e);
  const r = await q("select id, senha from usuarios where email = $1", [email]);
  if (!r.length || !conferirSenha(senha || "", r[0].senha)) {
    await new Promise((ok) => setTimeout(ok, 400)); // atrasa tentativas erradas
    return enviar(res, 401, { erro: "E-mail ou senha incorretos." });
  }
  const headers = { "Set-Cookie": cookieSessao(req, r[0].id) };
  if (!(await temCompra(email))) return enviar(res, 403, { erro: "sem_acesso", email }, headers);
  enviar(res, 200, { email }, headers);
});
