// Integração com o Mercado Pago (Checkout Pro + notificações)
import crypto from "node:crypto";
import { q } from "./db.js";
import { normEmail, emailValido } from "./auth.js";

export const MP_API = process.env.MP_API_BASE || "https://api.mercadopago.com";
export const PRODUTO = "lucro-claro";
export const NOME_PRODUTO = "Lucro Claro — acesso ao app";

export function preco() {
  const v = parseFloat(String(process.env.PRECO || "97").replace(",", "."));
  return Number.isFinite(v) && v > 0 ? Math.round(v * 100) / 100 : 97;
}

export function urlSite(req) {
  if (process.env.SITE_URL) return process.env.SITE_URL.replace(/\/+$/, "");
  const proto = req.headers["x-forwarded-proto"] || (process.env.VERCEL ? "https" : "http");
  const host = req.headers["x-forwarded-host"] || req.headers.host;
  return `${proto}://${host}`;
}

function token() {
  const t = process.env.MP_ACCESS_TOKEN;
  if (!t) { const e = new Error("Pagamento ainda não configurado. Fale com o suporte."); e.status = 503; throw e; }
  return t;
}

export async function criarCheckout(req, email) {
  const site = urlSite(req);
  const corpo = {
    items: [{ id: PRODUTO, title: NOME_PRODUTO, quantity: 1, unit_price: preco(), currency_id: "BRL" }],
    payer: { email },
    external_reference: email,
    metadata: { produto: PRODUTO, email },
    notification_url: `${site}/api/mercadopago`,
    back_urls: { success: `${site}/obrigado.html`, pending: `${site}/obrigado.html`, failure: `${site}/#preco` },
    auto_return: "approved",
    statement_descriptor: "LUCROCLARO"
  };
  const r = await fetch(`${MP_API}/checkout/preferences`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token()}`, "Content-Type": "application/json", "X-Idempotency-Key": crypto.randomUUID() },
    body: JSON.stringify(corpo)
  });
  const d = await r.json().catch(() => ({}));
  if (!r.ok || !d.init_point) {
    console.error("Mercado Pago (preferência):", r.status, JSON.stringify(d).slice(0, 500));
    const e = new Error("Não consegui abrir o pagamento agora. Tente de novo em instantes."); e.status = 502; throw e;
  }
  return d.init_point;
}

// Confere a assinatura x-signature: HMAC-SHA256 de "id:{data.id};request-id:{x-request-id};ts:{ts};"
export function assinaturaValida(req, dataId) {
  const segredo = process.env.MP_WEBHOOK_SECRET;
  if (!segredo) { console.error("MP_WEBHOOK_SECRET não configurado — notificação recusada."); return false; }
  const assinatura = String(req.headers["x-signature"] || "");
  const requestId = String(req.headers["x-request-id"] || "");
  const partes = Object.fromEntries(assinatura.split(",").map((p) => p.split("=").map((s) => s.trim())));
  const { ts, v1 } = partes;
  if (!ts || !v1 || !requestId || !dataId) return false;
  const id = /^[a-z0-9]+$/i.test(String(dataId)) ? String(dataId).toLowerCase() : String(dataId);
  const esperado = crypto.createHmac("sha256", segredo).update(`id:${id};request-id:${requestId};ts:${ts};`).digest("hex");
  return esperado.length === v1.length && crypto.timingSafeEqual(Buffer.from(esperado), Buffer.from(v1));
}

export async function buscarPagamento(id) {
  const r = await fetch(`${MP_API}/v1/payments/${encodeURIComponent(id)}`, { headers: { Authorization: `Bearer ${token()}` } });
  if (r.status === 404) return null;
  if (!r.ok) { const e = new Error("Falha ao consultar pagamento no Mercado Pago (" + r.status + ")"); e.status = 502; throw e; }
  return r.json();
}

// Libera (aprovado) ou remove (reembolso/estorno) o acesso. Pode ser chamado várias vezes sem problema.
export async function processarPagamento(pg) {
  const meta = pg.metadata || {};
  if (meta.produto !== PRODUTO) return "outro_produto";
  const email = [pg.external_reference, meta.email, pg.payer && pg.payer.email].map(normEmail).find(emailValido);
  if (!email) return "sem_email";
  await q(`insert into pagamentos (id, email, status, valor, atualizado_em) values ($1, $2, $3, $4, now())
           on conflict (id) do update set status = excluded.status, valor = excluded.valor, atualizado_em = now()`,
    [String(pg.id), email, String(pg.status || ""), pg.transaction_amount || 0]);
  if (pg.status === "approved") {
    await q("insert into compradores (email, origem) values ($1, 'mercadopago') on conflict (email) do nothing", [email]);
    return "liberado";
  }
  if (["refunded", "charged_back"].includes(pg.status)) {
    await q("delete from compradores where email = $1 and origem = 'mercadopago'", [email]);
    return "removido";
  }
  return "aguardando";
}
