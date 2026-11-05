/* Controller — app financeiro (contas a pagar/receber, fluxo de caixa e cadastros) */
(function () {
  "use strict";

  // ================= UTILIDADES =================
  const $ = (s) => document.querySelector(s);
  const $$ = (s) => document.querySelectorAll(s);
  const MESES = ["Janeiro","Fevereiro","Março","Abril","Maio","Junho","Julho","Agosto","Setembro","Outubro","Novembro","Dezembro"];
  const FORMAS = ["Pix","Boleto","Transferência","Cartão de crédito","Cartão de débito","Dinheiro"];
  const TIPOS_CONTA = ["Conta corrente","Poupança","Caixa","Cartão","Investimento"];
  const CORES = ["#1f5fd6","#f08a7e","#0a2a5e","#7fb2ff","#0e7fb0","#8e6cc0","#94a3b8","#e67e22"];
  const brl = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });
  const fmt = (v) => brl.format(v || 0);
  const pad = (n) => String(n).padStart(2, "0");
  const uid = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4);
  const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const round2 = (v) => Math.round(v * 100) / 100;
  const hoje = new Date();
  const HOJE = `${hoje.getFullYear()}-${pad(hoje.getMonth() + 1)}-${pad(hoje.getDate())}`;
  const dataBR = (iso) => (iso ? iso.split("-").reverse().join("/") : "");
  const ym = (a, m) => `${a}-${pad(m)}`;
  function addMeses(iso, k) {
    const [y, m, d] = iso.split("-").map(Number);
    const base = new Date(y, m - 1 + k, 1);
    const ult = new Date(base.getFullYear(), base.getMonth() + 1, 0).getDate();
    return `${base.getFullYear()}-${pad(base.getMonth() + 1)}-${pad(Math.min(d, ult))}`;
  }
  function addDias(iso, n) { const [y, m, d] = iso.split("-").map(Number); const x = new Date(y, m - 1, d + n); return `${x.getFullYear()}-${pad(x.getMonth() + 1)}-${pad(x.getDate())}`; }
  const diasNoMes = (a, m) => new Date(a, m, 0).getDate();
  function toast(t) {
    const d = document.createElement("div");
    d.className = "toast"; d.textContent = t;
    document.body.appendChild(d);
    setTimeout(() => d.remove(), 2300);
  }

  // ================= DADOS INICIAIS =================
  const PLANO_PADRAO = [
    ["Receitas", "Receita", [
      ["Receitas operacionais", [["Vendas de produtos"], ["Prestação de serviços"]]],
      ["Outras receitas", [["Rendimentos financeiros"], ["Pró-labore / salário (pessoal)"]]]]],
    ["Despesas", "Despesa", [
      ["Despesas operacionais", [["Fornecedores"], ["Salários e encargos"], ["Aluguel"], ["Energia, água e internet"], ["Marketing"]]],
      ["Impostos", [["Impostos sobre vendas"]]],
      ["Despesas financeiras", [["Tarifas bancárias"], ["Juros e multas"]]],
      ["Despesas pessoais", [["Moradia"], ["Alimentação"], ["Transporte"], ["Saúde"], ["Lazer"]]]]]
  ];
  const DRE_PADRAO = [
    ["dre-rec", "Receitas operacionais", "Receita"], ["dre-orec", "Outras receitas", "Receita"],
    ["dre-imp", "Impostos sobre vendas", "Despesa"], ["dre-cus", "Custos (mercadorias e serviços)", "Despesa"],
    ["dre-op", "Despesas operacionais", "Despesa"], ["dre-fin", "Despesas financeiras", "Despesa"],
    ["dre-fora", "Não entra na DRE (pessoal)", "Fora"]];
  const DRE_MAPA = { "Receitas operacionais": "dre-rec", "Outras receitas": "dre-orec", "Pró-labore / salário (pessoal)": "dre-fora", "Fornecedores": "dre-cus",
    "Despesas operacionais": "dre-op", "Impostos": "dre-imp", "Despesas financeiras": "dre-fin", "Despesas pessoais": "dre-fora" };
  const dreCatsPadrao = () => DRE_PADRAO.map(([id, nome, tipo]) => ({ id, nome, tipo }));
  function montarPlano() {
    const lista = [];
    const add = (nome, tipo, pai, filhos) => {
      const irmaos = lista.filter((p) => p.paiId === (pai ? pai.id : null));
      const no = { id: uid(), codigo: (pai ? pai.codigo + "." : "") + (irmaos.length + 1), nome, tipo, paiId: pai ? pai.id : null, dre: DRE_MAPA[nome] || "" };
      lista.push(no);
      (filhos || []).forEach(([n, f]) => add(n, tipo, no, f));
    };
    PLANO_PADRAO.forEach(([n, t, f]) => add(n, t, null, f));
    return lista;
  }
  function estadoVazio() {
    return {
      versao: 2, plano: montarPlano(), dreCats: dreCatsPadrao(),
      contas: [{ id: uid(), nome: "Conta principal", tipo: "Conta corrente", banco: "", agencia: "", numero: "", saldoInicial: 0, dataSaldo: HOJE.slice(0, 8) + "01" },
        { id: uid(), nome: "Caixa (dinheiro)", tipo: "Caixa", banco: "", agencia: "", numero: "", saldoInicial: 0, dataSaldo: HOJE.slice(0, 8) + "01" }],
      centros: [], verticais: [], filiais: [], titulos: [], metas: []
    };
  }
  function estadoDemo() {
    const s = estadoVazio();
    s.contas = [
      { id: uid(), nome: "Banco Principal", tipo: "Conta corrente", banco: "Banco do Brasil", agencia: "1234-5", numero: "67890-1", saldoInicial: 15000 },
      { id: uid(), nome: "Caixa da loja", tipo: "Caixa", banco: "", agencia: "", numero: "", saldoInicial: 800 },
      { id: uid(), nome: "Conta pessoal", tipo: "Conta corrente", banco: "Nubank", agencia: "0001", numero: "998877-6", saldoInicial: 3000 }];
    const ini = new Date(hoje.getFullYear(), hoje.getMonth() - 2, 1);
    s.contas.forEach((c) => (c.dataSaldo = `${ini.getFullYear()}-${pad(ini.getMonth() + 1)}-01`));
    const mk = (n) => n.map((nome) => ({ id: uid(), nome }));
    s.filiais = mk(["Matriz", "Loja Centro"]);
    s.centros = mk(["Administrativo", "Comercial", "Operacional"]);
    s.verticais = mk(["Varejo", "Serviços"]);
    const pl = (nome) => s.plano.find((p) => p.nome === nome).id;
    const [banco, caixa, pess] = s.contas.map((c) => c.id);
    const [matriz, centro] = s.filiais.map((x) => x.id);
    const [adm, com, ope] = s.centros.map((x) => x.id);
    const [varejo, serv] = s.verticais.map((x) => x.id);
    const modelo = [
      ["Receita", "Vendas da loja", "Clientes diversos", "Vendas de produtos", 18000, 10, banco, matriz, com, varejo, false, "Pix"],
      ["Receita", "Vendas balcão", "Clientes diversos", "Vendas de produtos", 4200, 25, caixa, centro, com, varejo, false, "Dinheiro"],
      ["Receita", "Contrato de manutenção", "Empresa ABC", "Prestação de serviços", 6500, 20, banco, matriz, ope, serv, false, "Boleto"],
      ["Receita", "Pró-labore", "Minha empresa", "Pró-labore / salário (pessoal)", 5000, 5, pess, "", "", "", true, "Transferência"],
      ["Despesa", "Compra de mercadorias", "Distribuidora Sol", "Fornecedores", 7000, 15, banco, matriz, ope, varejo, false, "Boleto"],
      ["Despesa", "Folha de pagamento", "Funcionários", "Salários e encargos", 6000, 5, banco, matriz, adm, "", false, "Transferência"],
      ["Despesa", "Aluguel da loja", "Imobiliária Lar", "Aluguel", 3500, 10, banco, centro, adm, varejo, false, "Boleto"],
      ["Despesa", "Conta de luz", "Companhia de energia", "Energia, água e internet", 900, 18, banco, matriz, adm, "", false, "Boleto"],
      ["Despesa", "Anúncios online", "Agência Digital", "Marketing", 1200, 22, banco, matriz, com, varejo, false, "Cartão de crédito"],
      ["Despesa", "Simples Nacional", "Receita Federal", "Impostos sobre vendas", 2100, 20, banco, matriz, adm, "", false, "Boleto"],
      ["Despesa", "Tarifa do banco", "Banco", "Tarifas bancárias", 80, 28, banco, matriz, adm, "", false, "Transferência"],
      ["Despesa", "Aluguel de casa", "Proprietário", "Moradia", 1800, 8, pess, "", "", "", true, "Pix"],
      ["Despesa", "Supermercado", "Mercado", "Alimentação", 1200, 12, pess, "", "", "", true, "Cartão de débito"],
      ["Despesa", "Passeio de fim de semana", "", "Lazer", 400, 25, pess, "", "", "", true, "Cartão de crédito"]
    ];
    for (let k = -2; k <= 1; k++) {
      const base = new Date(hoje.getFullYear(), hoje.getMonth() + k, 1);
      const fator = [0.92, 1.05, 1, 1.03][k + 2];
      modelo.forEach(([tipo, descricao, pessoa, plano, valor, dia, contaId, filialId, centroId, verticalId, pessoal, forma], i) => {
        const venc = `${base.getFullYear()}-${pad(base.getMonth() + 1)}-${pad(Math.min(dia, diasNoMes(base.getFullYear(), base.getMonth() + 1)))}`;
        const atrasado = (k === -1 && descricao === "Conta de luz") || (k === 0 && descricao === "Anúncios online");
        const pago = venc < HOJE && !atrasado ? venc : "";
        s.titulos.push({ id: uid(), tipo, descricao, pessoa, valor: round2(valor * (i % 4 === 0 ? 1 : fator)), venc, pago, contaId,
          planoId: pl(plano), filialId, centroId, verticalId, pessoal, forma, obs: "" });
      });
    }
    s.metas = [
      { id: uid(), nome: "Capital de giro (3 meses)", valor: 60000, guardado: 21000, prazo: `${hoje.getFullYear() + 1}-12-31` },
      { id: uid(), nome: "Reserva pessoal", valor: 20000, guardado: 7500, prazo: `${hoje.getFullYear() + 1}-06-30` }];
    return s;
  }

  // ================= ARMAZENAMENTO =================
  let S = null, modo = "demo", versao = 0, cfg = { linkCompra: "/#preco", suporte: "" };
  let saveTimer = null, salvando = false, pendente = false;
  const ui = { view: "painel", ano: hoje.getFullYear(), mes: hoje.getMonth() + 1, visao: "tudo", filial: "",
    status: "todos", busca: "", cad: "plano", fluxoModo: "diario", fluxoTipo: "projetado", fluxoDim: "plano", fluxoConta: "", ocultarZeros: true, dreRegime: "competencia" };

  async function api(caminho, opcoes = {}) {
    const r = await fetch(caminho, Object.assign({ credentials: "same-origin", headers: { "Content-Type": "application/json" } }, opcoes));
    let d = {};
    try { d = await r.json(); } catch (e) { /* sem corpo */ }
    return { status: r.status, ok: r.ok, d };
  }

  function salvar() {
    if (modo === "demo") {
      try { localStorage.setItem("gnc-demo-v2", JSON.stringify(S)); } catch (e) { /* sem armazenamento */ }
      return;
    }
    pendente = true;
    $("#save-st").textContent = "Salvando…";
    clearTimeout(saveTimer);
    saveTimer = setTimeout(() => { saveTimer = null; enviarDados(); }, 700);
  }
  async function enviarDados() {
    if (salvando) return;
    salvando = true; pendente = false;
    try {
      const r = await api("/api/dados", { method: "PUT", body: JSON.stringify({ conteudo: S, versao }) });
      if (r.ok) { versao = r.d.versao; if (!pendente) $("#save-st").textContent = "✓ Salvo"; }
      else if (r.status === 409) { pendente = false; salvando = false; alert("Seus dados foram alterados em outro aparelho. Vamos recarregar para mostrar a versão mais nova."); location.reload(); return; }
      else if (r.status === 401 || r.status === 403) { pendente = false; salvando = false; location.reload(); return; }
      else { $("#save-st").textContent = "⚠️ Não salvou: " + (r.d.erro || "erro"); pendente = true; }
    } catch (e) {
      $("#save-st").textContent = "⚠️ Sem internet — tentando de novo…"; pendente = true;
      setTimeout(() => { if (pendente && !saveTimer) enviarDados(); }, 5000);
      return;
    } finally {
      salvando = false;
    }
    if (pendente && !saveTimer) enviarDados();
  }
  window.addEventListener("beforeunload", (e) => { if (modo !== "demo" && (pendente || salvando)) { e.preventDefault(); e.returnValue = ""; } });
  function mudou() { salvar(); render(); }

  // ================= CÁLCULOS =================
  const byId = (lista, id) => lista.find((x) => x.id === id);
  function cmpCod(a, b) {
    const x = a.split(".").map(Number), y = b.split(".").map(Number);
    for (let i = 0; i < Math.max(x.length, y.length); i++) { const d = (x[i] ?? -1) - (y[i] ?? -1); if (d) return d; }
    return 0;
  }
  const planoOrd = () => S.plano.slice().sort((a, b) => cmpCod(a.codigo, b.codigo));
  const nivel = (p) => p.codigo.split(".").length;
  const temFilhos = (p) => S.plano.some((x) => x.paiId === p.id);
  const folhas = (tipo) => planoOrd().filter((p) => !temFilhos(p) && (!tipo || p.tipo === tipo));
  function proximoCodigo(paiId) {
    const pai = paiId ? byId(S.plano, paiId) : null;
    const irmaos = S.plano.filter((p) => p.paiId === (paiId || null));
    const max = irmaos.reduce((m, p) => Math.max(m, +p.codigo.split(".").pop()), 0);
    return (pai ? pai.codigo + "." : "") + (max + 1);
  }
  function ancestral(planoId, niv) {
    let p = byId(S.plano, planoId);
    while (p && nivel(p) > niv) p = byId(S.plano, p.paiId);
    return p;
  }
  // categoria da DRE: a da própria conta ou a da conta "pai" mais próxima
  function catDRE(planoId) {
    let p = byId(S.plano, planoId);
    while (p) { if (p.dre) { const c = byId(S.dreCats, p.dre); if (c) return c; } p = byId(S.plano, p.paiId); }
    return null;
  }
  const status = (t) => (t.pago ? "pago" : t.venc < HOJE ? "vencido" : "aberto");
  const sinal = (t) => (t.tipo === "Receita" ? 1 : -1);
  function passaFiltro(t) {
    if (ui.visao === "empresa" && t.pessoal) return false;
    if (ui.visao === "pessoal" && !t.pessoal) return false;
    if (ui.filial && t.filialId !== ui.filial) return false;
    return true;
  }
  const titulosF = () => S.titulos.filter(passaFiltro);
  // realizado = pela data do pagamento; projetado = realizado + em aberto pelo vencimento (atrasados contam hoje)
  function movimentos(tipoFluxo, contaId) {
    const r = [];
    titulosF().forEach((t) => {
      if (contaId && t.contaId !== contaId) return;
      if (t.pago) r.push({ data: t.pago, v: sinal(t) * t.valor, t });
      else if (tipoFluxo === "projetado") r.push({ data: t.venc < HOJE ? HOJE : t.venc, v: sinal(t) * t.valor, t });
    });
    return r;
  }
  // o saldo inicial de cada conta vale a partir da "data do saldo"; movimentos anteriores a essa data já estão nele
  function movValido(x) { const c = byId(S.contas, x.t.contaId); return !(c && c.dataSaldo && x.data < c.dataSaldo); }
  function saldoAte(dataExcl, tipoFluxo, contaId) {
    let s = 0;
    S.contas.filter((c) => !contaId || c.id === contaId).forEach((c) => { if ((c.dataSaldo || "") <= dataExcl) s += +c.saldoInicial || 0; });
    movimentos(tipoFluxo, contaId).forEach((x) => { if (x.data < dataExcl && movValido(x)) s += x.v; });
    return s;
  }
  function saldoConta(c) {
    return (+c.saldoInicial || 0) + S.titulos.filter((t) => t.pago && t.contaId === c.id && t.pago <= HOJE && (!c.dataSaldo || t.pago >= c.dataSaldo)).reduce((s, t) => s + sinal(t) * t.valor, 0);
  }
  const usoDim = (campo, id) => S.titulos.filter((t) => t[campo] === id).length;

  // ================= GRÁFICOS =================
  let charts = [];
  function limparCharts() { charts.forEach((c) => c.destroy()); charts = []; }
  function grafico(id, conf) {
    const el = document.getElementById(id);
    if (!el || !window.Chart) return;
    conf.options = Object.assign({ responsive: true, maintainAspectRatio: false, plugins: { legend: { labels: { font: { family: "Poppins" } } } } }, conf.options || {});
    charts.push(new Chart(el, conf));
  }
  const tickBRL = (v) => (Math.abs(v) >= 1000 ? "R$ " + Math.round(v / 1000) + "k" : "R$ " + v);

  // ================= RENDER =================
  const TITULOS = { painel: "Painel", pagar: "Contas a pagar", receber: "Contas a receber", fluxo: "Fluxo de caixa", dre: "DRE — Demonstração do Resultado", cadastros: "Cadastros", metas: "Metas" };
  function render() {
    limparCharts();
    $$(".nav-btn").forEach((b) => b.classList.toggle("active", b.dataset.view === ui.view));
    $("#view-title").textContent = TITULOS[ui.view];
    const comFiltro = ["painel", "pagar", "receber", "fluxo", "dre"].includes(ui.view);
    const anual = (ui.view === "fluxo" && ui.fluxoModo === "mensal") || ui.view === "dre";
    $("#mes-sel").classList.toggle("hidden", !comFiltro);
    $("#visao").classList.toggle("hidden", !comFiltro);
    $("#mes-label").textContent = anual ? `Ano ${ui.ano}` : `${MESES[ui.mes - 1]} ${ui.ano}`;
    const fs = $("#filial-f");
    if (ui.filial && !byId(S.filiais, ui.filial)) ui.filial = "";
    fs.innerHTML = `<option value="">🏬 Todas as filiais</option>` + S.filiais.map((f) => `<option value="${f.id}" ${ui.filial === f.id ? "selected" : ""}>${esc(f.nome)}</option>`).join("");
    fs.classList.toggle("hidden", !comFiltro || !S.filiais.length);
    $("#visao").value = ui.visao;
    $("#fab").classList.toggle("hidden", !comFiltro || ui.view === "dre");
    ({ painel: telaPainel, pagar: () => telaTitulos("Despesa"), receber: () => telaTitulos("Receita"), fluxo: telaFluxo, dre: telaDRE, cadastros: telaCadastros, metas: telaMetas })[ui.view]();
  }
  function kpi(lbl, val, sub, c, bgc) {
    return `<div class="card kpi" style="--c:${c};--bgc:${bgc}"><div class="lbl">${lbl}</div><div class="val" title="${esc(val)}">${val}</div><div class="cmp">${sub || ""}</div></div>`;
  }

  // ---------- PAINEL ----------
  function telaPainel() {
    const { ano: a, mes: m } = ui, mesStr = ym(a, m);
    const T = titulosF();
    const soma = (l) => l.reduce((s, t) => s + t.valor, 0);
    const saldoTotal = S.contas.reduce((s, c) => s + saldoConta(c), 0);
    const abertos = (tipo) => T.filter((t) => t.tipo === tipo && !t.pago && t.venc.startsWith(mesStr));
    const realiz = T.filter((t) => t.pago && t.pago.startsWith(mesStr));
    const rec = soma(realiz.filter((t) => t.tipo === "Receita")), desp = soma(realiz.filter((t) => t.tipo === "Despesa"));
    const vencP = T.filter((t) => t.tipo === "Despesa" && status(t) === "vencido");
    const vencR = T.filter((t) => t.tipo === "Receita" && status(t) === "vencido");
    const prox = T.filter((t) => !t.pago && t.venc >= HOJE && t.venc <= addDias(HOJE, 7)).sort((x, y) => x.venc.localeCompare(y.venc));
    const alerta = vencP.length || vencR.length
      ? `<div class="alerta red mt">⚠️ ${vencP.length ? `<b>${vencP.length}</b> conta(s) a pagar vencida(s) — ${fmt(soma(vencP))}. ` : ""}${vencR.length ? `<b>${vencR.length}</b> conta(s) a receber atrasada(s) — ${fmt(soma(vencR))}. ` : ""}<button class="link" id="ver-venc">Ver vencidas</button></div>`
      : `<div class="alerta mt">✅ Nenhuma conta vencida. Tudo em dia!</div>`;
    const porGrupo = {};
    realiz.filter((t) => t.tipo === "Despesa").forEach((t) => { const g = ancestral(t.planoId, 2); const k = g ? `${g.codigo} ${g.nome}` : "Sem plano"; porGrupo[k] = (porGrupo[k] || 0) + t.valor; });
    const grupos = Object.entries(porGrupo).sort((x, y) => y[1] - x[1]);

    $("#view").innerHTML = `
      <div class="grid g4">
        ${kpi("SALDO EM CONTAS HOJE", fmt(saldoTotal), `${S.contas.length} conta(s) cadastrada(s)`, "var(--blue)", "var(--lblue)")}
        ${kpi("A RECEBER NO MÊS", fmt(soma(abertos("Receita"))), `${abertos("Receita").length} em aberto · recebido ${fmt(rec)}`, "var(--green)", "var(--light)")}
        ${kpi("A PAGAR NO MÊS", fmt(soma(abertos("Despesa"))), `${abertos("Despesa").length} em aberto · pago ${fmt(desp)}`, "var(--red)", "var(--lred)")}
        ${kpi("RESULTADO DO MÊS", fmt(rec - desp), "recebido − pago (realizado)", rec - desp >= 0 ? "var(--green)" : "var(--red)", "var(--lgold)")}
      </div>
      ${alerta}
      <div class="grid g2 mt">
        <div class="card"><h3>💧 Saldo projetado no mês</h3><div class="chart-box"><canvas id="ch-fluxo"></canvas></div></div>
        <div class="card"><h3>⏰ Vencem nos próximos 7 dias</h3>${prox.length ? `<div class="tit-list">${prox.slice(0, 6).map(itemCompacto).join("")}</div>` : '<div class="empty">Nada vencendo nos próximos dias. 😌</div>'}</div>
        <div class="card"><h3>🏦 Saldo por conta</h3>${S.contas.map((c) => { const v = saldoConta(c); return `<div class="list-row"><span class="grow">${esc(c.nome)} <span class="muted">· ${esc(c.tipo)}</span></span><b class="${v < 0 ? "neg" : ""}">${fmt(v)}</b></div>`; }).join("") || '<div class="empty">Cadastre suas contas em Cadastros.</div>'}</div>
        <div class="card"><h3>🍩 Para onde foi o dinheiro (pago no mês)</h3>${grupos.length ? '<div class="chart-box"><canvas id="ch-grupos"></canvas></div>' : '<div class="empty">Nenhum pagamento neste mês.</div>'}</div>
      </div>`;
    if ($("#ver-venc")) $("#ver-venc").onclick = () => { ui.view = vencP.length ? "pagar" : "receber"; ui.status = "vencido"; render(); };
    ligarAcoesTitulos();
    const serie = serieDiaria(a, m, "projetado", "");
    grafico("ch-fluxo", { type: "line", data: { labels: serie.map((d) => d.dia), datasets: [{ label: "Saldo", data: serie.map((d) => d.saldo), borderColor: "#0a2a5e", backgroundColor: "rgba(31,95,214,.12)", fill: true, tension: 0.3, pointRadius: 0 }] },
      options: { plugins: { legend: { display: false }, tooltip: { callbacks: { title: (c) => `Dia ${c[0].label}`, label: (c) => " " + fmt(c.raw) } } }, scales: { x: { grid: { display: false } }, y: { ticks: { callback: tickBRL } } } } });
    if (grupos.length) grafico("ch-grupos", { type: "doughnut", data: { labels: grupos.map((g) => g[0]), datasets: [{ data: grupos.map((g) => g[1]), backgroundColor: CORES, borderWidth: 2 }] },
      options: { cutout: "60%", plugins: { legend: { position: "bottom", labels: { boxWidth: 12, font: { family: "Poppins", size: 11 } } }, tooltip: { callbacks: { label: (c) => ` ${c.label}: ${fmt(c.raw)}` } } } } });
  }
  function serieDiaria(a, m, tipoFluxo, contaId) {
    const ini = `${ym(a, m)}-01`;
    const mov = movimentos(tipoFluxo, contaId).filter(movValido);
    const contas = S.contas.filter((c) => !contaId || c.id === contaId);
    let saldo = saldoAte(ini, tipoFluxo, contaId);
    const r = [];
    for (let d = 1; d <= diasNoMes(a, m); d++) {
      const dia = `${ym(a, m)}-${pad(d)}`;
      const doDia = mov.filter((x) => x.data === dia);
      const ent = doDia.filter((x) => x.v > 0).reduce((s, x) => s + x.v, 0), sai = -doDia.filter((x) => x.v < 0).reduce((s, x) => s + x.v, 0);
      if (d > 1) contas.forEach((c) => { if (c.dataSaldo === dia) saldo += +c.saldoInicial || 0; });
      saldo += ent - sai;
      r.push({ dia: d, data: dia, ent, sai, saldo, itens: doDia });
    }
    return r;
  }

  // ---------- CONTAS A PAGAR / RECEBER ----------
  function rotulos(t) {
    const p = byId(S.plano, t.planoId), f = byId(S.filiais, t.filialId), c = byId(S.centros, t.centroId), v = byId(S.verticais, t.verticalId);
    return [p ? `${p.codigo} ${p.nome}` : "Sem plano", f && f.nome, c && c.nome, v && v.nome].filter(Boolean).map(esc).join(" · ");
  }
  function itemTitulo(t) {
    const st = status(t), rec = t.tipo === "Receita";
    const [, mm, dd] = t.venc.split("-");
    const stTxt = st === "pago" ? (rec ? "Recebido " : "Pago ") + dataBR(t.pago) : st === "vencido" ? "Vencido" : "Em aberto";
    return `<div class="tit ${st}">
      <div class="dt"><b>${dd}</b>${MESES[+mm - 1].slice(0, 3)}</div>
      <div class="ds"><div class="nm">${esc(t.descricao)}${t.pessoal ? ' <span class="badge g">pessoal</span>' : ""}</div>
        <small>${t.pessoa ? esc(t.pessoa) + " · " : ""}${rotulos(t)}</small></div>
      <div class="vl ${rec ? "pos" : "neg"}">${fmt(t.valor)}<small class="st-${st}">${stTxt}</small></div>
      <div class="acts">${t.pago ? `<button class="baixar" data-estornar="${t.id}">↩ Desfazer</button>` : `<button class="baixar" data-baixar="${t.id}">✔ ${rec ? "Receber" : "Pagar"}</button>`}
        <button class="ico-btn" data-edit="${t.id}" aria-label="Editar">✏️</button><button class="ico-btn" data-del="${t.id}" aria-label="Apagar">🗑️</button></div>
    </div>`;
  }
  function itemCompacto(t) {
    const rec = t.tipo === "Receita";
    return `<div class="tit"><div class="dt"><b>${t.venc.slice(8)}</b>${MESES[+t.venc.slice(5, 7) - 1].slice(0, 3)}</div>
      <div class="ds"><div class="nm">${rec ? "📥" : "📤"} ${esc(t.descricao)}</div><small>${esc(t.pessoa || "")}</small></div>
      <div class="vl ${rec ? "pos" : "neg"}">${fmt(t.valor)}</div>
      <div class="acts"><button class="baixar" data-baixar="${t.id}">✔ ${rec ? "Receber" : "Pagar"}</button></div></div>`;
  }
  function telaTitulos(tipo) {
    const rec = tipo === "Receita", mesStr = ym(ui.ano, ui.mes);
    const base = titulosF().filter((t) => t.tipo === tipo);
    const soma = (l) => l.reduce((s, t) => s + t.valor, 0);
    const abertoMes = base.filter((t) => !t.pago && t.venc.startsWith(mesStr));
    const vencidos = base.filter((t) => status(t) === "vencido");
    const pagosMes = base.filter((t) => t.pago && t.pago.startsWith(mesStr));
    let lista = ui.status === "vencido" ? vencidos : ui.status === "pago" ? pagosMes : ui.status === "aberto" ? abertoMes : base.filter((t) => t.venc.startsWith(mesStr));
    const q = ui.busca.trim().toLowerCase();
    if (q) lista = lista.filter((t) => (t.descricao + " " + (t.pessoa || "")).toLowerCase().includes(q));
    lista = lista.slice().sort((x, y) => x.venc.localeCompare(y.venc));
    const abas = [["todos", "Todos do mês"], ["aberto", "Em aberto"], ["vencido", `Vencidos (${vencidos.length})`], ["pago", rec ? "Recebidos" : "Pagos"]];
    $("#view").innerHTML = `
      <div class="grid g3">
        ${kpi("EM ABERTO NO MÊS", fmt(soma(abertoMes)), `${abertoMes.length} conta(s)`, "var(--blue)", "var(--lblue)")}
        ${kpi("VENCIDOS (TODOS OS MESES)", fmt(soma(vencidos)), `${vencidos.length} conta(s)`, "var(--red)", "var(--lred)")}
        ${kpi(rec ? "RECEBIDO NO MÊS" : "PAGO NO MÊS", fmt(soma(pagosMes)), `${pagosMes.length} conta(s)`, "var(--green)", "var(--light)")}
      </div>
      <div class="toolbar mt">
        <div class="seg-tabs">${abas.map(([k, l]) => `<button data-st="${k}" class="${ui.status === k ? "on" : ""}">${l}</button>`).join("")}</div>
        <input id="busca" placeholder="🔍 Buscar descrição ou ${rec ? "cliente" : "fornecedor"}..." value="${esc(ui.busca)}">
        <button class="btn hide-m" id="novo">+ Nova conta a ${rec ? "receber" : "pagar"}</button>
      </div>
      <div class="tit-list">${lista.map(itemTitulo).join("") || `<div class="card empty">Nenhuma conta aqui. Toque em <b>+</b> para cadastrar.</div>`}</div>
      ${lista.length ? `<p class="muted mt">Total da lista: <b>${fmt(soma(lista))}</b></p>` : ""}`;
    $$("[data-st]").forEach((b) => (b.onclick = () => { ui.status = b.dataset.st; render(); }));
    $("#busca").oninput = (e) => { ui.busca = e.target.value; const pos = e.target.selectionStart; render(); const b = $("#busca"); b.focus(); b.setSelectionRange(pos, pos); };
    $("#novo").onclick = () => formTitulo(tipo);
    ligarAcoesTitulos();
  }
  function ligarAcoesTitulos() {
    $$("[data-baixar]").forEach((b) => (b.onclick = () => formBaixa(byId(S.titulos, b.dataset.baixar))));
    $$("[data-estornar]").forEach((b) => (b.onclick = () => { byId(S.titulos, b.dataset.estornar).pago = ""; mudou(); toast("Baixa desfeita"); }));
    $$("[data-edit]").forEach((b) => (b.onclick = () => { const t = byId(S.titulos, b.dataset.edit); formTitulo(t.tipo, t); }));
    $$("[data-del]").forEach((b) => (b.onclick = () => apagarTitulo(byId(S.titulos, b.dataset.del))));
  }
  function apagarTitulo(t) {
    const prox = t.grupo ? S.titulos.filter((x) => x.grupo === t.grupo && !x.pago && x.venc >= t.venc && x.id !== t.id) : [];
    if (!prox.length) { if (confirm(`Apagar "${t.descricao}"?`)) { S.titulos = S.titulos.filter((x) => x.id !== t.id); mudou(); toast("Apagado"); } return; }
    escolha("Apagar parcela", [
      ["Só esta", () => { S.titulos = S.titulos.filter((x) => x.id !== t.id); mudou(); }],
      [`Esta e as próximas ${prox.length} em aberto`, () => { const ids = new Set([t.id, ...prox.map((x) => x.id)]); S.titulos = S.titulos.filter((x) => !ids.has(x.id)); mudou(); }]]);
  }

  // ---------- FLUXO DE CAIXA ----------
  function telaFluxo() {
    const contaOpts = `<option value="">🏦 Todas as contas</option>` + S.contas.map((c) => `<option value="${c.id}" ${ui.fluxoConta === c.id ? "selected" : ""}>${esc(c.nome)}</option>`).join("");
    const topo = `<div class="toolbar">
        <div class="seg-tabs"><button data-fm="diario" class="${ui.fluxoModo === "diario" ? "on" : ""}">📅 Diário</button><button data-fm="mensal" class="${ui.fluxoModo === "mensal" ? "on" : ""}">📆 Mensal (ano)</button></div>
        <div class="seg-tabs"><button data-ft="realizado" class="${ui.fluxoTipo === "realizado" ? "on" : ""}">Realizado</button><button data-ft="projetado" class="${ui.fluxoTipo === "projetado" ? "on" : ""}">Projetado</button></div>
        <select id="f-conta">${contaOpts}</select>
        ${ui.fluxoModo === "mensal" ? `<select id="f-dim"><option value="plano">Por plano de contas</option><option value="centroId">Por centro de custo</option><option value="verticalId">Por vertical</option><option value="filialId">Por filial</option></select>
          <label class="check" style="margin:0"><input type="checkbox" id="f-zeros" ${ui.ocultarZeros ? "checked" : ""}> Ocultar linhas zeradas</label>` : ""}
        <button class="btn ghost sm" id="f-saldos">✏️ Saldos iniciais</button>
        <button class="btn ghost sm" id="f-import">📄 Importar extrato</button>
        <button class="btn ghost sm" id="f-csv">⬇️ Exportar (Excel)</button>
      </div>
      <p class="muted" style="margin-bottom:12px">${ui.fluxoTipo === "realizado" ? "<b>Realizado:</b> só o que já foi pago ou recebido, na data do pagamento." : "<b>Projetado:</b> o realizado + o que ainda está em aberto, na data de vencimento (atrasados entram como hoje)."}</p>`;
    if (ui.fluxoModo === "diario") fluxoDiario(topo); else fluxoMensal(topo);
    $$("[data-fm]").forEach((b) => (b.onclick = () => { ui.fluxoModo = b.dataset.fm; render(); }));
    $$("[data-ft]").forEach((b) => (b.onclick = () => { ui.fluxoTipo = b.dataset.ft; render(); }));
    $("#f-conta").onchange = (e) => { ui.fluxoConta = e.target.value; render(); };
    if ($("#f-dim")) { $("#f-dim").value = ui.fluxoDim; $("#f-dim").onchange = (e) => { ui.fluxoDim = e.target.value; render(); }; }
    if ($("#f-zeros")) $("#f-zeros").onchange = (e) => { ui.ocultarZeros = e.target.checked; render(); };
    $("#f-saldos").onclick = formSaldos;
    $("#f-import").onclick = () => formImportar(ui.fluxoConta);
  }
  function formSaldos() {
    if (!S.contas.length) return alert("Cadastre uma conta bancária primeiro (Cadastros → Contas bancárias).");
    modal("✏️ Saldos iniciais do fluxo de caixa", `<p class="muted" style="margin-bottom:12px">Informe quanto havia em cada conta na data em que você começou a controlar. Movimentos anteriores a essa data não entram no saldo.</p>
      ${S.contas.map((c) => `<div class="row2" style="align-items:end"><div class="field"><label>${esc(c.nome)} — saldo (R$)</label><input name="v-${c.id}" type="number" step="0.01" inputmode="decimal" value="${c.saldoInicial || 0}"></div>
        <div class="field"><label>Na data</label><input name="d-${c.id}" type="date" value="${c.dataSaldo || ""}"></div></div>`).join("")}`, (f) => {
      S.contas.forEach((c) => { c.saldoInicial = round2(parseFloat(f["v-" + c.id].value) || 0); c.dataSaldo = f["d-" + c.id].value; });
      mudou(); toast("Saldos iniciais salvos ✓");
    });
  }
  function fluxoDiario(topo) {
    const serie = serieDiaria(ui.ano, ui.mes, ui.fluxoTipo, ui.fluxoConta);
    const ini = serie[0].saldo - serie[0].ent + serie[0].sai, fim = serie[serie.length - 1].saldo;
    const ent = serie.reduce((s, d) => s + d.ent, 0), sai = serie.reduce((s, d) => s + d.sai, 0);
    const linhas = serie.filter((d) => d.ent || d.sai).map((d) => `<tr><td>${dataBR(d.data)}</td><td class="num pos">${d.ent ? fmt(d.ent) : "–"}</td><td class="num neg">${d.sai ? fmt(d.sai) : "–"}</td>
      <td class="num">${fmt(d.ent - d.sai)}</td><td class="num ${d.saldo < 0 ? "neg" : ""}"><b>${fmt(d.saldo)}</b></td>
      <td class="muted" style="white-space:normal;min-width:220px">${d.itens.map((x) => esc(x.t.descricao)).join(", ")}</td></tr>`).join("");
    $("#view").innerHTML = topo + `
      <div class="grid g4">
        ${kpi("SALDO INICIAL", fmt(ini), `em 01/${pad(ui.mes)}`, "var(--blue)", "var(--lblue)")}
        ${kpi("ENTRADAS", fmt(ent), "", "var(--green)", "var(--light)")}
        ${kpi("SAÍDAS", fmt(sai), "", "var(--red)", "var(--lred)")}
        ${kpi("SALDO FINAL", fmt(fim), `em ${diasNoMes(ui.ano, ui.mes)}/${pad(ui.mes)}`, fim < 0 ? "var(--red)" : "var(--gold)", "var(--lgold)")}
      </div>
      ${serie.some((d) => d.saldo < 0) ? `<div class="alerta red mt">⚠️ O saldo fica <b>negativo</b> em algum dia deste mês. Antecipe recebimentos ou adie pagamentos.</div>` : ""}
      <div class="card mt"><h3>📈 Saldo dia a dia</h3><div class="chart-box"><canvas id="ch-dia"></canvas></div></div>
      <div class="card mt"><h3>📋 Movimentos do mês</h3><div class="tbl-wrap"><table><thead><tr><th>Data</th><th class="num">Entradas</th><th class="num">Saídas</th><th class="num">Resultado do dia</th><th class="num">Saldo</th><th>Descrição</th></tr></thead>
        <tbody><tr class="tot"><td>Saldo inicial</td><td></td><td></td><td></td><td class="num">${fmt(ini)}</td><td></td></tr>${linhas || '<tr><td colspan="6" class="muted">Sem movimentos neste mês.</td></tr>'}
        <tr class="tot"><td>Total</td><td class="num">${fmt(ent)}</td><td class="num">${fmt(sai)}</td><td class="num">${fmt(ent - sai)}</td><td class="num">${fmt(fim)}</td><td></td></tr></tbody></table></div></div>`;
    grafico("ch-dia", { type: "bar", data: { labels: serie.map((d) => d.dia), datasets: [
      { type: "line", label: "Saldo", data: serie.map((d) => d.saldo), borderColor: "#0a2a5e", backgroundColor: "#0a2a5e", tension: 0.3, pointRadius: 0 },
      { label: "Entradas", data: serie.map((d) => d.ent), backgroundColor: "#1f5fd6", borderRadius: 4 },
      { label: "Saídas", data: serie.map((d) => -d.sai), backgroundColor: "#f08a7e", borderRadius: 4 }] },
      options: { plugins: { legend: { position: "bottom" }, tooltip: { callbacks: { label: (c) => ` ${c.dataset.label}: ${fmt(Math.abs(c.raw))}` } } }, scales: { x: { grid: { display: false } }, y: { ticks: { callback: tickBRL } } } } });
    $("#f-csv").onclick = () => baixarCSV(`fluxo-diario-${ym(ui.ano, ui.mes)}.csv`, [["Data", "Entradas", "Saídas", "Resultado", "Saldo"], ["Saldo inicial", "", "", "", ini],
      ...serie.map((d) => [dataBR(d.data), d.ent, d.sai, d.ent - d.sai, d.saldo])]);
  }
  function fluxoMensal(topo) {
    const a = ui.ano, mov = movimentos(ui.fluxoTipo, ui.fluxoConta).filter(movValido);
    const doAno = mov.filter((x) => x.data.startsWith(a + "-"));
    const mi = (x) => +x.data.slice(5, 7) - 1;
    const vazio = () => Array(12).fill(0);
    const somaV = (v) => v.reduce((s, x) => s + x, 0);
    const ent = vazio(), sai = vazio();
    doAno.forEach((x) => { if (x.v > 0) ent[mi(x)] += x.v; else sai[mi(x)] -= x.v; });
    const iniAno = saldoAte(`${a}-01-01`, ui.fluxoTipo, ui.fluxoConta), saldosIni = [], saldosFim = [];
    for (let i = 0; i < 12; i++) { saldosIni.push(saldoAte(`${ym(a, i + 1)}-01`, ui.fluxoTipo, ui.fluxoConta)); saldosFim.push(saldoAte(i === 11 ? `${a + 1}-01-01` : `${ym(a, i + 2)}-01`, ui.fluxoTipo, ui.fluxoConta)); }
    const cel = (v) => `<td class="num ${v < 0 ? "neg" : ""}">${v ? fmt(v) : "–"}</td>`;
    const linha = (rot, vals, cls = "", indent = 0, negar = false) => {
      const vv = vals.map((v) => (negar ? -v : v));
      return `<tr class="${cls}"><td class="sticky" style="padding-left:${10 + indent * 16}px">${rot}</td>${vv.map(cel).join("")}${cel(somaV(vv))}</tr>`;
    };
    const csv = [["Linha", ...MESES, "Total"]];
    const csvL = (rot, vals, negar) => { const vv = vals.map((v) => (negar ? -v : v)); csv.push([rot, ...vv, somaV(vv)]); };
    let corpo = "";
    if (ui.fluxoDim === "plano") {
      const porPlano = {};
      doAno.forEach((x) => { (porPlano[x.t.planoId] = porPlano[x.t.planoId] || vazio())[mi(x)] += Math.abs(x.v); });
      const total = (p) => { const v = (porPlano[p.id] || vazio()).slice(); S.plano.filter((f) => f.paiId === p.id).forEach((f) => total(f).forEach((x, i) => (v[i] += x))); return v; };
      planoOrd().forEach((p) => {
        const v = total(p);
        if (ui.ocultarZeros && !v.some(Boolean)) return;
        const n = nivel(p), negar = p.tipo === "Despesa";
        corpo += linha(`${esc(p.codigo)} ${esc(p.nome)}`, v, n === 1 ? "lvl1" : n === 2 ? "lvl2" : "", n - 1, negar);
        csvL(`${p.codigo} ${p.nome}`, v, negar);
      });
      const semPlano = vazio(); doAno.filter((x) => !byId(S.plano, x.t.planoId)).forEach((x) => (semPlano[mi(x)] += x.v));
      if (semPlano.some(Boolean)) { corpo += linha("Sem plano de contas", semPlano); csvL("Sem plano de contas", semPlano); }
    } else {
      const campo = ui.fluxoDim, lista = { centroId: S.centros, verticalId: S.verticais, filialId: S.filiais }[campo];
      [...lista.map((x) => [x.id, x.nome]), ["", "(Não informado)"]].forEach(([id, nome]) => {
        const e = vazio(), s = vazio();
        doAno.filter((x) => (x.t[campo] || "") === id).forEach((x) => { if (x.v > 0) e[mi(x)] += x.v; else s[mi(x)] -= x.v; });
        if (ui.ocultarZeros && !e.some(Boolean) && !s.some(Boolean)) return;
        const r = e.map((v, i) => v - s[i]);
        corpo += linha(`<b>${esc(nome)}</b> — resultado`, r, "lvl2") + linha("Entradas", e, "", 1) + linha("Saídas", s, "", 1, true);
        csvL(nome + " — resultado", r); csvL(nome + " — entradas", e); csvL(nome + " — saídas", s, true);
      });
    }
    const res = ent.map((v, i) => v - sai[i]);
    const rodape = linha("Total de entradas", ent, "tot") + linha("Total de saídas", sai, "tot", 0, true) + linha("Resultado do mês", res, "tot") +
      `<tr class="tot"><td class="sticky">Saldo inicial</td>${saldosIni.map(cel).join("")}${cel(iniAno)}</tr>
       <tr class="tot"><td class="sticky">Saldo final</td>${saldosFim.map(cel).join("")}${cel(saldosFim[11])}</tr>`;
    csvL("Total de entradas", ent); csvL("Total de saídas", sai, true); csvL("Resultado do mês", res);
    csv.push(["Saldo inicial", ...saldosIni, iniAno]); csv.push(["Saldo final", ...saldosFim, saldosFim[11]]);
    $("#view").innerHTML = topo + `
      <div class="grid g4">
        ${kpi("SALDO INICIAL DO ANO", fmt(iniAno), "", "var(--blue)", "var(--lblue)")}
        ${kpi("ENTRADAS NO ANO", fmt(somaV(ent)), "", "var(--green)", "var(--light)")}
        ${kpi("SAÍDAS NO ANO", fmt(somaV(sai)), "", "var(--red)", "var(--lred)")}
        ${kpi("SALDO FINAL DO ANO", fmt(saldosFim[11]), "", "var(--gold)", "var(--lgold)")}
      </div>
      <div class="card mt"><h3>📊 Entradas x Saídas por mês</h3><div class="chart-box"><canvas id="ch-ano"></canvas></div></div>
      <div class="card mt"><h3>📋 Fluxo de caixa ${a}</h3><div class="tbl-wrap"><table><thead><tr><th class="sticky">${ui.fluxoDim === "plano" ? "Plano de contas" : "Item"}</th>${MESES.map((m) => `<th class="num">${m.slice(0, 3)}</th>`).join("")}<th class="num">Total</th></tr></thead>
        <tbody>${corpo || '<tr><td colspan="14" class="muted">Sem movimentos neste ano.</td></tr>'}${rodape}</tbody></table></div></div>`;
    grafico("ch-ano", { type: "bar", data: { labels: MESES.map((m) => m.slice(0, 3)), datasets: [
      { label: "Entradas", data: ent, backgroundColor: "#1f5fd6", borderRadius: 5 }, { label: "Saídas", data: sai, backgroundColor: "#f08a7e", borderRadius: 5 },
      { type: "line", label: "Saldo final", data: saldosFim, borderColor: "#0a2a5e", backgroundColor: "#0a2a5e", tension: 0.3 }] },
      options: { plugins: { legend: { position: "bottom" }, tooltip: { callbacks: { label: (c) => ` ${c.dataset.label}: ${fmt(c.raw)}` } } }, scales: { x: { grid: { display: false } }, y: { ticks: { callback: tickBRL } } } } });
    $("#f-csv").onclick = () => baixarCSV(`fluxo-de-caixa-${a}.csv`, csv);
  }
  function baixarCSV(nome, linhas) {
    const val = (v) => (typeof v === "number" ? String(round2(v)).replace(".", ",") : String(v ?? ""));
    const csv = "﻿" + linhas.map((r) => r.map((v) => `"${val(v).replace(/"/g, '""')}"`).join(";")).join("\r\n");
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    a.download = nome; a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  }

  // ---------- CADASTROS ----------
  const DIMS = { centros: ["centroId", "Centro de custo", "Centros de custo", "🎯"], verticais: ["verticalId", "Vertical", "Verticais", "🧭"], filiais: ["filialId", "Filial", "Filiais", "🏬"] };
  function telaCadastros() {
    const abas = [["plano", "📒 Plano de contas"], ["dre", "📑 Categorias da DRE"], ["contas", "🏦 Bancos e contas"], ["centros", "🎯 Centros de custo"], ["verticais", "🧭 Verticais"], ["filiais", "🏬 Filiais"]];
    const topo = `<div class="toolbar"><div class="seg-tabs">${abas.map(([k, l]) => `<button data-cad="${k}" class="${ui.cad === k ? "on" : ""}">${l}</button>`).join("")}</div></div>`;
    let html = "";
    if (ui.cad === "plano") {
      html = `<div class="card tree"><h3>📒 Plano de contas <span style="display:flex;gap:6px;flex-wrap:wrap"><button class="btn ghost sm" id="exp-plano">⬇️ Exportar</button><button class="btn sm" id="nova-raiz">+ Conta principal</button></span></h3>
        <p class="muted" style="margin-bottom:10px">A numeração é automática. Use <b>+ Sub</b> para criar uma conta dentro de outra (ex.: 2.1 → 2.1.6). Os lançamentos usam as contas do último nível. Na caixa ao lado, escolha em qual <b>categoria da DRE</b> a conta entra ("herdar" usa a da conta de cima).</p>
        ${planoOrd().map((p) => {
          const n = nivel(p), uso = S.titulos.filter((t) => t.planoId === p.id).length;
          const herd = p.paiId ? catDRE(p.paiId) : null;
          const dreSel = `<select class="inp" data-dre="${p.id}" style="max-width:190px" title="Categoria da DRE" aria-label="Categoria da DRE"><option value="">${herd ? "↑ herdar: " + esc(herd.nome) : "(sem categoria)"}</option>${S.dreCats.map((c) => `<option value="${c.id}" ${p.dre === c.id ? "selected" : ""}>${esc(c.nome)}</option>`).join("")}</select>`;
          return `<div class="list-row" style="padding-left:${(n - 1) * 18}px">
            <span class="cod">${esc(p.codigo)}</span>
            <input class="inp" data-plano="${p.id}" value="${esc(p.nome)}" aria-label="Nome da conta ${esc(p.codigo)}" style="${n === 1 ? "font-weight:700" : ""}">
            <span class="badge ${p.tipo === "Receita" ? "" : "r"} hide-m">${p.tipo}</span>
            ${dreSel}
            ${uso ? `<span class="muted hide-m" title="lançamentos">${uso}×</span>` : ""}
            <button class="btn ghost sm" data-sub="${p.id}" title="Criar subconta">+ Sub</button>
            <button class="ico-btn" data-delp="${p.id}" aria-label="Apagar">🗑️</button></div>`;
        }).join("")}</div>`;
    } else if (ui.cad === "contas") {
      html = `<div class="card"><h3>🏦 Bancos, contas e caixas <span style="display:flex;gap:6px;flex-wrap:wrap"><button class="btn ghost sm" id="imp-extrato">📄 Importar extrato</button><button class="btn sm" id="nova-conta">+ Nova conta</button></span></h3>
        <p class="muted" style="margin-bottom:10px">O <b>saldo inicial</b> é quanto havia na conta na <b>data do saldo</b> (quando você começou a controlar). Ele é o ponto de partida do fluxo de caixa.</p>
        <div class="tbl-wrap"><table><thead><tr><th>Nome</th><th>Tipo</th><th>Banco</th><th>Agência</th><th>Nº da conta</th><th>Saldo inicial (R$)</th><th>Data do saldo</th><th class="num">Saldo hoje</th><th></th></tr></thead><tbody>
        ${S.contas.map((c) => `<tr><td><input class="inp" data-conta="${c.id}" data-f="nome" value="${esc(c.nome)}" style="min-width:150px"></td>
          <td><select class="inp" data-conta="${c.id}" data-f="tipo">${TIPOS_CONTA.map((t) => `<option ${c.tipo === t ? "selected" : ""}>${t}</option>`).join("")}</select></td>
          <td><input class="inp" data-conta="${c.id}" data-f="banco" value="${esc(c.banco || "")}" placeholder="Ex.: Itaú" style="min-width:120px"></td>
          <td><input class="inp" data-conta="${c.id}" data-f="agencia" value="${esc(c.agencia || "")}" style="min-width:80px"></td>
          <td><input class="inp" data-conta="${c.id}" data-f="numero" value="${esc(c.numero || "")}" style="min-width:100px"></td>
          <td><input class="inp" type="number" step="0.01" inputmode="decimal" data-conta="${c.id}" data-f="saldoInicial" value="${c.saldoInicial || 0}" style="min-width:110px"></td>
          <td><input class="inp" type="date" data-conta="${c.id}" data-f="dataSaldo" value="${c.dataSaldo || ""}"></td>
          <td class="num"><b>${fmt(saldoConta(c))}</b></td><td style="white-space:nowrap"><button class="ico-btn" data-impconta="${c.id}" title="Importar extrato desta conta">📄</button><button class="ico-btn" data-delconta="${c.id}" aria-label="Apagar">🗑️</button></td></tr>`).join("")}
        </tbody></table></div></div>`;
    } else if (ui.cad === "dre") {
      html = `<div class="card"><h3>📑 Categorias da DRE <button class="btn sm" id="nova-dre">+ Nova categoria</button></h3>
        <p class="muted" style="margin-bottom:10px">Defina como suas receitas e despesas aparecem na DRE. A ordem aqui é a ordem do relatório. Depois, no <b>Plano de contas</b>, escolha a categoria de cada conta.</p>
        ${S.dreCats.map((c, i) => `<div class="list-row">
          <input class="inp" data-drecat="${c.id}" data-f="nome" value="${esc(c.nome)}" aria-label="Nome da categoria">
          <select class="inp" data-drecat="${c.id}" data-f="tipo" style="max-width:170px" aria-label="Tipo"><option value="Receita" ${c.tipo === "Receita" ? "selected" : ""}>➕ Receita</option><option value="Despesa" ${c.tipo === "Despesa" ? "selected" : ""}>➖ Despesa</option><option value="Fora" ${c.tipo === "Fora" ? "selected" : ""}>🚫 Não entra na DRE</option></select>
          <button class="ico-btn" data-mv="${i}" data-dir="-1" aria-label="Subir" ${i === 0 ? "disabled" : ""}>⬆️</button><button class="ico-btn" data-mv="${i}" data-dir="1" aria-label="Descer" ${i === S.dreCats.length - 1 ? "disabled" : ""}>⬇️</button>
          <button class="ico-btn" data-deldre="${c.id}" aria-label="Apagar">🗑️</button></div>`).join("") || '<div class="empty">Nenhuma categoria.</div>'}</div>`;
    } else {
      const [campo, sing, plur, ic] = DIMS[ui.cad];
      html = `<div class="card"><h3>${ic} ${plur} <button class="btn sm" id="novo-dim">+ Novo</button></h3>
        <p class="muted" style="margin-bottom:10px">Use para separar resultados. Escolha no lançamento e veja em Fluxo de caixa → Mensal.</p>
        ${S[ui.cad].map((x) => `<div class="list-row"><input class="inp" data-dim="${x.id}" value="${esc(x.nome)}"><span class="muted" style="white-space:nowrap">${usoDim(campo, x.id)} lanç.</span><button class="ico-btn" data-deldim="${x.id}" aria-label="Apagar">🗑️</button></div>`).join("")
          || `<div class="empty">Nenhum(a) ${sing.toLowerCase()} cadastrado(a) ainda.</div>`}</div>`;
    }
    $("#view").innerHTML = topo + html;
    $$("[data-cad]").forEach((b) => (b.onclick = () => { ui.cad = b.dataset.cad; render(); }));

    // plano de contas
    $$("[data-plano]").forEach((el) => (el.onchange = () => { byId(S.plano, el.dataset.plano).nome = el.value.trim() || "Sem nome"; salvar(); toast("Salvo ✓"); }));
    $$("[data-sub]").forEach((b) => (b.onclick = () => {
      const pai = byId(S.plano, b.dataset.sub);
      if (S.titulos.some((t) => t.planoId === pai.id)) return alert(`A conta ${pai.codigo} já tem lançamentos. Mude esses lançamentos para outra conta antes de criar subcontas nela.`);
      const cod = proximoCodigo(pai.id);
      modal(`➕ Nova subconta de ${esc(pai.codigo)} ${esc(pai.nome)}`, `<div class="field"><label>Código (automático)</label><input value="${cod}" disabled></div>
        <div class="field"><label>Nome da conta</label><input name="nome" required maxlength="60" autofocus></div>`, (f) => {
        S.plano.push({ id: uid(), codigo: proximoCodigo(pai.id), nome: f.nome.value.trim(), tipo: pai.tipo, paiId: pai.id }); mudou(); toast(`Conta ${cod} criada ✓`);
      });
    }));
    if ($("#nova-raiz")) $("#nova-raiz").onclick = () => {
      const cod = proximoCodigo(null);
      modal("➕ Nova conta principal", `<div class="field"><label>Código (automático)</label><input value="${cod}" disabled></div>
        <div class="field"><label>Nome</label><input name="nome" required maxlength="60" placeholder="Ex.: Investimentos" autofocus></div>
        <div class="field"><label>Tipo</label><select name="tipo"><option>Despesa</option><option>Receita</option></select></div>`, (f) => {
        S.plano.push({ id: uid(), codigo: proximoCodigo(null), nome: f.nome.value.trim(), tipo: f.tipo.value, paiId: null }); mudou(); toast(`Conta ${cod} criada ✓`);
      });
    };
    if ($("#exp-plano")) $("#exp-plano").onclick = () => baixarCSV("plano-de-contas.csv", [["Código", "Nome", "Tipo"], ...planoOrd().map((p) => [p.codigo, p.nome, p.tipo])]);
    $$("[data-delp]").forEach((b) => (b.onclick = () => {
      const p = byId(S.plano, b.dataset.delp);
      if (temFilhos(p)) return alert("Apague primeiro as subcontas desta conta.");
      const uso = S.titulos.filter((t) => t.planoId === p.id).length;
      if (uso) return alert(`Esta conta tem ${uso} lançamento(s). Mude-os para outra conta antes de apagar.`);
      if (confirm(`Apagar a conta ${p.codigo} ${p.nome}?`)) { S.plano = S.plano.filter((x) => x.id !== p.id); mudou(); }
    }));
    // contas bancárias
    $$("[data-conta]").forEach((el) => (el.onchange = () => {
      const c = byId(S.contas, el.dataset.conta), f = el.dataset.f;
      c[f] = f === "saldoInicial" ? round2(parseFloat(el.value) || 0) : f === "nome" ? el.value.trim() || "Sem nome" : el.value.trim(); mudou(); toast("Salvo ✓");
    }));
    if ($("#nova-conta")) $("#nova-conta").onclick = () => { S.contas.push({ id: uid(), nome: "Nova conta", tipo: "Conta corrente", banco: "", agencia: "", numero: "", saldoInicial: 0, dataSaldo: HOJE }); mudou(); };
    if ($("#imp-extrato")) $("#imp-extrato").onclick = () => formImportar("");
    $$("[data-impconta]").forEach((b) => (b.onclick = () => formImportar(b.dataset.impconta)));
    // DRE: vínculo no plano e categorias
    $$("[data-dre]").forEach((el) => (el.onchange = () => { byId(S.plano, el.dataset.dre).dre = el.value; mudou(); toast("Categoria da DRE salva ✓"); }));
    $$("[data-drecat]").forEach((el) => (el.onchange = () => { const c = byId(S.dreCats, el.dataset.drecat); c[el.dataset.f] = el.dataset.f === "nome" ? el.value.trim() || "Sem nome" : el.value; mudou(); toast("Salvo ✓"); }));
    $$("[data-mv]").forEach((b) => (b.onclick = () => { const i = +b.dataset.mv, j = i + +b.dataset.dir; [S.dreCats[i], S.dreCats[j]] = [S.dreCats[j], S.dreCats[i]]; mudou(); }));
    if ($("#nova-dre")) $("#nova-dre").onclick = () => modal("➕ Nova categoria da DRE", `<div class="field"><label>Nome</label><input name="nome" required maxlength="60" placeholder="Ex.: Despesas com pessoal" autofocus></div>
      <div class="field"><label>Tipo</label><select name="tipo"><option value="Despesa">➖ Despesa</option><option value="Receita">➕ Receita</option><option value="Fora">🚫 Não entra na DRE</option></select></div>`,
      (f) => { S.dreCats.push({ id: uid(), nome: f.nome.value.trim(), tipo: f.tipo.value }); mudou(); toast("Categoria criada ✓ Vincule as contas no Plano de contas."); });
    $$("[data-deldre]").forEach((b) => (b.onclick = () => {
      const uso = S.plano.filter((p) => p.dre === b.dataset.deldre).length;
      if (!confirm(uso ? `${uso} conta(s) do plano usam esta categoria e ficarão sem categoria. Apagar?` : "Apagar esta categoria?")) return;
      S.plano.forEach((p) => { if (p.dre === b.dataset.deldre) p.dre = ""; });
      S.dreCats = S.dreCats.filter((c) => c.id !== b.dataset.deldre); mudou();
    }));
    $$("[data-delconta]").forEach((b) => (b.onclick = () => {
      const uso = S.titulos.filter((t) => t.contaId === b.dataset.delconta).length;
      if (uso) return alert(`Esta conta tem ${uso} lançamento(s). Mude-os para outra conta antes de apagar.`);
      if (confirm("Apagar esta conta?")) { S.contas = S.contas.filter((c) => c.id !== b.dataset.delconta); mudou(); }
    }));
    // centros, verticais, filiais
    if (DIMS[ui.cad]) {
      const [campo, sing] = DIMS[ui.cad], chave = ui.cad;
      $$("[data-dim]").forEach((el) => (el.onchange = () => { byId(S[chave], el.dataset.dim).nome = el.value.trim() || "Sem nome"; mudou(); toast("Salvo ✓"); }));
      $("#novo-dim").onclick = () => modal(`➕ Novo(a) ${sing.toLowerCase()}`, `<div class="field"><label>Nome</label><input name="nome" required maxlength="60" autofocus></div>`,
        (f) => { S[chave].push({ id: uid(), nome: f.nome.value.trim() }); mudou(); });
      $$("[data-deldim]").forEach((b) => (b.onclick = () => {
        const uso = usoDim(campo, b.dataset.deldim);
        if (!confirm(uso ? `Está em ${uso} lançamento(s). Apagar mesmo assim? Eles ficarão como "não informado".` : "Apagar?")) return;
        S.titulos.forEach((t) => { if (t[campo] === b.dataset.deldim) t[campo] = ""; });
        S[chave] = S[chave].filter((x) => x.id !== b.dataset.deldim); mudou();
      }));
    }
  }

  // ---------- DRE ----------
  function telaDRE() {
    const a = ui.ano, caixa = ui.dreRegime === "caixa";
    const dataDe = (t) => (caixa ? t.pago : t.venc);
    const doAno = titulosF().filter((t) => { const d = dataDe(t); return d && d.startsWith(a + "-"); });
    const mi = (t) => +dataDe(t).slice(5, 7) - 1;
    const vazio = () => Array(12).fill(0);
    const somaV = (v) => v.reduce((x, y) => x + y, 0);
    // agrupa: categoria -> conta (folha) -> meses
    const grupos = new Map();
    let fora = 0;
    doAno.forEach((t) => {
      const c = catDRE(t.planoId);
      if (c && c.tipo === "Fora") { fora += t.valor; return; }
      const chave = c ? c.id : "sem-" + t.tipo;
      if (!grupos.has(chave)) grupos.set(chave, { cat: c || { id: chave, nome: `⚠️ ${t.tipo}s sem categoria`, tipo: t.tipo }, contas: new Map() });
      const g = grupos.get(chave);
      if (!g.contas.has(t.planoId)) g.contas.set(t.planoId, vazio());
      g.contas.get(t.planoId)[mi(t)] += t.valor;
    });
    const ordem = [...S.dreCats.map((c) => c.id), "sem-Receita", "sem-Despesa"];
    const lista = ordem.filter((id) => grupos.has(id)).map((id) => grupos.get(id));
    const totalGrupo = (g) => { const v = vazio(); g.contas.forEach((m) => m.forEach((x, i) => (v[i] += x))); return v; };
    const rec = vazio(), desp = vazio();
    lista.forEach((g) => totalGrupo(g).forEach((x, i) => (g.cat.tipo === "Receita" ? (rec[i] += x) : (desp[i] += x))));
    const res = rec.map((x, i) => x - desp[i]), totRec = somaV(rec);
    const av = (v) => (totRec ? Math.round((somaV(v) / totRec) * 1000) / 10 + "%" : "–");
    const cel = (v) => `<td class="num ${v < 0 ? "neg" : ""}">${v ? fmt(v) : "–"}</td>`;
    const linha = (rot, v, cls = "", indent = 0, negar = false) => {
      const vv = v.map((x) => (negar ? -x : x));
      return `<tr class="${cls}"><td class="sticky" style="padding-left:${10 + indent * 16}px">${rot}</td>${vv.map(cel).join("")}${cel(somaV(vv))}<td class="num">${av(v)}</td></tr>`;
    };
    const csv = [["Linha", ...MESES, "Total", "% da receita"]];
    const csvL = (rot, v, negar) => { const vv = v.map((x) => (negar ? -x : x)); csv.push([rot, ...vv, somaV(vv), totRec ? round2((somaV(v) / totRec) * 100) : ""]); };
    let corpo = "";
    const bloco = (tipo) => lista.filter((g) => (g.cat.tipo === "Receita") === (tipo === "Receita")).forEach((g) => {
      const neg = tipo !== "Receita", tg = totalGrupo(g);
      corpo += linha(`${neg ? "(−) " : "(+) "}${esc(g.cat.nome)}`, tg, "lvl2", 0, neg); csvL(`${neg ? "(-) " : "(+) "}${g.cat.nome}`, tg, neg);
      [...g.contas.entries()].sort((x, y) => { const px = byId(S.plano, x[0]), py = byId(S.plano, y[0]); return cmpCod(px ? px.codigo : "9", py ? py.codigo : "9"); }).forEach(([pid, v]) => {
        const pl = byId(S.plano, pid), rot = pl ? `${pl.codigo} ${pl.nome}` : "Sem plano de contas";
        corpo += linha(esc(rot), v, "", 1, neg); csvL("   " + rot, v, neg);
      });
    });
    bloco("Receita");
    corpo += linha("= Total de receitas", rec, "tot"); csvL("= Total de receitas", rec);
    bloco("Despesa");
    corpo += linha("= Total de despesas", desp, "tot", 0, true); csvL("= Total de despesas", desp, true);
    corpo += linha("<b>= RESULTADO OPERACIONAL</b>", res, "lvl1"); csvL("= RESULTADO OPERACIONAL", res);
    const margem = rec.map((x, i) => (x ? Math.round((res[i] / x) * 1000) / 10 : null));
    corpo += `<tr><td class="sticky muted">Margem (%)</td>${margem.map((m) => `<td class="num muted">${m === null ? "–" : m + "%"}</td>`).join("")}<td class="num muted">${totRec ? Math.round((somaV(res) / totRec) * 1000) / 10 + "%" : "–"}</td><td></td></tr>`;
    const semCat = grupos.has("sem-Receita") || grupos.has("sem-Despesa");
    $("#view").innerHTML = `
      <div class="toolbar">
        <div class="seg-tabs"><button data-rg="competencia" class="${!caixa ? "on" : ""}">Competência (vencimento)</button><button data-rg="caixa" class="${caixa ? "on" : ""}">Caixa (pagamento)</button></div>
        <button class="btn ghost sm" id="dre-cats">📑 Categorias da DRE</button>
        <button class="btn ghost sm" id="dre-csv">⬇️ Exportar (Excel)</button>
      </div>
      <div class="grid g3">
        ${kpi("RECEITAS NO ANO", fmt(totRec), "", "var(--green)", "var(--light)")}
        ${kpi("DESPESAS NO ANO", fmt(somaV(desp)), "", "var(--red)", "var(--lred)")}
        ${kpi("RESULTADO OPERACIONAL", fmt(somaV(res)), totRec ? `margem de ${Math.round((somaV(res) / totRec) * 1000) / 10}%` : "", somaV(res) >= 0 ? "var(--blue)" : "var(--red)", "var(--lblue)")}
      </div>
      ${semCat ? `<div class="alerta red mt">⚠️ Há contas do plano <b>sem categoria da DRE</b>. Defina em Cadastros → Plano de contas.</div>` : ""}
      ${fora ? `<p class="muted mt">🚫 ${fmt(fora)} em lançamentos marcados como "Não entra na DRE" (ex.: pessoais) ficaram de fora. Dica: use a visão 🏢 Empresa no topo.</p>` : ""}
      <div class="card mt"><h3>📊 Resultado mês a mês</h3><div class="chart-box"><canvas id="ch-dre"></canvas></div></div>
      <div class="card mt"><h3>📑 DRE ${a} — ${caixa ? "regime de caixa" : "regime de competência"}</h3>
        <div class="tbl-wrap"><table><thead><tr><th class="sticky">Descrição</th>${MESES.map((m) => `<th class="num">${m.slice(0, 3)}</th>`).join("")}<th class="num">Total</th><th class="num">% receita</th></tr></thead>
        <tbody>${corpo}</tbody></table></div>
        <p class="muted" style="margin-top:10px">Receitas − Despesas = Resultado operacional. ${caixa ? "Considera só o que foi pago/recebido, pela data do pagamento." : "Considera tudo pela data de vencimento, pago ou não."}</p></div>`;
    $$("[data-rg]").forEach((b) => (b.onclick = () => { ui.dreRegime = b.dataset.rg; render(); }));
    $("#dre-cats").onclick = () => { ui.view = "cadastros"; ui.cad = "dre"; render(); };
    $("#dre-csv").onclick = () => baixarCSV(`dre-${a}.csv`, csv);
    grafico("ch-dre", { type: "bar", data: { labels: MESES.map((m) => m.slice(0, 3)), datasets: [
      { label: "Receitas", data: rec, backgroundColor: "#1f5fd6", borderRadius: 5 }, { label: "Despesas", data: desp, backgroundColor: "#f08a7e", borderRadius: 5 },
      { type: "line", label: "Resultado", data: res, borderColor: "#0a2a5e", backgroundColor: "#0a2a5e", tension: 0.3 }] },
      options: { plugins: { legend: { position: "bottom" }, tooltip: { callbacks: { label: (c) => ` ${c.dataset.label}: ${fmt(c.raw)}` } } }, scales: { x: { grid: { display: false } }, y: { ticks: { callback: tickBRL } } } } });
  }

  // ---------- IMPORTAR EXTRATO (OFX / XLSX / CSV) ----------
  function carregarXLSX() {
    if (window.XLSX) return Promise.resolve();
    return new Promise((ok, erro) => {
      const sc = document.createElement("script");
      sc.src = "https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js";
      sc.onload = ok; sc.onerror = () => erro(new Error("Não consegui carregar o leitor de planilhas. Verifique a internet."));
      document.head.appendChild(sc);
    });
  }
  function lerTexto(buf) {
    const u = new TextDecoder("utf-8").decode(buf);
    return u.includes("\uFFFD") ? new TextDecoder("windows-1252").decode(buf) : u;
  }
  function lerOFX(txt) {
    const tag = (bloco, nome) => { const m = bloco.match(new RegExp("<" + nome + ">([^<\\r\\n]*)", "i")); return m ? m[1].trim() : ""; };
    const blocos = txt.split(/<STMTTRN>/i).slice(1).map((b) => b.split(/<\/STMTTRN>/i)[0]);
    return blocos.map((b) => {
      const dt = tag(b, "DTPOSTED");
      const valor = parseFloat(tag(b, "TRNAMT").replace(",", "."));
      return { data: dt ? `${dt.slice(0, 4)}-${dt.slice(4, 6)}-${dt.slice(6, 8)}` : "", descricao: tag(b, "MEMO") || tag(b, "NAME") || "Lançamento do extrato", valor, fitid: tag(b, "FITID") };
    }).filter((x) => x.data && !isNaN(x.valor) && x.valor !== 0);
  }
  function numBR(v) {
    if (typeof v === "number") return v;
    let t = String(v ?? "").trim();
    if (!t) return NaN;
    const negD = /\bD\b|\(.*\)/i.test(t) || /^-/.test(t) || /-$/.test(t);
    t = t.replace(/[^\d,.-]/g, "").replace(/-/g, "");
    if (t.includes(",") && t.lastIndexOf(",") > t.lastIndexOf(".")) t = t.replace(/\./g, "").replace(",", ".");
    else t = t.replace(/,/g, "");
    const n = parseFloat(t);
    return isNaN(n) ? NaN : negD ? -n : n;
  }
  function dataPlanilha(v) {
    if (v instanceof Date && !isNaN(v)) return `${v.getFullYear()}-${pad(v.getMonth() + 1)}-${pad(v.getDate())}`;
    if (typeof v === "number" && v > 20000 && v < 80000) { const d = new Date(Math.round((v - 25569) * 864e5)); return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`; }
    const t = String(v ?? "").trim();
    let m = t.match(/^(\d{1,2})[/.-](\d{1,2})[/.-](\d{2,4})/);
    if (m) { const y = m[3].length === 2 ? "20" + m[3] : m[3]; return `${y}-${pad(m[2])}-${pad(m[1])}`; }
    m = t.match(/^(\d{4})-(\d{2})-(\d{2})/);
    return m ? `${m[1]}-${m[2]}-${m[3]}` : "";
  }
  async function lerPlanilha(buf) {
    await carregarXLSX();
    const wb = XLSX.read(buf, { type: "array", cellDates: true });
    const linhas = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], { header: 1, raw: true, defval: "" });
    const norm = (x) => String(x).toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").trim();
    const hi = linhas.findIndex((l) => l.some((c) => /^data/.test(norm(c))) && l.some((c) => /valor|credito|debito|entrada|saida/.test(norm(c))));
    if (hi < 0) throw new Error('Não achei as colunas. A planilha precisa ter um cabeçalho com "Data", "Descrição" (ou "Histórico") e "Valor" (ou "Crédito" e "Débito").');
    const cab = linhas[hi].map(norm);
    const col = (re) => cab.findIndex((c) => re.test(c));
    const cData = col(/^data/), cDesc = col(/descri|histor|lancamento|memo|detalhe/), cVal = col(/^valor/), cCred = col(/credito|entrada/), cDeb = col(/debito|saida/);
    const r = [];
    linhas.slice(hi + 1).forEach((l) => {
      const data = dataPlanilha(l[cData]);
      let valor = cVal >= 0 ? numBR(l[cVal]) : NaN;
      if (isNaN(valor)) { const c = numBR(l[cCred]), d = numBR(l[cDeb]); valor = (isNaN(c) ? 0 : Math.abs(c)) - (isNaN(d) ? 0 : Math.abs(d)); }
      const desc = cDesc >= 0 ? String(l[cDesc]).trim() : "";
      if (data && valor && !/saldo/i.test(desc)) r.push({ data, descricao: desc || "Lançamento do extrato", valor: round2(valor), fitid: "" });
    });
    return r;
  }
  const chaveDesc = (d) => String(d).toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[\d/.,*-]+/g, " ").split(/\s+/).filter(Boolean).slice(0, 3).join(" ");
  function sugerirPlano(desc, tipo) {
    const k = chaveDesc(desc);
    const igual = S.titulos.slice().reverse().find((t) => t.tipo === tipo && chaveDesc(t.descricao) === k && byId(S.plano, t.planoId));
    return igual ? igual.planoId : "";
  }
  function formImportar(contaId) {
    if (!S.contas.length) return alert("Cadastre uma conta bancária primeiro (Cadastros → Bancos e contas).");
    const form = modal("📄 Importar extrato bancário", `
      <p class="muted" style="margin-bottom:12px">Baixe o extrato no site/app do seu banco em <b>OFX</b> (recomendado), <b>Excel (XLSX)</b> ou <b>CSV</b>. Os lançamentos entram como já pagos/recebidos.</p>
      <div class="field"><label>Conta do extrato</label><select name="conta">${opts(S.contas, contaId || S.contas[0].id)}</select></div>
      <div class="field"><label>Arquivo</label><input name="arq" type="file" accept=".ofx,.xlsx,.xls,.csv" required></div>
      <div id="imp-prev"></div>`, (f) => {
      const linhas = form._linhas;
      if (!linhas) { alert("Escolha o arquivo primeiro."); return false; }
      let n = 0;
      linhas.forEach((x, i) => {
        if (!f["ok-" + i] || !f["ok-" + i].checked) return;
        const tipo = x.valor > 0 ? "Receita" : "Despesa";
        S.titulos.push({ id: uid(), tipo, descricao: x.descricao, pessoa: "", valor: Math.abs(x.valor), venc: x.data, pago: x.data, contaId: f.conta.value,
          planoId: f["pl-" + i].value, filialId: ui.filial, centroId: "", verticalId: "", pessoal: false, forma: "Transferência", obs: "Importado do extrato", fitid: x.fitid || "" });
        n++;
      });
      if (!n) { alert("Nenhum lançamento marcado."); return false; }
      mudou(); toast(`${n} lançamento(s) importado(s) ✓`);
    }, "Importar marcados");
    const prever = async () => {
      const arq = form.arq.files[0];
      if (!arq) return;
      const box = form.querySelector("#imp-prev");
      box.innerHTML = '<p class="muted">Lendo arquivo…</p>';
      try {
        const buf = await arq.arrayBuffer();
        const linhas = /\.ofx$/i.test(arq.name) ? lerOFX(lerTexto(buf)) : await lerPlanilha(buf);
        if (!linhas.length) throw new Error("Não encontrei lançamentos nesse arquivo.");
        const conta = form.conta.value;
        const dup = (x) => S.titulos.some((t) => t.contaId === conta && ((x.fitid && t.fitid === x.fitid) || (t.pago === x.data && Math.abs(t.valor - Math.abs(x.valor)) < 0.005 && t.descricao === x.descricao)));
        form._linhas = linhas;
        const opPlano = (tipo, sel) => folhas(tipo).map((p) => `<option value="${p.id}" ${sel === p.id ? "selected" : ""}>${esc(p.codigo)} ${esc(p.nome)}</option>`).join("");
        const nDup = linhas.filter(dup).length;
        box.innerHTML = `<p style="margin:6px 0 10px"><b>${linhas.length}</b> lançamento(s) encontrado(s)${nDup ? ` · <span class="neg">${nDup} já importado(s) (desmarcados)</span>` : ""}. Confira o plano de contas de cada um:</p>
          <div class="tbl-wrap" style="max-height:45vh;overflow:auto"><table><thead><tr><th></th><th>Data</th><th>Descrição</th><th class="num">Valor</th><th>Plano de contas</th></tr></thead><tbody>
          ${linhas.map((x, i) => { const tipo = x.valor > 0 ? "Receita" : "Despesa", d = dup(x);
            return `<tr><td><input type="checkbox" name="ok-${i}" ${d ? "" : "checked"} aria-label="Importar"></td><td>${dataBR(x.data)}</td><td style="white-space:normal;min-width:160px">${esc(x.descricao)}${d ? ' <span class="badge r">duplicado</span>' : ""}</td>
            <td class="num ${x.valor > 0 ? "pos" : "neg"}">${fmt(x.valor)}</td><td><select class="inp" name="pl-${i}" style="min-width:180px">${opPlano(tipo, sugerirPlano(x.descricao, tipo))}</select></td></tr>`; }).join("")}
          </tbody></table></div>`;
      } catch (e) {
        form._linhas = null;
        box.innerHTML = `<div class="msg err">${esc(e.message)}</div>`;
      }
    };
    form.arq.onchange = prever;
    form.conta.onchange = prever;
  }

  // ---------- METAS ----------
  function telaMetas() {
    const cards = S.metas.map((mt) => {
      const p = mt.valor ? Math.min(1, mt.guardado / mt.valor) : 0, falta = Math.max(0, mt.valor - mt.guardado);
      let porMes = "";
      if (mt.prazo && falta > 0) {
        const [y, mm] = mt.prazo.split("-").map(Number);
        porMes = `Guardar ${fmt(falta / Math.max(1, (y - hoje.getFullYear()) * 12 + mm - (hoje.getMonth() + 1)))} por mês`;
      }
      const st = falta === 0 ? "🎉 Concluída!" : !mt.prazo ? "Defina um prazo" : mt.prazo < HOJE ? "⏰ Prazo vencido" : "🚀 Em andamento";
      return `<div class="card meta-card"><div class="top-line"><div><b>${esc(mt.nome)}</b><div class="muted">${st}</div></div>
        <div style="white-space:nowrap"><button class="ico-btn" data-add="${mt.id}" title="Guardar dinheiro">💰</button><button class="ico-btn" data-editm="${mt.id}" aria-label="Editar">✏️</button><button class="ico-btn" data-delm="${mt.id}" aria-label="Apagar">🗑️</button></div></div>
        <div class="bar"><i style="width:${p * 100}%"></i></div>
        <div class="info"><span><b>${fmt(mt.guardado)}</b> de ${fmt(mt.valor)} (${Math.round(p * 100)}%)</span><span>${mt.prazo ? "Prazo: " + dataBR(mt.prazo) : ""}</span></div>
        ${porMes ? `<div class="info" style="margin-top:6px"><span>🎯 ${porMes}</span><span>Falta ${fmt(falta)}</span></div>` : ""}</div>`;
    }).join("");
    $("#view").innerHTML = `<div class="toolbar"><button class="btn" id="nova-meta">+ Nova meta</button></div>
      <div class="grid g2">${cards || '<div class="card empty">Cadastre um objetivo: reserva de emergência, capital de giro, uma viagem...</div>'}</div>`;
    $("#nova-meta").onclick = () => formMeta();
    $$("[data-editm]").forEach((b) => (b.onclick = () => formMeta(byId(S.metas, b.dataset.editm))));
    $$("[data-delm]").forEach((b) => (b.onclick = () => { if (confirm("Apagar esta meta?")) { S.metas = S.metas.filter((x) => x.id !== b.dataset.delm); mudou(); } }));
    $$("[data-add]").forEach((b) => (b.onclick = () => {
      const mt = byId(S.metas, b.dataset.add);
      modal(`💰 Guardar para "${esc(mt.nome)}"`, `<div class="field"><label>Quanto você guardou agora? (R$)</label><input name="v" type="number" step="0.01" min="0.01" inputmode="decimal" required autofocus></div>`,
        (f) => { mt.guardado = round2(mt.guardado + parseFloat(f.v.value)); mudou(); toast("Valor adicionado 🎉"); });
    }));
  }

  // ================= FORMULÁRIOS =================
  function modal(titulo, corpo, onSubmit, textoBotao = "Salvar") {
    const root = $("#modal-root");
    root.innerHTML = `<div class="modal-bg"><form class="modal"><h3>${titulo}</h3>${corpo}
      <div class="acts"><button type="button" class="btn ghost" data-close>Cancelar</button>${onSubmit ? `<button class="btn" data-ok>${textoBotao}</button>` : ""}</div></form></div>`;
    const bg = root.firstElementChild, form = bg.querySelector("form");
    const fechar = () => (root.innerHTML = "");
    bg.addEventListener("click", (e) => { if (e.target === bg) fechar(); });
    form.querySelector("[data-close]").onclick = fechar;
    form.onsubmit = (e) => { e.preventDefault(); if (onSubmit && onSubmit(form) !== false) fechar(); };
    const first = form.querySelector("[autofocus]");
    if (first) setTimeout(() => first.focus(), 50);
    return form;
  }
  function escolha(titulo, opcoes) {
    const form = modal(titulo, `<div class="choice">${opcoes.map(([l], i) => `<button type="button" data-op="${i}">${l}</button>`).join("")}</div>`, null);
    form.querySelectorAll("[data-op]").forEach((b) => (b.onclick = () => { $("#modal-root").innerHTML = ""; opcoes[+b.dataset.op][1](); }));
  }
  const opts = (lista, sel, vazio) => (vazio ? `<option value="">${vazio}</option>` : "") + lista.map((x) => `<option value="${x.id}" ${sel === x.id ? "selected" : ""}>${esc(x.nome)}</option>`).join("");

  function formTitulo(tipo, t) {
    const rec = tipo === "Receita", novo = !t;
    const fl = folhas(tipo);
    if (!fl.length) return alert(`Cadastre primeiro uma conta de ${tipo.toLowerCase()} no Plano de contas.`);
    const vencPadrao = ui.ano === hoje.getFullYear() && ui.mes === hoje.getMonth() + 1 ? HOJE : `${ym(ui.ano, ui.mes)}-10`;
    const d0 = t || { tipo, descricao: "", pessoa: "", valor: "", venc: vencPadrao, pago: "", contaId: (S.contas[0] || {}).id || "", planoId: "", filialId: ui.filial, centroId: "", verticalId: "", pessoal: ui.visao === "pessoal", forma: "Pix", obs: "" };
    const planoOpts = fl.map((p) => `<option value="${p.id}" ${d0.planoId === p.id ? "selected" : ""}>${esc(p.codigo)} — ${esc(p.nome)}</option>`).join("");
    const corpo = `
      <div class="field"><label>Descrição</label><input name="descricao" required maxlength="80" value="${esc(d0.descricao)}" placeholder="${rec ? "Ex.: Venda para cliente X" : "Ex.: Conta de luz"}" autofocus></div>
      <div class="row2">
        <div class="field"><label>Valor${novo ? " (total)" : ""} R$</label><input name="valor" type="number" step="0.01" min="0.01" inputmode="decimal" required value="${d0.valor}"></div>
        <div class="field"><label>Vencimento</label><input name="venc" type="date" required value="${d0.venc}"></div>
      </div>
      <div class="field"><label>${rec ? "Cliente" : "Fornecedor"} (opcional)</label><input name="pessoa" maxlength="80" value="${esc(d0.pessoa || "")}"></div>
      <div class="field"><label>Plano de contas</label><select name="planoId" required>${planoOpts}</select></div>
      <div class="row2">
        <div class="field"><label>Conta bancária</label><select name="contaId">${opts(S.contas, d0.contaId, "(nenhuma)")}</select></div>
        <div class="field"><label>Forma de ${rec ? "recebimento" : "pagamento"}</label><select name="forma">${FORMAS.map((f) => `<option ${d0.forma === f ? "selected" : ""}>${f}</option>`).join("")}</select></div>
      </div>
      <label class="check"><input type="checkbox" name="pessoal" ${d0.pessoal ? "checked" : ""}> 🙋 É um lançamento <b>pessoal</b> (não da empresa)</label>
      <details class="mais" ${d0.filialId || d0.centroId || d0.verticalId ? "open" : ""}><summary>🏬 Filial, centro de custo e vertical</summary>
        <div class="field"><label>Filial</label><select name="filialId">${opts(S.filiais, d0.filialId, "(não informado)")}</select></div>
        <div class="row2"><div class="field"><label>Centro de custo</label><select name="centroId">${opts(S.centros, d0.centroId, "(não informado)")}</select></div>
        <div class="field"><label>Vertical</label><select name="verticalId">${opts(S.verticais, d0.verticalId, "(não informado)")}</select></div></div>
        <p class="muted">Crie novos itens em <b>Cadastros</b>.</p>
      </details>
      ${novo ? `<details class="mais"><summary>🔁 Parcelar ou repetir</summary>
        <div class="row2"><div class="field"><label>Tipo</label><select name="rep"><option value="nao">Não repetir</option><option value="parcelar">Parcelar (divide o valor)</option><option value="mensal">Repetir todo mês (mesmo valor)</option></select></div>
        <div class="field"><label>Quantidade de meses</label><input name="n" type="number" min="2" max="120" value="12"></div></div></details>` : ""}
      <label class="check"><input type="checkbox" name="jaPago" ${d0.pago ? "checked" : ""}> ✔ Já foi ${rec ? "recebido" : "pago"}</label>
      <div class="field ${d0.pago ? "" : "hidden"}" id="campo-pago"><label>Data do ${rec ? "recebimento" : "pagamento"}</label><input name="pago" type="date" value="${d0.pago || HOJE}"></div>
      <div class="field"><label>Observação (opcional)</label><input name="obs" maxlength="200" value="${esc(d0.obs || "")}"></div>`;
    const form = modal(novo ? (rec ? "📥 Nova conta a receber" : "📤 Nova conta a pagar") : "✏️ Editar", corpo, (f) => {
      const d = { tipo, descricao: f.descricao.value.trim(), pessoa: f.pessoa.value.trim(), valor: round2(parseFloat(f.valor.value)), venc: f.venc.value,
        pago: f.jaPago.checked ? f.pago.value || HOJE : "", contaId: f.contaId.value, planoId: f.planoId.value, forma: f.forma.value, pessoal: f.pessoal.checked,
        filialId: f.filialId.value, centroId: f.centroId.value, verticalId: f.verticalId.value, obs: f.obs.value.trim() };
      if (!d.descricao) { alert("Digite uma descrição."); return false; }
      if (!(d.valor > 0)) { alert("Digite um valor maior que zero."); return false; }
      if (!d.venc) { alert("Escolha a data de vencimento."); return false; }
      if (!novo) { Object.assign(t, d); mudou(); toast("Atualizado ✓"); return; }
      const rep = f.rep.value, n = Math.min(120, Math.max(2, parseInt(f.n.value, 10) || 2));
      if (rep === "nao") S.titulos.push(Object.assign({ id: uid() }, d));
      else {
        const grupo = uid();
        const parte = rep === "parcelar" ? Math.floor((d.valor / n) * 100) / 100 : d.valor;
        for (let i = 0; i < n; i++) {
          const valor = rep === "parcelar" && i === n - 1 ? round2(d.valor - parte * (n - 1)) : parte;
          S.titulos.push(Object.assign({}, d, { id: uid(), grupo, valor, venc: addMeses(d.venc, i), pago: i === 0 ? d.pago : "",
            descricao: rep === "parcelar" ? `${d.descricao} (${i + 1}/${n})` : d.descricao }));
        }
      }
      const [y, m] = d.venc.split("-").map(Number); ui.ano = y; ui.mes = m;
      mudou(); toast(rep === "nao" ? "Lançamento salvo ✓" : `${n} lançamentos criados ✓`);
    });
    form.jaPago.onchange = () => form.querySelector("#campo-pago").classList.toggle("hidden", !form.jaPago.checked);
  }

  function formBaixa(t) {
    const rec = t.tipo === "Receita";
    modal(`✔ ${rec ? "Receber" : "Pagar"}: ${esc(t.descricao)}`, `
      <p style="margin-bottom:12px">Valor: <b>${fmt(t.valor)}</b> · vencimento ${dataBR(t.venc)}</p>
      <div class="row2"><div class="field"><label>Data</label><input name="data" type="date" required value="${HOJE}"></div>
      <div class="field"><label>Valor ${rec ? "recebido" : "pago"} (R$)</label><input name="valor" type="number" step="0.01" min="0.01" inputmode="decimal" required value="${t.valor}"></div></div>
      <div class="field"><label>Conta</label><select name="contaId">${opts(S.contas, t.contaId, "(nenhuma)")}</select></div>
      <p class="muted">Se o valor for diferente (juros ou desconto), ele será atualizado.</p>`, (f) => {
      t.pago = f.data.value || HOJE; t.contaId = f.contaId.value; t.valor = round2(parseFloat(f.valor.value) || t.valor);
      mudou(); toast(rec ? "Recebimento registrado ✓" : "Pagamento registrado ✓");
    }, "Confirmar");
  }

  function formMeta(mt) {
    modal(mt ? "✏️ Editar meta" : "🎯 Nova meta", `
      <div class="field"><label>Nome da meta</label><input name="nome" required maxlength="60" value="${mt ? esc(mt.nome) : ""}" autofocus></div>
      <div class="row2"><div class="field"><label>Valor da meta (R$)</label><input name="valor" type="number" step="0.01" min="1" inputmode="decimal" required value="${mt ? mt.valor : ""}"></div>
      <div class="field"><label>Já guardei (R$)</label><input name="guardado" type="number" step="0.01" min="0" inputmode="decimal" value="${mt ? mt.guardado : 0}"></div></div>
      <div class="field"><label>Prazo</label><input name="prazo" type="date" value="${mt ? mt.prazo || "" : ""}"></div>`, (f) => {
      const d = { nome: f.nome.value.trim(), valor: parseFloat(f.valor.value) || 0, guardado: parseFloat(f.guardado.value) || 0, prazo: f.prazo.value };
      if (mt) Object.assign(mt, d); else S.metas.push(Object.assign({ id: uid() }, d));
      mudou();
    });
  }

  // ================= NAVEGAÇÃO =================
  function ligarApp() {
    $$(".nav-btn").forEach((b) => (b.onclick = () => { ui.view = b.dataset.view; ui.busca = ""; ui.status = "todos"; window.scrollTo(0, 0); render(); }));
    const anual = () => (ui.view === "fluxo" && ui.fluxoModo === "mensal") || ui.view === "dre";
    $("#prev").onclick = () => { if (anual()) ui.ano--; else if (--ui.mes < 1) { ui.mes = 12; ui.ano--; } render(); };
    $("#next").onclick = () => { if (anual()) ui.ano++; else if (++ui.mes > 12) { ui.mes = 1; ui.ano++; } render(); };
    $("#visao").onchange = (e) => { ui.visao = e.target.value; render(); };
    $("#filial-f").onchange = (e) => { ui.filial = e.target.value; render(); };
    $("#fab").onclick = () => {
      if (ui.view === "pagar") return formTitulo("Despesa");
      if (ui.view === "receber") return formTitulo("Receita");
      escolha("O que você quer lançar?", [["📤 Conta a pagar (despesa)", () => formTitulo("Despesa")], ["📥 Conta a receber (receita)", () => formTitulo("Receita")]]);
    };
    const sair = async () => {
      if (modo === "demo") { location.href = location.pathname; return; }
      if (pendente || salvando) { clearTimeout(saveTimer); saveTimer = null; await enviarDados(); }
      await api("/api/sair", { method: "POST", body: "{}" }); location.reload();
    };
    $("#logout").onclick = sair; $("#logout-m").onclick = sair;
  }
  function abrirApp(email) {
    $("#auth").classList.add("hidden");
    $("#app").classList.remove("hidden");
    $("#demo-bar").classList.toggle("hidden", modo !== "demo");
    $("#demo-buy").href = cfg.linkCompra;
    $("#user-email").textContent = email;
    if (modo === "demo") $("#logout").textContent = "Sair da demonstração";
    ligarApp(); render();
  }
  function validarEstado(d) {
    if (!d || !Array.isArray(d.plano)) return estadoVazio();
    ["contas", "centros", "verticais", "filiais", "titulos", "metas"].forEach((k) => { if (!Array.isArray(d[k])) d[k] = []; });
    if (!Array.isArray(d.dreCats)) { d.dreCats = dreCatsPadrao(); d.plano.forEach((p) => { if (p.dre === undefined) p.dre = DRE_MAPA[p.nome] || ""; }); }
    return d;
  }

  // ================= LOGIN =================
  function telaAuth(tipo, aviso) {
    $("#auth").classList.remove("hidden");
    $("#app").classList.add("hidden");
    const box = $("#auth-content");
    const msg = aviso ? `<div class="msg ${aviso.ok ? "ok" : "err"}">${aviso.t}</div>` : "";
    if (tipo === "semacesso") {
      box.innerHTML = `<h2>Quase lá! 🔒</h2>${msg}<p class="sub">Seu e-mail ainda não tem acesso liberado.</p>
        <p style="font-size:.9rem;margin-bottom:16px">Se você já comprou, use o <b>mesmo e-mail da compra</b>. A liberação pode levar alguns minutos.</p>
        <a class="btn yellow full" href="${esc(cfg.linkCompra)}">Comprar acesso</a>
        <div class="auth-links"><button class="link" id="recheck">Já comprei, verificar de novo</button><button class="link" id="sair">Sair</button></div>`;
      $("#recheck").onclick = iniciarNuvem;
      $("#sair").onclick = async () => { await api("/api/sair", { method: "POST", body: "{}" }); telaAuth("login"); };
      return;
    }
    if (tipo === "esqueci") {
      box.innerHTML = `<h2>Esqueci minha senha</h2><p class="sub">Fale com o suporte e enviaremos uma nova senha.</p>
        ${cfg.suporte ? `<a class="btn full" href="mailto:${esc(cfg.suporte)}?subject=Nova%20senha%20-%20Controller">✉️ ${esc(cfg.suporte)}</a>` : '<p class="muted">Responda o e-mail da sua compra pedindo uma nova senha.</p>'}
        <div class="auth-links"><button class="link" data-go="login">← Voltar</button></div>`;
    } else {
      const cad = tipo === "cadastro";
      box.innerHTML = `<h2>${cad ? "Criar minha conta" : "Entrar"}</h2>
        <p class="sub">${cad ? "Use o <b>mesmo e-mail da compra</b>." : "Acesse seu controle financeiro."}</p>${msg}
        <form id="f">
          <div class="field"><label>E-mail</label><input name="email" type="email" required autocomplete="email"></div>
          <div class="field"><label>Senha ${cad ? "(mínimo 6 caracteres)" : ""}</label><input name="senha" type="password" minlength="6" required autocomplete="${cad ? "new-password" : "current-password"}"></div>
          <button class="btn full" id="go">${cad ? "Criar conta" : "Entrar"}</button>
        </form>
        <div class="auth-links">${cad ? '<button class="link" data-go="login">Já tenho conta</button>' : '<button class="link" data-go="cadastro">Primeiro acesso? Criar conta</button><button class="link" data-go="esqueci">Esqueci a senha</button>'}</div>
        <div class="divider">ou</div><a class="btn ghost full" href="?demo=1">👀 Ver demonstração grátis</a>`;
      $("#f").onsubmit = async (e) => {
        e.preventDefault();
        const body = JSON.stringify({ email: e.target.email.value.trim(), senha: e.target.senha.value });
        $("#go").disabled = true; $("#go").textContent = "Aguarde…";
        let r;
        try { r = await api(cad ? "/api/cadastro" : "/api/login", { method: "POST", body }); }
        catch (err) { return telaAuth(tipo, { t: "Sem conexão. Verifique sua internet." }); }
        if (r.ok) return iniciarNuvem();
        if (r.d.erro === "sem_acesso") return telaAuth("semacesso");
        if (r.d.erro === "sem_compra") return telaAuth("cadastro", { t: `Esse e-mail ainda não está liberado. Use o <b>mesmo e-mail da compra</b> ou aguarde alguns minutos. <a href="${esc(cfg.linkCompra)}">Comprar acesso</a>` });
        telaAuth(tipo, { t: esc(r.d.erro || "Algo deu errado. Tente de novo.") });
      };
    }
    box.querySelectorAll("[data-go]").forEach((b) => (b.onclick = () => telaAuth(b.dataset.go)));
  }
  async function iniciarNuvem() {
    let r;
    try { r = await api("/api/eu"); } catch (e) { return telaAuth("login", { t: "Sem conexão com o servidor." }); }
    if (r.status === 401) return telaAuth(new URLSearchParams(location.search).has("cadastro") ? "cadastro" : "login");
    if (r.status === 403) return telaAuth("semacesso");
    if (!r.ok) return telaAuth("login", { t: esc(r.d.erro || "Erro no servidor.") });
    const dd = await api("/api/dados");
    if (!dd.ok) return telaAuth("login", { t: "Não consegui carregar seus dados: " + esc(dd.d.erro || "") });
    modo = "nuvem"; versao = dd.d.versao || 0;
    S = validarEstado(dd.d.conteudo);
    if (!dd.d.conteudo) salvar();
    abrirApp(r.d.email);
  }

  // ================= INÍCIO =================
  (async () => {
    try { const c = await api("/api/config"); if (c.ok) cfg = c.d; } catch (e) { /* sem servidor */ }
    if (new URLSearchParams(location.search).has("demo")) {
      modo = "demo";
      let salvo = null;
      try { salvo = JSON.parse(localStorage.getItem("gnc-demo-v2") || "null"); } catch (e) { /* ignora */ }
      S = salvo && salvo.plano ? validarEstado(salvo) : estadoDemo();
      salvar(); abrirApp("Demonstração");
    } else iniciarNuvem();
  })();
})();
