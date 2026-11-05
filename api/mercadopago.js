import { enviar, rota } from "../lib/http.js";
import { assinaturaValida, buscarPagamento, processarPagamento } from "../lib/mp.js";

// Recebe os avisos do Mercado Pago. Só confia no aviso se a assinatura bater,
// e mesmo assim consulta o pagamento direto na API antes de liberar o acesso.
export default rota(["POST"], async (req, res) => {
  const url = new URL(req.url, "http://x");
  let corpo = req.body;
  if (corpo === undefined) {
    const partes = [];
    for await (const p of req) partes.push(p);
    try { corpo = JSON.parse(Buffer.concat(partes).toString("utf8") || "{}"); } catch { corpo = {}; }
  } else if (typeof corpo === "string") {
    try { corpo = JSON.parse(corpo || "{}"); } catch { corpo = {}; }
  }
  corpo = corpo || {};
  const tipo = corpo.type || url.searchParams.get("type") || url.searchParams.get("topic");
  const dataId = url.searchParams.get("data.id") || (corpo.data && corpo.data.id);

  if (!assinaturaValida(req, dataId)) return enviar(res, 401, { erro: "Assinatura inválida." });
  if (tipo !== "payment") return enviar(res, 200, { ok: true, ignorado: tipo || "sem tipo" });

  const pg = await buscarPagamento(dataId);
  if (!pg) return enviar(res, 200, { ok: true, resultado: "pagamento não encontrado" }); // ex.: teste do painel
  const resultado = await processarPagamento(pg);
  enviar(res, 200, { ok: true, resultado });
});
