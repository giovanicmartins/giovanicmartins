import { q } from "../lib/db.js";
import { enviar, lerJson, rota } from "../lib/http.js";
import { normEmail, conferirSenha, cookieSessao, temCompra } from "../lib/auth.js";
import { ipDe, conferirBloqueio, registrarFalha, limparFalhas, LIMITE_EMAIL } from "../lib/bloqueio.js";
import { enviarLinkSenha } from "../lib/senha.js";

export default rota(["POST"], async (req, res) => {
  const { email: e, senha } = await lerJson(req);
  const email = normEmail(e);
  const ip = ipDe(req);
  await conferirBloqueio(email, ip); // 429 se errou senha demais
  const r = await q("select id, senha from usuarios where email = $1", [email]);
  if (!r.length || !conferirSenha(senha || "", r[0].senha)) {
    const erros = await registrarFalha(email, ip);
    // Avisa o cliente por e-mail sempre que a conta é bloqueada
    if (r.length && erros === LIMITE_EMAIL) await enviarLinkSenha(req, r[0].id, email, "bloqueio").catch((err) => console.error(err));
    await new Promise((ok) => setTimeout(ok, 400)); // atrasa tentativas erradas
    return enviar(res, 401, { erro: "E-mail ou senha incorretos." });
  }
  await limparFalhas(email);
  const headers = { "Set-Cookie": cookieSessao(req, r[0].id) };
  if (!(await temCompra(email))) return enviar(res, 403, { erro: "sem_acesso", email }, headers);
  enviar(res, 200, { email }, headers);
});
