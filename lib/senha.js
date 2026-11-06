// Cria um link de nova senha (vale 1 hora, uso único) e envia por e-mail
import crypto from "node:crypto";
import { q } from "./db.js";
import { enviarEmail } from "./email.js";
import { urlSite } from "./mp.js";

export const hashToken = (t) => crypto.createHash("sha256").update(String(t)).digest("hex");
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));

export async function enviarLinkSenha(req, userId, email, motivo = "pedido") {
  const token = crypto.randomBytes(32).toString("base64url");
  await q("delete from redefinir_senha where user_id = $1 or expira_em < now()", [userId]);
  await q("insert into redefinir_senha (hash, user_id, expira_em) values ($1, $2, now() + interval '1 hour')", [hashToken(token), userId]);
  const link = esc(`${urlSite(req)}/app/?redefinir=${token}`);
  if (motivo === "bloqueio") {
    return enviarEmail(email, "Aviso de segurança - Controller",
      `<p>Olá!</p><p>Alguém errou a senha da sua conta do Controller várias vezes seguidas. Por segurança, o login ficou bloqueado por 15 minutos.</p>
       <p>Se foi você e esqueceu a senha, crie uma nova pelo link abaixo (vale 1 hora):</p>
       <p><a href="${link}">Criar nova senha</a></p>
       <p>Se não foi você, sua conta continua protegida. Recomendamos trocar a senha mesmo assim.</p>`);
  }
  return enviarEmail(email, "Criar nova senha - Controller",
    `<p>Olá!</p><p>Para criar uma nova senha do Controller, clique no link abaixo. Ele vale por 1 hora.</p>
     <p><a href="${link}">Criar nova senha</a></p><p>Se não foi você, ignore este e-mail.</p>`);
}
