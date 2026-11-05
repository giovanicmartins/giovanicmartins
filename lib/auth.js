import crypto from "node:crypto";
import { q } from "./db.js";
import { cookie } from "./http.js";

const NOME = "gnc_sessao";
const DIAS = 30;

function segredo() {
  const s = process.env.SESSION_SECRET;
  if (s && s.length >= 16) return s;
  if (process.env.VERCEL) throw new Error("Defina SESSION_SECRET (mínimo 16 caracteres) na Vercel.");
  return "segredo-apenas-para-teste-local";
}

export const normEmail = (e) => String(e || "").trim().toLowerCase();
export const emailValido = (e) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e) && e.length <= 200;

export function hashSenha(senha) {
  const sal = crypto.randomBytes(16).toString("hex");
  const h = crypto.scryptSync(String(senha), sal, 64).toString("hex");
  return `${sal}:${h}`;
}
export function conferirSenha(senha, guardado) {
  const [sal, h] = String(guardado).split(":");
  if (!sal || !h) return false;
  const teste = crypto.scryptSync(String(senha), sal, 64);
  const real = Buffer.from(h, "hex");
  return real.length === teste.length && crypto.timingSafeEqual(real, teste);
}

const b64 = (s) => Buffer.from(s).toString("base64url");
const assinar = (txt) => crypto.createHmac("sha256", segredo()).update(txt).digest("base64url");

export function cookieSessao(req, uid) {
  const corpo = b64(JSON.stringify({ uid, exp: Date.now() + DIAS * 864e5 }));
  const token = `${corpo}.${assinar(corpo)}`;
  return `${NOME}=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${DIAS * 86400}${seguro(req)}`;
}
export function cookieSair(req) {
  return `${NOME}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0${seguro(req)}`;
}
function seguro(req) {
  return process.env.VERCEL || req.headers["x-forwarded-proto"] === "https" ? "; Secure" : "";
}

function lerToken(token) {
  if (!token || !token.includes(".")) return null;
  const [corpo, ass] = token.split(".");
  const esperado = assinar(corpo);
  if (ass.length !== esperado.length || !crypto.timingSafeEqual(Buffer.from(ass), Buffer.from(esperado))) return null;
  try {
    const d = JSON.parse(Buffer.from(corpo, "base64url").toString());
    return d.exp > Date.now() ? d : null;
  } catch { return null; }
}

export async function temCompra(email) {
  const r = await q("select 1 from compradores where email = $1", [normEmail(email)]);
  return r.length > 0;
}

// Retorna o usuário logado e com compra ativa; senão lança erro 401/403
export async function exigirUsuario(req) {
  const d = lerToken(cookie(req, NOME));
  if (!d) { const e = new Error("Faça login."); e.status = 401; throw e; }
  const r = await q("select id, email from usuarios where id = $1", [d.uid]);
  if (!r.length) { const e = new Error("Faça login."); e.status = 401; throw e; }
  if (!(await temCompra(r[0].email))) { const e = new Error("sem_acesso"); e.status = 403; throw e; }
  return r[0];
}

export function exigirAdmin(req) {
  const chave = process.env.ADMIN_PASSWORD || (process.env.VERCEL ? "" : "admin-local");
  const enviada = String(req.headers["x-admin-key"] || "");
  const a = crypto.createHash("sha256").update(enviada).digest();
  const b = crypto.createHash("sha256").update(chave).digest();
  if (!chave || !crypto.timingSafeEqual(a, b)) { const e = new Error("Senha de administrador incorreta."); e.status = 401; throw e; }
}
