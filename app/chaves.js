/* Controller — interface das rotas existentes de chaves de integração. */
(function () {
  "use strict";
  const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const data = (valor) => {
    const d = new Date(valor);
    return valor && !Number.isNaN(d.getTime()) ? new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short" }).format(d) : "Data indisponível";
  };

  function abrir(root, { api, demo }) {
    let ativo = true, ocupada = false, chaves = [], carregada = false, dialogo = null;
    const controller = new AbortController();
    root.innerHTML = `<section class="card integration-card" aria-labelledby="integration-title">
      <h2 id="integration-title">Chaves de integração</h2>
      <p class="muted">Conecte sua loja, planilha ou outro sistema ao Controller.</p>
      <div class="integration-notice">Uma chave permite acessar seus dados financeiros por outro sistema. Compartilhe apenas com sistemas em que você confia.</div>
      ${demo ? '<p class="msg" role="status">As chaves estão disponíveis na sua conta. Entre com seu e-mail e senha para gerenciar integrações; a demonstração não cria chaves reais.</p><a class="btn ghost" href="./">Entrar na minha conta</a>' : `
      <form class="integration-create">
        <div class="field"><label for="integration-name">Nome da integração</label><input id="integration-name" name="nome" maxlength="60" required placeholder="Ex.: Minha loja" autocomplete="off"><small class="muted">Escolha um nome para reconhecer onde a chave será usada. A chave completa será mostrada uma única vez.</small></div>
        <button class="btn" type="submit">+ Criar nova chave</button>
      </form>
      <p class="msg err hidden" data-error role="alert"></p>
      <p class="msg hidden" data-limit role="status">Você atingiu o limite de 10 chaves. Apague uma chave que não usa mais para criar outra.</p>
      <div data-secret></div>
      <div class="integration-list-heading"><h3>Suas chaves <span class="muted" data-count></span></h3><button class="btn ghost sm" type="button" data-refresh>Atualizar lista</button></div>
      <div data-list aria-live="polite" aria-busy="true"></div>`}
    </section>`;
    if (demo) return () => { ativo = false; root.replaceChildren(); };
    const form = root.querySelector("form"), criar = form.querySelector("button"), nome = form.elements.nome;
    const erro = root.querySelector("[data-error]"), lista = root.querySelector("[data-list]"), secret = root.querySelector("[data-secret]");
    const atualizar = root.querySelector("[data-refresh]"), contador = root.querySelector("[data-count]");
    function falha(mensagem) { erro.textContent = mensagem; erro.classList.remove("hidden"); }
    function limparErro() { erro.textContent = ""; erro.classList.add("hidden"); }
    function controles() {
      criar.disabled = ocupada || !carregada || secret.hasChildNodes() || chaves.length >= 10;
      nome.disabled = ocupada || secret.hasChildNodes();
      atualizar.disabled = ocupada;
      lista.querySelectorAll("button").forEach((b) => { b.disabled = ocupada; });
    }
    async function requisicao(method, corpo) {
      const r = await api("/api/chaves", { method, signal: controller.signal, ...(corpo ? { body: JSON.stringify(corpo) } : {}) });
      if (!r.ok) throw new Error(r.status === 401 ? "Sua sessão expirou. Entre novamente para gerenciar as chaves." : r.status === 403 ? "Seu acesso não está ativo. Verifique sua conta para gerenciar as chaves." : r.d.erro || "Não foi possível concluir. Tente novamente.");
      return r.d;
    }
    function desenharLista() {
      contador.textContent = `${chaves.length} de 10`;
      root.querySelector("[data-limit]").classList.toggle("hidden", chaves.length < 10);
      lista.innerHTML = chaves.length ? `<ul class="integration-list">${chaves.map((c, i) => `<li class="integration-row">
        <div class="integration-info"><strong>${esc(c.nome)}</strong><span class="muted">Criada em ${esc(data(c.criado_em))}</span><code aria-label="Final da chave">•••• ${esc(c.final)}</code></div>
        <button class="btn ghost sm" type="button" data-delete="${i}" aria-label="Apagar chave ${esc(c.nome)}">Apagar</button>
      </li>`).join("")}</ul>` : '<div class="empty"><p><b>Nenhuma chave criada ainda.</b></p><p>Use o formulário acima para conectar seu primeiro sistema.</p></div>';
      lista.querySelectorAll("[data-delete]").forEach((b) => { b.onclick = () => confirmarExclusao(chaves[Number(b.dataset.delete)], b); });
      controles();
    }
    async function carregar() {
      if (ocupada || !ativo) return;
      ocupada = true; limparErro(); controles(); lista.setAttribute("aria-busy", "true");
      if (!carregada) lista.textContent = "Carregando chaves…";
      try {
        const d = await requisicao("GET");
        if (!Array.isArray(d.chaves)) throw new Error("A lista de chaves não pôde ser lida. Tente atualizar novamente.");
        if (!ativo) return;
        chaves = d.chaves; carregada = true; desenharLista();
      } catch (e) {
        if (ativo) { falha(e.message || "Sem conexão. Tente atualizar a lista."); if (!carregada) lista.textContent = "Não foi possível carregar suas chaves."; }
      } finally { if (ativo) { ocupada = false; lista.setAttribute("aria-busy", "false"); controles(); } }
    }
    function mostrarChave(chave) {
      secret.innerHTML = `<section class="integration-secret" aria-labelledby="secret-title" role="status">
        <h3 id="secret-title">Guarde sua chave agora</h3><p>Esta é a única vez que a chave completa aparece. Copie e guarde em um local seguro antes de fechar.</p>
        <label for="integration-secret">Sua nova chave</label><textarea id="integration-secret" readonly rows="3" spellcheck="false" autocomplete="off"></textarea>
        <div class="integration-actions"><button class="btn" type="button" data-copy>Copiar chave</button><button class="btn ghost" type="button" data-dismiss>Já guardei a chave</button></div>
        <p class="muted" data-copy-status aria-live="polite"></p></section>`;
      const campo = secret.querySelector("textarea"), copiar = secret.querySelector("[data-copy]"), status = secret.querySelector("[data-copy-status]");
      campo.value = chave;
      copiar.onclick = async () => {
        copiar.disabled = true;
        try {
          if (!navigator.clipboard?.writeText) throw new Error("Clipboard indisponível");
          await navigator.clipboard.writeText(campo.value);
          if (ativo && campo.isConnected) status.textContent = "Chave copiada. Guarde em um local seguro.";
        } catch (_) {
          if (ativo && campo.isConnected) { campo.focus(); campo.select(); status.textContent = "Não foi possível copiar automaticamente. A chave está selecionada: use Copiar no seu dispositivo."; }
        } finally { if (ativo && campo.isConnected) copiar.disabled = false; }
      };
      secret.querySelector("[data-dismiss]").onclick = () => { campo.value = ""; secret.replaceChildren(); controles(); nome.focus(); };
      controles(); campo.focus();
    }
    form.onsubmit = async (e) => {
      e.preventDefault();
      if (criar.disabled || ocupada) return;
      const identificacao = nome.value.trim();
      if (!identificacao) { nome.setCustomValidity("Digite um nome para a integração."); nome.reportValidity(); return; }
      ocupada = true; limparErro(); controles(); criar.textContent = "Criando chave…";
      try {
        const d = await requisicao("POST", { nome: identificacao });
        if (!ativo) return;
        if (typeof d.chave !== "string" || !d.chave) throw new Error("O servidor não retornou a chave. Atualize a lista antes de tentar novamente.");
        mostrarChave(d.chave); form.reset();
        ocupada = false; await carregar();
      } catch (e) { if (ativo) falha(e.message || "Sem conexão. Atualize a lista antes de tentar novamente."); }
      finally { if (ativo) { ocupada = false; criar.textContent = "+ Criar nova chave"; controles(); } }
    };
    nome.oninput = () => nome.setCustomValidity("");
    function confirmarExclusao(chave, botao) {
      if (ocupada || dialogo) return;
      const d = document.createElement("dialog"); dialogo = d;
      d.className = "integration-dialog"; d.setAttribute("aria-labelledby", "delete-key-title");
      d.innerHTML = `<h3 id="delete-key-title">Apagar chave?</h3><p>A integração <b>${esc(chave.nome)}</b> vai perder o acesso ao Controller imediatamente. Para reconectar, será necessário criar outra chave.</p><p class="msg err hidden" role="alert"></p><div class="integration-actions"><button class="btn ghost" type="button" data-cancel autofocus>Cancelar</button><button class="btn red" type="button" data-confirm>Apagar chave</button></div>`;
      root.appendChild(d);
      const cancelar = d.querySelector("[data-cancel]"), confirmar = d.querySelector("[data-confirm]");
      const fechar = () => { d.close(); d.remove(); dialogo = null; if (botao.isConnected) botao.focus(); };
      cancelar.onclick = fechar;
      d.addEventListener("cancel", (e) => { e.preventDefault(); if (!ocupada) fechar(); });
      confirmar.onclick = async () => {
        if (ocupada) return;
        ocupada = true; controles(); cancelar.disabled = confirmar.disabled = true; confirmar.textContent = "Apagando…";
        try {
          await requisicao("DELETE", { id: chave.id });
          if (!ativo) return;
          chaves = chaves.filter((c) => c.id !== chave.id); desenharLista(); fechar(); atualizar.focus();
        } catch (e) {
          if (ativo) { const msg = d.querySelector("[role=alert]"); msg.textContent = e.message || "Não foi possível apagar. Tente novamente."; msg.classList.remove("hidden"); }
        } finally { if (ativo) { ocupada = false; controles(); cancelar.disabled = confirmar.disabled = false; confirmar.textContent = "Apagar chave"; } }
      };
      d.showModal();
    }
    atualizar.onclick = carregar;
    carregar();
    return () => {
      ativo = false; controller.abort();
      if (dialogo) { dialogo.close(); dialogo.remove(); }
      const campo = secret.querySelector("textarea"); if (campo) campo.value = "";
      root.replaceChildren();
    };
  }
  window.ControllerChaves = { abrir };
})();
