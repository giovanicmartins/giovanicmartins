# Como colocar o Grana no Controle no ar

São 4 partes. Leva uns 20 minutos. Tudo de graça.

## O que tem em cada pasta

| Pasta / arquivo | O que é |
|---|---|
| `index.html` | Site de vendas |
| `app/` | O app que o cliente usa (a planilha online) |
| `app/config.js` | Onde você cola os dados do Supabase e o link de pagamento |
| `supabase/setup.sql` | Cria o banco de dados (você só copia e cola) |

---

## 1. Criar o banco de dados (Supabase)

1. Crie uma conta em **supabase.com** e clique em **New project**.
2. No menu da esquerda, abra **SQL Editor**. Cole todo o conteúdo do arquivo `supabase/setup.sql` e clique em **Run**.
3. Vá em **Project Settings → API** e copie:
   - **Project URL**
   - **anon public key**
4. Abra `app/config.js` e cole esses dois dados nos lugares indicados.

## 2. Colocar o link de pagamento

Crie seu produto na Kiwify, na Hotmart ou no Mercado Pago. Depois cole o link do checkout em:
- `app/config.js` → `LINK_COMPRA`
- `index.html` → procure `SEU-LINK-DE-PAGAMENTO-AQUI`

## 3. Publicar (Netlify)

1. Entre em **app.netlify.com** e escolha **Add new site → Deploy manually**.
2. Arraste a pasta inteira do projeto.
3. O site de vendas fica no endereço principal. O app fica em `/app/`.
4. No Supabase, vá em **Authentication → URL Configuration** e coloque o endereço do app, por exemplo `https://seusite.netlify.app/app/`, em **Site URL** e em **Redirect URLs**. Isso faz os links de confirmação de e-mail e de troca de senha funcionarem.

## 4. Liberar cada cliente que comprou

Quando alguém comprar, entre no Supabase, abra **SQL Editor** e rode o comando abaixo, trocando pelo e-mail do cliente:

```sql
insert into public.compradores (email) values ('cliente@exemplo.com');
```

Também dá para fazer sem código: abra **Table Editor → compradores → Insert row**.

Depois disso, o cliente entra no app, clica em **"Primeiro acesso? Criar conta"** e usa o **mesmo e-mail da compra**.

> 💡 Dá para automatizar essa liberação, para que ela aconteça sozinha quando o pagamento for aprovado. É só pedir que eu configuro.

---

**Demonstração grátis:** o endereço `/app/?demo=1` abre o app com dados de exemplo e sem login. É ótimo para colocar no site de vendas.
