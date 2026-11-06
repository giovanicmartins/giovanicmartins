# API de integrações do Controller

Serve para outros sistemas (loja, ERP, planilha, Zapier etc.) lerem e enviarem lançamentos.

## 1. Pegar a chave

O cliente, logado no app, cria uma chave em `POST /api/chaves` com `{ "nome": "Minha loja" }`.
A resposta mostra a chave **uma única vez** (começa com `ctrl_`). Guarde em lugar seguro.

- Ver chaves: `GET /api/chaves`
- Apagar chave: `DELETE /api/chaves` com `{ "id": "..." }`

> A tela para isso no app ainda precisa ser feita (parte do front).

## 2. Usar a chave

Envie sempre o cabeçalho:

```
Authorization: Bearer ctrl_SUA_CHAVE
```

### Ler dados

`GET /api/integracao?tipo=titulos`

Tipos: `titulos`, `contas`, `plano`, `filiais`, `centros`, `verticais`, `metas` ou `tudo`.

### Enviar lançamentos

`POST /api/integracao`

```json
{
  "titulos": [
    { "tipo": "Receita", "descricao": "Venda #123", "valor": 150.5, "venc": "2026-11-06", "pago": "2026-11-06", "externoId": "venda-123" }
  ]
}
```

- `tipo`: `Receita` ou `Despesa`
- `valor`: número maior que zero
- `venc` e `pago`: data `AAAA-MM-DD` (`pago` vazio = ainda não pago)
- `externoId` (opcional): o código no seu sistema. Se enviar o mesmo de novo, não duplica.
- Opcionais: `pessoa`, `contaId`, `planoId`, `filialId`, `centroId`, `verticalId`, `forma`, `obs`
- Até 500 por envio.

Exemplo com curl:

```bash
curl -X POST https://SEU-SITE.vercel.app/api/integracao \
  -H "Authorization: Bearer ctrl_SUA_CHAVE" -H "Content-Type: application/json" \
  -d '{"titulos":[{"tipo":"Receita","descricao":"Venda","valor":100,"venc":"2026-11-06"}]}'
```

## Erros comuns

| Código | Motivo |
|---|---|
| 401 | Chave errada, apagada ou faltando |
| 403 | O acesso do cliente ao Controller não está ativo |
| 409 | O cliente ainda não abriu o app uma vez |
| 400 | Algum campo está errado (a mensagem diz qual) |
