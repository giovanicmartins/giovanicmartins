# O que o front precisa usar (back-end novo)

## Esqueci minha senha
- Tela "Esqueci a senha": `POST /api/senha` com `{ "acao": "pedir", "email": "..." }`. Mostrar `mensagem` da resposta.
- O e-mail traz o link `/app/?redefinir=TOKEN`. Nessa tela, pedir a nova senha e enviar
  `POST /api/senha` com `{ "acao": "trocar", "token": "TOKEN", "senha": "..." }`. Mostrar `mensagem` ou `erro`.

## Bloqueio de login
- `POST /api/login` agora pode responder **429** com `erro` explicando que precisa esperar 15 minutos. Mostrar a mensagem.

## Chaves de integração
- `GET /api/chaves` lista, `POST /api/chaves` `{ "nome": "..." }` cria (mostra `chave` só uma vez), `DELETE /api/chaves` `{ "id": "..." }` apaga.
- Detalhes em `INTEGRACOES.md`.
