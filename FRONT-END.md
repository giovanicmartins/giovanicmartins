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

Nenhuma mudança em `api/`, `lib/`, `app/app.js`, pagamentos, servidor ou dependências. Login e pagamentos reais não foram testados neste trabalho visual.

## Como ver no computador

1. Abra a pasta do projeto no terminal.
2. Execute `npm ci` e depois `npm run dev`.
3. Acesse `http://localhost:3000` para a página de vendas.
4. Acesse `http://localhost:3000/app/?demo=1` para a demonstração.

O PR de front-end deve ser comparado com a branch do PR #1 para mostrar apenas estas alterações visuais.
