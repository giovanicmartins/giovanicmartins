# Controller — integrações bancárias: preparação do front-end

## Estado desta entrega

A tela fica em **Cadastros → Integrações bancárias**. Os bancos iniciais são Itaú, Sicredi, Sicoob, Bradesco, Inter e Nubank.

Não há emissão, envio de boletos ou conciliação bancária nesta entrega. Todos os bancos estão pendentes de implementação e homologação. O usuário informou que ainda não tem acesso à API de cobrança. Não foram criados campos para senhas, certificados, client secret ou tokens, nem alteradas rotas ou tabelas do back-end.

A preparação e os interesses usam o salvamento existente do app em `/api/dados`, isolados por usuário. No modo demonstração usam apenas o armazenamento da demonstração. O indicador de salvamento existente informa se o servidor confirmou os dados.

## Dados de preparação

Em `conteudo.integracoesBancarias`:

```json
[{
  "id": "uuid",
  "banco": "itau",
  "nome": "Itaú · minha empresa",
  "contaId": "id-da-conta-no-controller",
  "status": "aguardando_ativacao",
  "atualizadoEm": "data ISO"
}]
```

A tela atualmente mantém uma preparação por banco. `contaId` referencia uma conta corrente do Controller; não representa consentimento nem acesso ao banco real. Nome e conta podem ser revisados. Nenhum desses campos autoriza uma cobrança ou baixa de título.

Em `conteudo.solicitacoesBancarias`:

```json
[{
  "id": "uuid",
  "banco": "Nome de outro banco",
  "observacao": "O que o cliente precisa",
  "criadoEm": "data ISO"
}]
```

O botão “Solicitar outro banco” registra interesse na própria conta. A tela informa explicitamente que ainda não envia um pedido à equipe. Se `/api/config` fornecer um e-mail de suporte válido, o formulário oferece um link para o usuário abrir uma mensagem no seu programa de e-mail. Nenhuma mensagem é enviada automaticamente.

## Próxima etapa necessária no back-end

1. Definir o primeiro banco para homologação com uma conta PJ habilitada pelo banco.
2. Criar conectores separados para cada banco conforme o contrato oficial. Não reutilizar autenticação de um banco para outro.
3. Guardar segredos exclusivamente no servidor, com criptografia, autorização por empresa e resposta mascarada. Não armazenar credenciais em `/api/dados` ou no navegador.
4. Criar endpoints autenticados para conexão, teste, emissão, consulta, cancelamento, documento/linha digitável e envio de cobrança. Validar que conta, cliente e título pertencem à empresa. Não duplicar boletos após repetição de pedidos ou timeout.
5. Receber e validar notificações do banco, consultar o estado confirmado e só então registrar recebimento. Tratar notificações repetidas, pagamentos parciais, juros, tarifas e conciliação de valores.
6. Separar homologação de produção e disponibilizar operações somente após teste real de cada banco.
7. Para encaminhar pedidos de outros bancos, criar uma fila/tabela administrativa por empresa e uma rota de solicitação. O salvamento atual é apenas uma lista de interesses do próprio usuário, sem notificação da equipe.
8. O back-end deverá fornecer os estados reais e capacidades por banco; a preparação atual nunca deve aparecer automaticamente como conexão ativa.

Notas fiscais estão fora desta etapa.

## Referências oficiais consultadas em 06/11/2026

- Itaú: https://devportal.itau.com.br/
- Sicredi, Cobrança e adesão pela cooperativa: https://developers.sicredi.com.br/public/docs/general-information
- Sicoob: https://developers.sicoob.com.br/portal/
- Bradesco: https://api.bradesco/openapis (catálogo localizado na busca; abertura direta indisponível na consulta)
- Inter Empresas: https://developers.inter.co/docs/introducao/nossas-apis
- Nu Empresas: https://nubank.com.br/empresas/solucoes-para-cobranca

Para o Nubank, a página oficial confirma cobrança por seus próprios canais, mas não confirmou nesta pesquisa uma API pública de emissão disponível para o Controller. A tela marca “Disponibilidade a confirmar”.
