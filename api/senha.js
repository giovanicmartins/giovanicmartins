import { q } from "../lib/db.js";
import { enviar, lerJson, rota } from "../lib/http.js";
import { normEmail, emailValido, hashSenha } from "../lib/auth.js";
import { enviarLinkSenha, hashToken as hash } from "../lib/senha.js";
import { ipDe, conferirBloqueio, registrarFalha, limparFalhas } from "../lib/bloqueio.js";

// "Esqueci minha senha"
// { acao: "pedir", email }          -> envia um link por e-mail (vale 1 hora)
// { acao: "trocar", token, senha }  -> troca a senha usando o link

export default rota(["POST"], async (req, res) => {
  const corpo = await lerJson(req);

  if (corpo.acao === "pedir") {
    const email = normEmail(corpo.email);
    if (!emailValido(email)) return enviar(res, 400, { erro: "Digite um e-mail válido." });
    await conferirBloqueio(email, ipDe(req), "r"); // no máximo 5 pedidos a cada 15 minutos
    await registrarFalha(email, ipDe(req), "r");
    const u = await q("select id from usuarios where email = $1", [email]);
    if (u.length) await enviarLinkSenha(req, u[0].id, email);
    // Responde igual sempre, para ninguém descobrir quais e-mails têm conta
    return enviar(res, 200, { ok: true, mensagem: "Se este e-mail tiver conta, enviamos um link para criar nova senha." });
  }

  if (corpo.acao === "trocar") {
    const senha = String(corpo.senha || "");
    if (senha.length < 6) return enviar(res, 400, { erro: "A senha precisa ter pelo menos 6 caracteres." });
    const r = await q("delete from redefinir_senha where hash = $1 and expira_em > now() returning user_id", [hash(corpo.token || "")]);
    if (!r.length) return enviar(res, 400, { erro: "Link vencido ou já usado. Peça um novo." });
    const u = await q("update usuarios set senha = $2 where id = $1 returning email", [r[0].user_id, hashSenha(senha)]);
    if (u.length) await limparFalhas(u[0].email);
    return enviar(res, 200, { ok: true, mensagem: "Senha trocada. Agora é só entrar." });
  }

  enviar(res, 400, { erro: "Ação desconhecida." });
});
