import crypto from "node:crypto";
import { q } from "../lib/db.js";
import { enviar, lerJson, rota } from "../lib/http.js";
import { exigirChave } from "../lib/auth.js";

// API para outros sistemas, usando a chave do cliente.
// GET  /api/integracao?tipo=titulos|contas|plano|filiais|centros|verticais|metas|tudo
// POST /api/integracao  { "titulos": [ { tipo, descricao, valor, venc, ... } ] }  (até 500 por vez)
const LISTAS = ["titulos", "contas", "plano", "filiais", "centros", "verticais", "metas"];
const DATA = /^\d{4}-\d{2}-\d{2}$/;
const txt = (v, max = 200) => String(v ?? "").trim().slice(0, max);

function limparTitulo(t, i, S) {
  const erro = (m) => { const e = new Error(`Título ${i + 1}: ${m}`); e.status = 400; throw e; };
  if (!t || typeof t !== "object") erro("formato inválido.");
  if (!["Receita", "Despesa"].includes(t.tipo)) erro('tipo deve ser "Receita" ou "Despesa".');
  const valor = Math.round(Number(t.valor) * 100) / 100;
  if (!Number.isFinite(valor) || valor <= 0) erro("valor deve ser um número maior que zero.");
  if (!DATA.test(String(t.venc || ""))) erro("venc deve ser uma data AAAA-MM-DD.");
  if (t.pago && !DATA.test(String(t.pago))) erro("pago deve ser vazio ou uma data AAAA-MM-DD.");
  if (!txt(t.descricao)) erro("descricao é obrigatória.");
  const existe = (lista, id) => (id && (S[lista] || []).some((x) => x.id === id) ? id : "");
  return {
    id: crypto.randomUUID().replace(/-/g, "").slice(0, 12),
    tipo: t.tipo, descricao: txt(t.descricao), pessoa: txt(t.pessoa), valor,
    venc: t.venc, pago: t.pago || "",
    contaId: existe("contas", t.contaId) || (S.contas && S.contas[0] ? S.contas[0].id : ""),
    planoId: existe("plano", t.planoId), filialId: existe("filiais", t.filialId),
    centroId: existe("centros", t.centroId), verticalId: existe("verticais", t.verticalId),
    pessoal: Boolean(t.pessoal), forma: txt(t.forma, 40), obs: txt(t.obs, 500) || "Enviado por integração",
    externoId: txt(t.externoId, 100)
  };
}

export default rota(["GET", "POST"], async (req, res) => {
  const u = await exigirChave(req);
  const r = await q("select conteudo, versao from dados where user_id = $1", [u.id]);
  if (!r.length || !r[0].conteudo || !Array.isArray(r[0].conteudo.plano)) return enviar(res, 409, { erro: "Abra o app do Controller uma vez antes de usar a integração." });

  if (req.method === "GET") {
    const tipo = new URL(req.url, "http://x").searchParams.get("tipo") || "titulos";
    const S = r[0].conteudo;
    if (tipo === "tudo") return enviar(res, 200, Object.fromEntries(LISTAS.map((k) => [k, S[k] || []])));
    if (!LISTAS.includes(tipo)) return enviar(res, 400, { erro: "tipo deve ser um destes: " + LISTAS.join(", ") + ", tudo" });
    return enviar(res, 200, { [tipo]: S[tipo] || [] });
  }

  const { titulos } = await lerJson(req);
  if (!Array.isArray(titulos) || !titulos.length) return enviar(res, 400, { erro: 'Envie { "titulos": [ ... ] }.' });
  if (titulos.length > 500) return enviar(res, 400, { erro: "Máximo de 500 títulos por envio." });

  // Tenta algumas vezes caso o app salve ao mesmo tempo
  for (let tentativa = 0; tentativa < 5; tentativa++) {
    const atual = tentativa === 0 ? r[0] : (await q("select conteudo, versao from dados where user_id = $1", [u.id]))[0];
    const S = atual.conteudo;
    const jaTem = new Set((S.titulos || []).map((t) => t.externoId).filter(Boolean));
    const novos = titulos.map((t, i) => limparTitulo(t, i, S));
    const entrar = novos.filter((t) => !t.externoId || !jaTem.has(t.externoId)); // não duplica o mesmo externoId
    if (!entrar.length) return enviar(res, 200, { criados: [], ignorados: novos.length });
    S.titulos = (S.titulos || []).concat(entrar);
    const ok = await q("update dados set conteudo = $2::jsonb, versao = versao + 1, atualizado_em = now() where user_id = $1 and versao = $3 returning versao",
      [u.id, JSON.stringify(S), atual.versao]);
    if (ok.length) return enviar(res, 200, { criados: entrar.map((t) => t.id), ignorados: novos.length - entrar.length });
  }
  enviar(res, 409, { erro: "Os dados estão sendo alterados agora. Tente de novo." });
});
