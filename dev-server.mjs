// Servidor para testar no seu computador:  npm install  e depois  npm run dev
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { PGlite } from "@electric-sql/pglite";

const raiz = path.dirname(new URL(import.meta.url).pathname);
const banco = new PGlite(path.join(raiz, ".dados-local"));
globalThis.__bancoLocal = async (texto, params = []) => (await banco.query(texto, params)).rows;

const TIPOS = { ".html": "text/html; charset=utf-8", ".js": "text/javascript", ".css": "text/css", ".png": "image/png", ".svg": "image/svg+xml", ".md": "text/plain; charset=utf-8" };
const porta = process.env.PORT || 3000;

http.createServer(async (req, res) => {
  const url = new URL(req.url, "http://x");
  if (url.pathname.startsWith("/api/")) {
    const nome = url.pathname.slice(5).replace(/[^a-z]/g, "");
    const arq = path.join(raiz, "api", nome + ".js");
    if (!fs.existsSync(arq)) { res.statusCode = 404; return res.end("{}"); }
    const mod = await import(arq);
    return mod.default(req, res);
  }
  let p = path.normalize(path.join(raiz, decodeURIComponent(url.pathname)));
  if (!p.startsWith(raiz) || p.includes(`${path.sep}lib${path.sep}`) || p.includes("node_modules") || p.includes(".dados-local")) { res.statusCode = 404; return res.end(); }
  if (fs.existsSync(p) && fs.statSync(p).isDirectory()) p = path.join(p, "index.html");
  if (!fs.existsSync(p)) { res.statusCode = 404; return res.end("Não encontrado"); }
  res.setHeader("Content-Type", TIPOS[path.extname(p)] || "application/octet-stream");
  fs.createReadStream(p).pipe(res);
}).listen(porta, () => console.log(`Rodando em http://localhost:${porta}  (admin: /admin  senha: admin-local)`));
