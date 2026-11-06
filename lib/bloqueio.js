// Bloqueia o login depois de muitas senhas erradas.
// Por e-mail: 5 erros em 15 minutos (tipo "e" = login, "r" = pedidos de nova senha). Por endereço (IP): 20 erros em 15 minutos.
import { q } from "./db.js";

const MINUTOS = 15;
const LIMITE_EMAIL = 5;
const LIMITE_IP = 20;

export function ipDe(req) {
  return String(req.headers["x-forwarded-for"] || req.socket?.remoteAddress || "").split(",")[0].trim() || "?";
}

export async function conferirBloqueio(email, ip, tipo = "e") {
  const r = await q(`select chave, count(*)::int as n from login_falhas
                     where chave = any($1) and criado_em > now() - interval '${MINUTOS} minutes' group by chave`,
    [[tipo + ":" + email, "ip:" + ip]]);
  const n = Object.fromEntries(r.map((x) => [x.chave, x.n]));
  if ((n[tipo + ":" + email] || 0) >= LIMITE_EMAIL || (n["ip:" + ip] || 0) >= LIMITE_IP) {
    const e = new Error(`Muitas tentativas erradas. Espere ${MINUTOS} minutos ou use "Esqueci a senha".`);
    e.status = 429; throw e;
  }
}

export async function registrarFalha(email, ip, tipo = "e") {
  await q("insert into login_falhas (chave) values ($1), ($2)", [tipo + ":" + email, "ip:" + ip]);
  if (Math.random() < 0.05) await q("delete from login_falhas where criado_em < now() - interval '1 day'");
}

export async function limparFalhas(email) {
  await q("delete from login_falhas where chave = $1", ["e:" + email]);
}
