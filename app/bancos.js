/* Controller — preparação das integrações bancárias, sem credenciais ou emissão. */
(function () {
  "use strict";
  const BANCOS = [
    { id: "itau", nome: "Itaú", sigla: "IT", info: "Confirme com o Itaú a contratação de cobrança e a liberação da integração para sua empresa." },
    { id: "sicredi", nome: "Sicredi", sigla: "SI", info: "Solicite à sua cooperativa a adesão à API de Cobrança e as credenciais de integração." },
    { id: "sicoob", nome: "Sicoob", sigla: "SC", info: "Confirme com sua cooperativa o acesso à Cobrança Bancária pelo Portal Developers." },
    { id: "bradesco", nome: "Bradesco", sigla: "BR", info: "Confirme com o Bradesco a contratação de cobrança e o acesso à API para sua empresa." },
    { id: "inter", nome: "Inter", sigla: "IN", info: "Prepare uma integração de Cobrança no Internet Banking Inter Empresas, conforme as permissões da sua conta." },
    { id: "nubank", nome: "Nubank", sigla: "NU", info: "A disponibilidade de conexão do Controller com o Nubank ainda precisa ser confirmada. Emitir pelo Nu Empresas não ativa esta integração." }
  ];
  const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const normal = (s) => String(s).trim().normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
  const id = () => crypto.randomUUID();
  function data(iso) { const d = new Date(iso); return Number.isNaN(d.getTime()) ? "" : d.toLocaleDateString("pt-BR"); }
  function abrir(root, { estado, salvar, demo = false, suporte = "" }) {
    let ativo = true, dialogo = null;
    const configuracoes = () => Array.isArray(estado.integracoesBancarias) ? estado.integracoesBancarias : [];
    const pedidos = () => Array.isArray(estado.solicitacoesBancarias) ? estado.solicitacoesBancarias : [];
    const contas = () => (Array.isArray(estado.contas) ? estado.contas : []).filter((c) => c.tipo === "Conta corrente" && !c.pessoal);
    function desenhar(aviso = "") {
      root.innerHTML = `<section class="bank-page" aria-labelledby="bank-title">
        <div class="bank-heading"><div><p class="bank-eyebrow">COBRANÇAS DA SUA EMPRESA</p><h2 id="bank-title">Integrações bancárias</h2><p class="muted">Prepare suas contas para a futura emissão e acompanhamento de boletos.</p></div><button class="btn ghost" type="button" data-other>+ Solicitar outro banco</button></div>
        <div class="bank-notice"><b>Preparação disponível · conexão ainda não ativada</b><p>Você já pode escolher o banco e vincular sua conta. Gerar boletos, enviá-los e confirmar pagamentos automaticamente dependerá da liberação e dos testes da conexão com cada banco.</p></div>
        ${demo ? '<p class="msg" role="status">Você está na demonstração. As configurações e interesses ficam apenas neste navegador.</p>' : ""}
        <p class="msg ok ${aviso ? "" : "hidden"}" role="status" data-feedback>${esc(aviso)}</p>
        <div class="bank-grid">${BANCOS.map((b, i) => {
          const lista = configuracoes().filter((c) => c.banco === b.id);
          return `<article class="card bank-card"><div class="bank-card-top"><span class="bank-mark" aria-hidden="true">${b.sigla}</span><h3>${b.nome}</h3></div>
            <span class="bank-status">${b.id === "nubank" ? "Disponibilidade a confirmar" : lista.length ? "Aguardando ativação" : "Conexão em preparação"}</span>
            <p class="muted">${esc(b.info)}</p>
            ${lista.map((c) => { const conta = contas().find((a) => a.id === c.contaId); return `<div class="bank-account"><strong>${esc(c.nome)}</strong><span>${esc(conta ? conta.nome : "Conta indisponível — revise a configuração")}</span></div>`; }).join("")}
            <button class="btn ${lista.length ? "ghost" : ""}" type="button" data-bank="${i}">${lista.length ? "Revisar configuração" : "Preparar configuração"}<span class="bank-sr"> ${b.nome}</span></button></article>`;
        }).join("")}</div>
        <section class="card bank-requests" aria-labelledby="bank-request-title"><h3 id="bank-request-title">Outros bancos que você quer integrar</h3><p class="muted">Registre seu interesse e acompanhe sua lista. O registro ainda não é enviado à equipe do Controller.</p>
          ${pedidos().length ? `<ul>${pedidos().map((p, i) => `<li><div><strong>${esc(p.banco)}</strong><span class="muted">Interesse registrado em ${esc(data(p.criadoEm))}</span>${p.observacao ? `<p class="muted">${esc(p.observacao)}</p>` : ""}</div><button class="btn ghost sm" type="button" data-remove-request="${i}" aria-label="Retirar interesse em ${esc(p.banco)}">Retirar</button></li>`).join("")}</ul>` : '<div class="empty">Nenhum outro banco solicitado. Use “Solicitar outro banco” para registrar seu interesse.</div>'}
        </section>
      </section>`;
      root.querySelectorAll("[data-bank]").forEach((b) => { b.onclick = () => configurar(BANCOS[Number(b.dataset.bank)]); });
      root.querySelector("[data-other]").onclick = solicitar;
      root.querySelectorAll("[data-remove-request]").forEach((b) => { b.onclick = () => {
        estado.solicitacoesBancarias = pedidos().filter((_, i) => i !== Number(b.dataset.removeRequest)); salvar(); desenhar("Interesse retirado da sua lista.");
      }; });
    }
    function modal(titulo, conteudo, acao, submit) {
      if (!ativo || dialogo) return;
      const anterior = document.activeElement;
      const d = document.createElement("dialog"); dialogo = d;
      d.className = "integration-dialog bank-dialog"; d.setAttribute("aria-labelledby", "bank-dialog-title");
      d.innerHTML = `<form><h3 id="bank-dialog-title">${esc(titulo)}</h3>${conteudo}<p class="msg err hidden" role="alert" data-error></p><div class="integration-actions"><button class="btn ghost" type="button" data-cancel>Cancelar</button><button class="btn" type="submit">${esc(acao)}</button></div></form>`;
      root.appendChild(d);
      const fechar = () => { d.close(); d.remove(); dialogo = null; if (anterior?.isConnected) anterior.focus(); };
      d.querySelector("[data-cancel]").onclick = fechar;
      d.addEventListener("cancel", (e) => { e.preventDefault(); fechar(); });
      d.querySelector("form").onsubmit = (e) => {
        e.preventDefault(); const f = e.currentTarget;
        if (!f.reportValidity()) return;
        try { const mensagem = submit(f); if (!mensagem) return; fechar(); desenhar(mensagem); root.querySelector("h2").setAttribute("tabindex", "-1"); root.querySelector("h2").focus(); }
        catch (err) { const p = d.querySelector("[data-error]"); p.textContent = err.message || "Não foi possível atualizar. Tente novamente."; p.classList.remove("hidden"); }
      };
      d.showModal();
    }
    function configurar(banco) {
      const atual = configuracoes().find((c) => c.banco === banco.id);
      modal(`Preparar ${banco.nome}`, `<p>${esc(banco.info)}</p><p class="muted">Esta etapa organiza sua configuração e não conecta sua conta ao banco.</p>
        <div class="field"><label for="bank-name">Nome para identificar a conexão</label><input id="bank-name" name="nome" required maxlength="60" value="${esc(atual?.nome || `${banco.nome} · minha empresa`)}" autofocus></div>
        <div class="field"><label for="bank-account">Conta de recebimento no Controller</label><select id="bank-account" name="contaId" required><option value="">Selecione uma conta corrente</option>${contas().map((c) => `<option value="${esc(c.id)}" ${c.id === atual?.contaId ? "selected" : ""}>${esc(c.nome)}</option>`).join("")}</select><small class="muted">Escolha uma conta do mesmo banco. Cadastre-a antes em Cadastros → Bancos e contas.</small></div>
        ${!contas().length ? '<p class="msg">Cadastre uma conta corrente para continuar. Depois volte a esta tela.</p>' : ""}
        <p class="muted">As credenciais bancárias serão solicitadas somente quando a conexão estiver disponível.</p>`, "Salvar preparação", (f) => {
        const nome = f.elements.nome.value.trim(), contaId = f.elements.contaId.value;
        if (!nome) throw new Error("Digite um nome para identificar a conexão.");
        if (!contas().some((c) => c.id === contaId)) throw new Error("Escolha uma conta corrente cadastrada.");
        const c = { id: atual?.id || id(), banco: banco.id, nome, contaId, status: "aguardando_ativacao", atualizadoEm: new Date().toISOString() };
        estado.integracoesBancarias = [...configuracoes().filter((x) => x.banco !== banco.id), c];
        salvar(); return "Configuração preparada. A conexão bancária ainda não está ativada.";
      });
    }
    function solicitar() {
      modal("Solicitar integração com outro banco", `<p>Qual banco você gostaria de usar para cobrar seus clientes?</p>
        <div class="field"><label for="other-bank">Nome do banco</label><input id="other-bank" name="banco" required maxlength="60" placeholder="Ex.: Banco do Brasil" autofocus></div>
        <div class="field"><label for="bank-observation">O que você precisa? (opcional)</label><textarea id="bank-observation" name="observacao" maxlength="240" rows="3" placeholder="Ex.: emissão e retorno de boletos"></textarea></div>
        <p class="muted">Seu interesse será salvo na sua lista. Ainda não há envio automático à equipe.</p>
        ${!demo && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(suporte) ? `<p class="muted">Você também pode falar com <a href="mailto:${esc(suporte)}?subject=Integra%C3%A7%C3%A3o%20banc%C3%A1ria%20Controller">nosso suporte por e-mail</a>.</p>` : ""}`, "Registrar interesse", (f) => {
        const banco = f.elements.banco.value.trim(), observacao = f.elements.observacao.value.trim();
        if (!banco) throw new Error("Informe o nome do banco.");
        if (BANCOS.some((b) => normal(b.nome) === normal(banco))) throw new Error("Este banco já está na tela. Use Preparar configuração no cartão dele.");
        if (pedidos().some((p) => normal(p.banco) === normal(banco))) throw new Error("Este banco já está na sua lista de interesses.");
        estado.solicitacoesBancarias = [...pedidos(), { id: id(), banco, observacao, criadoEm: new Date().toISOString() }];
        salvar(); return "Interesse registrado na sua lista. Ele ainda não foi enviado à equipe.";
      });
    }
    desenhar();
    return () => { ativo = false; if (dialogo) { dialogo.close(); dialogo.remove(); } root.replaceChildren(); };
  }
  window.ControllerBancos = { abrir };
})();
