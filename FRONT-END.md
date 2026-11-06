# Controller — alterações visuais

Branch: `codex/front-codex`, criada a partir do código do PR #1.

## O que mudou

- Página de vendas com cabeçalho claro, destaque azul e textos mais diretos.
- Link “Entrar” disponível também no celular.
- Painel com cartões, tabelas, filtros e espaçamentos padronizados.
- Navegação na parte inferior do celular e correção do botão “Sair”, que ficava escondido.
- Formulários com áreas maiores para toque, indicação de foco pelo teclado e fontes de 16 px no celular para evitar zoom automático dos campos.
- Preferência por movimento reduzido respeitada nas transições.

## Onde editar o visual

- `assets/site.css`: página de vendas.
- `assets/app.css`: aplicativo e telas de entrada/cadastro.
- `index.html` e `app/index.html`: textos e estrutura das telas.

As regras novas de CSS complementam os estilos originais. Os identificadores dos controles e as integrações existentes foram preservados.

## Verificação realizada

- Navegação pelas sete telas da demonstração em 320, 768 e 1440 px, sem transbordamento horizontal da página. Conferência adicional de telas em 390 px.
- Inspeção visual da página de vendas em 320 e 390 px.
- Abertura e fechamento do formulário de compra, sem efetuar pagamento.
- Inspeção visual da entrada e do cadastro com o servidor local existente, sem criar conta.
- Abertura do formulário de lançamento em 320 px, sem salvar dados.
- Console sem erros durante a navegação final no aplicativo com o servidor local.
- `git diff --check` sem erros.

Nenhuma alteração de autoria do Codex em `api/`, `lib/`, pagamentos ou servidor. As versões mais recentes desses arquivos foram incorporadas da branch do Claude. O front-end do aplicativo está em `app/app.js`, `app/chaves.js` e `app/senha.js`.

## Como ver no computador

1. Abra a pasta do projeto no terminal.
2. Execute `npm ci` e depois `npm run dev`.
3. Acesse `http://localhost:3000` para a página de vendas.
4. Acesse `http://localhost:3000/app/?demo=1` para a demonstração.

O PR de front-end deve ser comparado com a branch do PR #1 para mostrar apenas estas alterações visuais.

## Chaves de integração

No app, abra **Cadastros → Chaves de integração**.

1. Digite um nome (por exemplo, “Minha loja”) e clique em **Criar nova chave**.
2. Use **Copiar chave** e guarde em um local seguro.
3. Clique em **Já guardei a chave**. A chave completa não aparece novamente; a lista exibe apenas os quatro caracteres finais e a data de criação.
4. Para revogar o acesso, clique em **Apagar** e confirme. O sistema conectado deixa de ter acesso imediatamente.

A tela usa `GET`, `POST` e `DELETE /api/chaves`, já disponíveis no back-end do PR #1. O limite de dez chaves é explicado na tela. Na demonstração, as operações de chaves ficam desativadas para não criar credenciais reais.

A interface está em `app/chaves.js`, com estilos em `assets/app.css`. O segredo fica apenas no aviso temporário; não é salvo em localStorage nem sessionStorage. Se a cópia automática não estiver disponível, a interface seleciona o texto para cópia manual.

Validação desta tela: dez testes de interface, criação/cópia/exclusão contra a API original em ambiente local descartável, sem alterações no back-end, e conferência visual no computador e celular.

## Recuperação de senha

- Na tela de entrada, clique em **Esqueci a senha**, informe o e-mail e use **Enviar link por e-mail**.
- O link recebido abre `/app/?redefinir=TOKEN`. A tela **Criar nova senha** pede uma senha de pelo menos seis caracteres e a confirmação.
- O ícone de olho permite mostrar ou ocultar cada senha. Os campos começam ocultos; o botão também está disponível na entrada, cadastro e admin.
- Depois da troca, use **Entrar com a nova senha**. O token sai da URL após o sucesso.
- Links vencidos, usados ou incompletos oferecem **Pedir novo link**. Falhas de conexão e mensagens de bloqueio aparecem na própria tela.

As duas telas usam `POST /api/senha` com as ações `pedir` e `trocar`, conforme `BACK-END-PARA-O-FRONT.md`. Senhas e tokens não são gravados no armazenamento do navegador. A mensagem do pedido de recuperação permanece genérica, como fornecida pela API.

## Logo

A logo original do PR #3 está em `img/logo.svg`, sem alterações no desenho. Ela aparece ao lado de Controller com 36 px de altura no site, entrada do app, menu do app, cabeçalho móvel e admin. Também é usada como favicon.

## Rodar os testes

O `jsdom` agora está nas dependências de desenvolvimento, compatível com Node 20. Para instalar e rodar:

```sh
npm ci
npm run test:ui
npm test
```

- `npm run test:ui`: testes das chaves e das telas de senha.
- `npm test`: testes originais do back-end do Claude, sem alterações.

Verificação desta atualização: instalação limpa com `npm ci`, 25 testes de interface e 50 verificações do back-end aprovados, mais inspeção das telas e da logo no navegador. O envio de e-mail em produção depende da configuração de e-mail descrita pelo Claude; os testes usam ambiente local.

## Integrações bancárias — preparação

Em **Cadastros → Integrações bancárias**, escolha Itaú, Sicredi, Sicoob, Bradesco, Inter ou Nubank. Use **Preparar configuração** para vincular uma conta corrente cadastrada. Todas as conexões continuam pendentes; a tela ainda não emite boletos nem confirma recebimentos.

O botão **Solicitar outro banco** salva o interesse na conta, com data e observação opcional. O formulário informa que isso ainda não envia um pedido à equipe. Os detalhes de implementação e o trabalho necessário no back-end estão em `BANCOS-PARA-O-BACK.md`.

A interface está em `app/bancos.js`; o salvamento usa o mecanismo existente do app. Não há campos de credenciais bancárias. Os testes ficam em `testes/bancos-ui.test.mjs` e fazem parte de `npm run test:ui`.
