export function enviar(res, status, corpo, headers = {}) {
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.setHeader("Cache-Control", "no-store");
  for (const [k, v] of Object.entries(headers)) res.setHeader(k, v);
  res.end(JSON.stringify(corpo));
}

const LIMITE = 4 * 1024 * 1024; // 4 MB

export async function lerJson(req) {
  if (!/application\/json/i.test(req.headers["content-type"] || "")) {
    const e = new Error("Envie os dados em JSON."); e.status = 415; throw e;
  }
  if (req.body !== undefined) {
    return typeof req.body === "string" ? JSON.parse(req.body || "{}") : req.body || {};
  }
  let tam = 0; const partes = [];
  for await (const p of req) {
    tam += p.length;
    if (tam > LIMITE) { const e = new Error("Dados grandes demais."); e.status = 413; throw e; }
    partes.push(p);
  }
  const txt = Buffer.concat(partes).toString("utf8");
  try { return txt ? JSON.parse(txt) : {}; } catch { const e = new Error("JSON inválido."); e.status = 400; throw e; }
}

export function cookie(req, nome) {
  const m = (req.headers.cookie || "").split(/;\s*/).find((c) => c.startsWith(nome + "="));
  return m ? decodeURIComponent(m.slice(nome.length + 1)) : null;
}

// Envolve cada rota: só aceita os métodos indicados e trata erros
export function rota(metodos, fn) {
  return async (req, res) => {
    if (!metodos.includes(req.method)) return enviar(res, 405, { erro: "Método não permitido." });
    try {
      await fn(req, res);
    } catch (e) {
      if (e.status) return enviar(res, e.status, { erro: e.message });
      console.error(e);
      enviar(res, 500, { erro: "Erro no servidor. Tente de novo em instantes." });
    }
  };
}
