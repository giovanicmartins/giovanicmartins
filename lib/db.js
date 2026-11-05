// Conexão com o banco. Na Vercel usa o Postgres (Neon); no computador usa um banco local de teste.
const ESQUEMA = [
  `create table if not exists usuarios (
     id text primary key,
     email text unique not null,
     senha text not null,
     criado_em timestamptz not null default now())`,
  `create table if not exists compradores (
     email text primary key,
     criado_em timestamptz not null default now())`,
  `create table if not exists dados (
     user_id text primary key references usuarios(id) on delete cascade,
     conteudo jsonb not null,
     versao integer not null default 1,
     atualizado_em timestamptz not null default now())`,
  `alter table compradores add column if not exists origem text not null default 'manual'`,
  `create table if not exists pagamentos (
     id text primary key,
     email text not null,
     status text not null,
     valor numeric,
     atualizado_em timestamptz not null default now())`
];

let executar = null;
let pronto = null;

async function conectar() {
  if (executar) return executar;
  const url = process.env.DATABASE_URL || process.env.POSTGRES_URL;
  if (url) {
    const { neon } = await import("@neondatabase/serverless");
    const sql = neon(url);
    executar = (texto, params = []) => sql.query(texto, params);
  } else if (globalThis.__bancoLocal) {
    executar = globalThis.__bancoLocal; // definido pelo dev-server.mjs
  } else {
    throw new Error("Banco de dados não configurado: defina DATABASE_URL na Vercel.");
  }
  return executar;
}

export async function q(texto, params) {
  const run = await conectar();
  if (!pronto) pronto = (async () => { for (const s of ESQUEMA) await run(s); })().catch((e) => { pronto = null; throw e; });
  await pronto;
  return run(texto, params);
}
