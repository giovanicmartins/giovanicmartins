# Como colocar o Controller no ar

São uns 20 minutos. A Vercel e o banco Neon são grátis. O Mercado Pago cobra uma taxa só sobre cada venda.

## O que tem em cada pasta

| Pasta / arquivo | O que é |
|---|---|
| `index.html` | Página de vendas |
| `obrigado.html` | Página que aparece depois do pagamento |
| `app/` | O app que o cliente usa |
| `admin/` | Sua página para ver e liberar compradores |
| `api/` e `lib/` | O servidor: login, banco de dados, Mercado Pago |
| `img/` | Imagens da página de vendas |

---

## 1. Vercel (onde o site fica)

1. Crie uma conta em **vercel.com**. Entre com o GitHub.
2. Clique em **Add New → Project**, escolha o repositório e clique em **Deploy**.

## 2. Banco de dados (Neon, grátis)

1. No projeto da Vercel, abra a aba **Storage** e clique em **Create Database**.
2. Escolha **Neon (Postgres)**, plano **Free**, e clique em **Connect**.
3. Pronto! A variável `DATABASE_URL` é criada sozinha, e as tabelas também.

## 3. Mercado Pago (liberação automática)

1. Entre em **mercadopago.com.br/developers** e clique em **Suas integrações → Criar aplicação**.
   - Tipo de pagamento: **Pagamentos online**
   - Produto: **Checkout Pro**
2. Abra **Credenciais de produção** e copie o **Access Token** (começa com `APP_USR-`).
3. No menu **Webhooks**:
   - **URL de produção:** `https://SEU-SITE.vercel.app/api/mercadopago`
   - **Eventos:** marque **Pagamentos**
   - Clique em **Salvar** e copie a **Assinatura secreta**.

> 💡 Para testar antes de vender de verdade, use as **credenciais de teste** e um cartão de teste do Mercado Pago.

## 4. Variáveis na Vercel

Abra **Settings → Environment Variables** e adicione:

| Nome | O que colocar |
|---|---|
| `MP_ACCESS_TOKEN` | O Access Token do Mercado Pago |
| `MP_WEBHOOK_SECRET` | A Assinatura secreta do webhook |
| `PRECO` | O preço em reais. Exemplo: `97` ou `147,90` |
| `SESSION_SECRET` | Uma frase longa e aleatória, com no mínimo 16 caracteres |
| `ADMIN_PASSWORD` | A senha da sua página de administração |
| `SUPORTE_EMAIL` | O seu e-mail de suporte |
| `SITE_URL` | (opcional) O endereço do site. Exemplo: `https://lucroclaro.com.br` |
| `RESEND_API_KEY` | Chave do Resend, para enviar o e-mail de "Esqueci minha senha" (veja abaixo) |
| `EMAIL_REMETENTE` | Quem envia o e-mail. Exemplo: `Controller <nao-responda@seusite.com.br>` |

Depois abra **Deployments → ⋯ → Redeploy**.

### E-mail de "Esqueci minha senha" (Resend, grátis)

1. Crie uma conta em **resend.com**.
2. Em **Domains**, adicione o domínio do seu site e siga os passos.
3. Em **API Keys**, crie uma chave e coloque em `RESEND_API_KEY` na Vercel.

Segurança do login: depois de 5 senhas erradas, o e-mail fica bloqueado por 15 minutos. Gerar nova senha no `/admin` desbloqueia na hora.

⚠️ Nunca coloque o Access Token nem a Assinatura secreta dentro do código ou no GitHub. Eles ficam **só** nas variáveis da Vercel.

---

## Como funciona a venda

1. O cliente clica em **Comprar**, digita o e-mail e paga no Mercado Pago (Pix, cartão ou boleto).
2. O Mercado Pago avisa o seu site. O site confere a assinatura e consulta o pagamento.
3. Pagamento **aprovado** → o e-mail é liberado na hora.
4. O cliente vê a página de obrigado e cria a conta com o mesmo e-mail.
5. **Reembolso** ou **estorno** → o acesso é removido sozinho.

Em `/admin` você vê todos os compradores e se cada um entrou pelo 💳 Mercado Pago ou foi liberado à mão. Lá você também pode:
- liberar alguém à mão (por exemplo, uma venda por fora);
- remover um acesso;
- gerar uma nova senha.

## Endereços

| Endereço | Para quê |
|---|---|
| `/` | Página de vendas |
| `/app` | App do cliente |
| `/app/?demo=1` | Demonstração grátis |
| `/admin` | Sua administração |

## Testar no seu computador (opcional)

```bash
npm install
npm run dev
```

Abra `http://localhost:3000`. A senha do admin local é `admin-local`.
