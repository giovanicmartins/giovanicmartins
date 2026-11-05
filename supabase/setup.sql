-- ===== Grana no Controle — configuração do banco (cole tudo no SQL Editor do Supabase e clique em RUN) =====

-- 1) Lista de quem comprou. Só e-mails desta tabela conseguem usar o app.
create table if not exists public.compradores (
  email text primary key,
  criado_em timestamptz not null default now()
);
alter table public.compradores enable row level security;
-- (sem políticas: ninguém consegue ler ou mudar essa tabela pelo app, só você pelo painel do Supabase)

-- 2) Função que responde "este usuário comprou?"
create or replace function public.tem_acesso()
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (
    select 1 from public.compradores
    where lower(email) = lower(coalesce(auth.jwt() ->> 'email', ''))
  );
$$;
revoke all on function public.tem_acesso() from public, anon;
grant execute on function public.tem_acesso() to authenticated;

-- 3) Dados de cada usuário (lançamentos, categorias e metas)
create table if not exists public.dados (
  user_id uuid primary key default auth.uid() references auth.users(id) on delete cascade,
  conteudo jsonb not null,
  atualizado_em timestamptz not null default now()
);
alter table public.dados enable row level security;

drop policy if exists "ler os proprios dados" on public.dados;
drop policy if exists "criar os proprios dados" on public.dados;
drop policy if exists "atualizar os proprios dados" on public.dados;

create policy "ler os proprios dados" on public.dados
  for select to authenticated using (user_id = auth.uid() and public.tem_acesso());
create policy "criar os proprios dados" on public.dados
  for insert to authenticated with check (user_id = auth.uid() and public.tem_acesso());
create policy "atualizar os proprios dados" on public.dados
  for update to authenticated using (user_id = auth.uid() and public.tem_acesso())
  with check (user_id = auth.uid() and public.tem_acesso());

-- 4) Para liberar um comprador, rode (trocando o e-mail):
-- insert into public.compradores (email) values ('cliente@exemplo.com');
