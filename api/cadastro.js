import crypto from "node:crypto";
import { q } from "../lib/db.js";
import { enviar, lerJson, rota } from "../lib/http.js";
import { normEmail, emailValido, hashSenha, cookieSessao, temCompra } from "../lib/auth.js";

export default rota(["POST"], async (req, res) => {
  const { email: e, senha } = await lerJson(req);
  const email = normEmail(e);
  if (!emailValido(email)) return enviar(res, 400, { erro: "Digite um e-mail válido." });
  if (!senha || String(senha).length < 6) return enviar(res, 400, { erro: "A senha precisa ter pelo menos 6 caracteres." });
  if (!(await temCompra(email))) return enviar(res, 403, { erro: "sem_compra" });
  const existe = await q("select 1 from usuarios where email = $1", [email]);
  if (existe.length) return enviar(res, 409, { erro: "Este e-mail já tem conta. Use \"Entrar\"." });
  const id = crypto.randomUUID();
  await q("insert into usuarios (id, email, senha) values ($1, $2, $3)", [id, email, hashSenha(senha)]);
  enviar(res, 200, { email }, { "Set-Cookie": cookieSessao(req, id) });
});
