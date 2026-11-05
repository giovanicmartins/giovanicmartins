# Como colocar o Grana no Controle no ar (Vercel)

Leva uns 15 minutos. Tudo cabe no plano grátis.

## O que tem em cada pasta

| Pasta / arquivo | O que é |
|---|---|
| `index.html` | Site de vendas |
| `app/` | O app que o cliente usa |
| `admin/` | Sua página para liberar quem comprou |
| `api/` e `lib/` | O "servidor": login, banco de dados e salvamento |
| `dev-server.mjs` | Para testar no seu computador (opcional) |

---

## 1. Subir o projeto na Vercel

1. Crie uma conta em **vercel.com**. Entre com o GitHub.
2. Clique em **Add New → Project** e escolha o repositório `giovanicmartins`.
3. Clique em **Deploy**. Não precisa mudar nenhuma configuração.

## 2. Criar o banco de dados (grátis)

1. No projeto da Vercel, abra a aba **Storage** e clique em **Create Database**.
2. Escolha **Neon (Postgres)**, plano **Free**, e clique em **Connect**.
3. Pronto! A Vercel cria sozinha a variável `DATABASE_URL`. As tabelas também são criadas sozinhas no primeiro acesso.

## 3. Configurar as variáveis

Abra **Settings → Environment Variables** e adicione:

| Nome | O que colocar |
|---|---|
| `SESSION_SECRET` | Uma frase longa e aleatória, com no mínimo 16 caracteres. Exemplo: `minha-frase-secreta-grana-2026-xyz` |
| `ADMIN_PASSWORD` | A senha da sua página de administração |
| `LINK_COMPRA` | O link do seu checkout (Kiwify, Hotmart, Mercado Pago...) |
| `SUPORTE_EMAIL` | O seu e-mail de suporte. Ele aparece na opção "esqueci a senha" |

Depois abra **Deployments → ⋯ → Redeploy** para as variáveis passarem a valer.

No `index.html`, troque também `SEU-LINK-DE-PAGAMENTO-AQUI` pelo link do checkout.

## 4. Liberar cada cliente que comprou

1. Abra `https://SEU-SITE.vercel.app/admin`.
2. Entre com a sua `ADMIN_PASSWORD`.
3. Digite o e-mail do comprador e clique em **Liberar acesso**.

Depois disso, o cliente abre `/app`, clica em **"Primeiro acesso? Criar conta"** e usa o mesmo e-mail da compra.

- **Esqueceu a senha?** Na página admin, clique em **Nova senha** e envie a senha gerada para o cliente.
- **Pediu reembolso?** Clique em **Remover** e o acesso é cortado na hora.

---

## Endereços

| Endereço | Para quê |
|---|---|
| `/` | Site de vendas |
| `/app` | App do cliente (com login) |
| `/app/?demo=1` | Demonstração grátis, sem login |
| `/admin` | Sua administração |

## Testar no seu computador (opcional)

Precisa ter o Node.js instalado.

```bash
npm install
npm run dev
```

Abra `http://localhost:3000`. A senha do admin local é `admin-local`.
