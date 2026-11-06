/* Controller — telas para as rotas de recuperação de senha existentes. */
(function () {
  "use strict";
  function ligarOlhos(root) {
    root.querySelectorAll('input[type="password"]').forEach((input) => {
      if (input.parentElement.classList.contains("password-input")) return;
      const wrapper = document.createElement("div"); wrapper.className = "password-input";
      input.before(wrapper); wrapper.appendChild(input);
      const button = document.createElement("button"); button.type = "button"; button.className = "password-toggle";
      button.setAttribute("aria-label", "Mostrar senha"); button.setAttribute("aria-pressed", "false");
      if (input.id) button.setAttribute("aria-controls", input.id);
      button.title = "Mostrar senha";
      button.innerHTML = '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z"/><circle cx="12" cy="12" r="3"/><path data-eye-slash d="m3 3 18 18" style="display:none"/></svg>';
      button.onclick = () => {
        const mostrar = input.type === "password";
        input.type = mostrar ? "text" : "password";
        button.setAttribute("aria-label", mostrar ? "Ocultar senha" : "Mostrar senha");
        button.setAttribute("aria-pressed", String(mostrar));
        button.title = mostrar ? "Ocultar senha" : "Mostrar senha";
        button.querySelector("[data-eye-slash]").style.display = mostrar ? "" : "none";
      };
      wrapper.appendChild(button);
    });
  }
  function abrir(root, { api, tipo, token, voltar, novoPedido }) {
    let ativo = true, enviando = false;
    const controller = new AbortController();
    const trocar = tipo === "redefinir";
    root.innerHTML = `<h2>${trocar ? "Criar nova senha" : "Esqueci minha senha"}</h2>
      <p class="sub">${trocar ? "Escolha uma nova senha para acessar o Controller." : "Informe o e-mail da sua conta. Enviaremos um link para você criar uma nova senha."}</p>
      <div class="msg hidden" data-feedback role="status" aria-live="polite"></div>
      <form class="password-form">
      ${trocar ? `<div class="field"><label for="nova-senha">Nova senha</label><input id="nova-senha" name="senha" type="password" required minlength="6" autocomplete="new-password" aria-describedby="senha-ajuda"><small id="senha-ajuda" class="muted">Use pelo menos 6 caracteres.</small></div>
        <div class="field"><label for="confirmar-senha">Confirme a nova senha</label><input id="confirmar-senha" name="confirmacao" type="password" required minlength="6" autocomplete="new-password"></div>` : `<div class="field"><label for="recuperar-email">E-mail da sua conta</label><input id="recuperar-email" name="email" type="email" required autocomplete="email" placeholder="voce@empresa.com.br"></div>`}
      <button class="btn full" type="submit">${trocar ? "Salvar nova senha" : "Enviar link por e-mail"}</button>
      </form>
      ${trocar ? "" : '<p class="password-help muted">O link vale por 1 hora. Confira também a pasta de spam.</p>'}
      <div class="auth-links"><button class="link" type="button" data-back>← Voltar para entrar</button>${trocar ? '<button class="link" type="button" data-new-link>Pedir novo link</button>' : ""}</div>`;
    ligarOlhos(root);
    const form = root.querySelector("form"), botao = form.querySelector('button[type="submit"]'), mensagem = root.querySelector("[data-feedback]");
    const back = root.querySelector("[data-back]"), novo = root.querySelector("[data-new-link]");
    function aviso(texto, erro = false) {
      mensagem.textContent = texto;
      mensagem.className = `msg ${erro ? "err" : "ok"}`;
      mensagem.setAttribute("role", erro ? "alert" : "status");
    }
    back.onclick = voltar;
    if (novo) novo.onclick = novoPedido;
    if (trocar && !token) {
      form.remove();
      aviso("Este link está incompleto. Peça um novo link para criar sua senha.", true);
    }
    form.onsubmit = async (e) => {
      e.preventDefault();
      if (enviando || !ativo || (trocar && !token)) return;
      if (!form.reportValidity()) return;
      if (trocar && form.elements.senha.value.length < 6) {
        aviso("A senha precisa ter pelo menos 6 caracteres.", true);
        form.elements.senha.focus(); return;
      }
      if (trocar && form.elements.senha.value !== form.elements.confirmacao.value) {
        aviso("As senhas não são iguais. Confira os dois campos.", true);
        form.elements.confirmacao.focus(); return;
      }
      const corpo = trocar ? { acao: "trocar", token, senha: form.elements.senha.value } : { acao: "pedir", email: form.elements.email.value.trim() };
      enviando = true; botao.disabled = true; botao.textContent = trocar ? "Salvando…" : "Enviando…";
      mensagem.classList.add("hidden");
      form.setAttribute("aria-busy", "true");
      try {
        const r = await api("/api/senha", { method: "POST", body: JSON.stringify(corpo), signal: controller.signal });
        if (!ativo) return;
        if (!r.ok) { aviso(r.d.erro || "Não foi possível concluir. Tente novamente.", true); return; }
        aviso(r.d.mensagem || (trocar ? "Senha trocada. Agora é só entrar." : "Se este e-mail tiver conta, enviamos um link para criar nova senha."));
        if (trocar) {
          form.reset(); form.remove(); token = null;
          const url = new URL(location.href); url.searchParams.delete("redefinir");
          history.replaceState(history.state, "", url.pathname + url.search + url.hash);
          if (novo) novo.remove();
          back.className = "btn full"; back.textContent = "Entrar com a nova senha";
        } else {
          botao.textContent = "Reenviar link por e-mail";
        }
      } catch (_) {
        if (ativo) aviso("Sem conexão com o servidor. Verifique sua internet e tente novamente.", true);
      } finally {
        if (ativo) {
          enviando = false; botao.disabled = false; form.setAttribute("aria-busy", "false");
          if (botao.textContent === "Enviando…" || botao.textContent === "Salvando…") botao.textContent = trocar ? "Salvar nova senha" : "Enviar link por e-mail";
        }
        // O corpo do pedido não é guardado em armazenamento do navegador.
        if (trocar) corpo.senha = "";
      }
    };
    return () => {
      ativo = false; token = null; controller.abort();
      form.querySelectorAll('input').forEach((input) => { input.value = ""; });
      root.replaceChildren();
    };
  }
  window.ControllerSenha = { abrir, ligarOlhos };
})();
