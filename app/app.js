/* Grana no Controle — app de controle financeiro */
(function () {
  "use strict";

  // ---------- utilidades ----------
  const CFG = window.APP_CONFIG || {};
  const $ = (s) => document.querySelector(s);
  const MESES = ["Janeiro","Fevereiro","Março","Abril","Maio","Junho","Julho","Agosto","Setembro","Outubro","Novembro","Dezembro"];
  const FORMAS = ["Pix","Cartão de crédito","Cartão de débito","Dinheiro","Boleto","Transferência"];
  const GRUPOS = ["Essencial","Estilo de vida","Futuro"];
  const CORES = ["#1e8e5a","#f08a7e","#1f6fb2","#ffc83d","#8e6cc0","#5c6b64","#2bb3a3","#e67e22"];
  const brl = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });
  const fmt = (v) => brl.format(v || 0);
  const pct = (v) => Math.round((v || 0) * 100) + "%";
  const pad = (n) => String(n).padStart(2, "0");
  const uid = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4);
  const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const hoje = new Date();
  const hojeISO = () => `${hoje.getFullYear()}-${pad(hoje.getMonth() + 1)}-${pad(hoje.getDate())}`;
  const linkCompra = CFG.LINK_COMPRA || "#";

  function toast(t) {
    const d = document.createElement("div");
    d.className = "toast"; d.textContent = t;
    document.body.appendChild(d);
    setTimeout(() => d.remove(), 2200);
  }

  // ---------- dados iniciais ----------
  function categoriasPadrao() {
    return [
      ["Salário","Receita","",0],["Renda extra","Receita","",0],
      ["Moradia","Despesa","Essencial",1200],["Alimentação","Despesa","Essencial",900],["Transporte","Despesa","Essencial",400],
      ["Saúde","Despesa","Essencial",300],["Contas (luz, água, internet)","Despesa","Essencial",350],["Educação","Despesa","Essencial",200],
      ["Lazer","Despesa","Estilo de vida",300],["Compras","Despesa","Estilo de vida",250],["Restaurantes e delivery","Despesa","Estilo de vida",200],
      ["Assinaturas","Despesa","Estilo de vida",80],["Investimentos","Despesa","Futuro",400],["Dívidas / Cartão","Despesa","Futuro",0],["Outros","Despesa","Estilo de vida",100]
    ].map(([nome, tipo, grupo, orcamento]) => ({ id: uid(), nome, tipo, grupo, orcamento }));
  }
  function estadoVazio() {
    return { versao: 1, categorias: categoriasPadrao(), lancamentos: [], metas: [] };
  }
  function estadoDemo() {
    const s = estadoVazio();
    const c = (n) => s.categorias.find((x) => x.nome === n).id;
    const base = [
      [5,"Salário","Salário",3500,"Transferência"],[6,"Aluguel","Moradia",1200,"Pix"],[8,"Mercado do mês","Alimentação",650,"Cartão de débito"],
      [10,"Freela de design","Renda extra",600,"Pix"],[12,"Luz + internet","Contas (luz, água, internet)",260,"Boleto"],
      [14,"Aplicativo de transporte","Transporte",180,"Cartão de crédito"],[15,"Investimento mensal","Investimentos",300,"Transferência"],
      [18,"Pizza no fim de semana","Restaurantes e delivery",95,"Cartão de crédito"],[20,"Farmácia","Saúde",90,"Dinheiro"],
      [22,"Cinema","Lazer",80,"Cartão de crédito"],[25,"Streaming","Assinaturas",45,"Cartão de crédito"],[27,"Roupa nova","Compras",280,"Cartão de crédito"]
    ];
    for (let k = 2; k >= 0; k--) {
      const d = new Date(hoje.getFullYear(), hoje.getMonth() - k, 1);
      const fator = [1.15, 0.9, 1][k];
      base.forEach(([dia, desc, cat, v, f], i) => {
        const diaReal = k === 0 ? Math.max(1, Math.round((dia / 28) * hoje.getDate())) : dia;
        const tipo = s.categorias.find((x) => x.id === c(cat)).tipo;
        const valor = tipo === "Receita" ? v : Math.round(v * (i % 3 === 0 ? 1 : fator) * 100) / 100;
        s.lancamentos.push({ id: uid(), data: `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(diaReal)}`, descricao: desc, categoriaId: c(cat), valor, forma: f });
      });
    }
    s.metas = [
      { id: uid(), nome: "Reserva de emergência", valor: 6000, guardado: 1500, prazo: `${hoje.getFullYear() + 1}-06-30` },
      { id: uid(), nome: "Viagem de férias", valor: 4000, guardado: 2600, prazo: `${hoje.getFullYear() + 1}-01-15` }
    ];
    return s;
  }

  // ---------- armazenamento ----------
  let S = null;              // estado (dados do usuário)
  let modo = "demo";         // "demo" ou "nuvem"
  let sb = null, usuario = null;
  let saveTimer = null;
  const ui = { view: "painel", ano: hoje.getFullYear(), mes: hoje.getMonth() + 1, busca: "", filtroCat: "" };

  function salvar() {
    if (modo === "demo") {
      try { localStorage.setItem("gnc-demo", JSON.stringify(S)); } catch (e) { /* sem armazenamento */ }
      return;
    }
    $("#save-st").textContent = "Salvando…";
    clearTimeout(saveTimer);
    saveTimer = setTimeout(async () => {
      const { error } = await sb.from("dados").upsert({ user_id: usuario.id, conteudo: S, atualizado_em: new Date().toISOString() });
      $("#save-st").textContent = error ? "⚠️ Erro ao salvar — verifique a internet" : "✓ Salvo na nuvem";
    }, 700);
  }
  function mudou() { salvar(); render(); }

  // ---------- cálculos ----------
  const cat = (id) => S.categorias.find((c) => c.id === id);
  const tipoDe = (l) => (cat(l.categoriaId) || {}).tipo || "Despesa";
  const doMes = (a, m) => S.lancamentos.filter((l) => l.data.slice(0, 7) === `${a}-${pad(m)}`);
  function totais(a, m) {
    let rec = 0, desp = 0;
    doMes(a, m).forEach((l) => (tipoDe(l) === "Receita" ? (rec += +l.valor) : (desp += +l.valor)));
    return { rec, desp, saldo: rec - desp };
  }
  function gastoPorCat(a, m) {
    const r = {};
    doMes(a, m).forEach((l) => { r[l.categoriaId] = (r[l.categoriaId] || 0) + +l.valor; });
    return r;
  }
  const mesAnterior = (a, m) => (m === 1 ? [a - 1, 12] : [a, m - 1]);

  // ---------- gráficos ----------
  let charts = [];
  function limparCharts() { charts.forEach((c) => c.destroy()); charts = []; }
  function grafico(id, cfg) {
    const el = document.getElementById(id);
    if (!el || !window.Chart) return;
    cfg.options = Object.assign({ responsive: true, maintainAspectRatio: false, plugins: { legend: { labels: { font: { family: "Poppins" } } } } }, cfg.options || {});
    charts.push(new Chart(el, cfg));
  }

  // ---------- telas ----------
  const TITULOS = { painel: "Painel", lancamentos: "Lançamentos", categorias: "Categorias", resumo: "Resumo do ano", metas: "Metas" };

  function render() {
    limparCharts();
    document.querySelectorAll(".nav-btn").forEach((b) => b.classList.toggle("active", b.dataset.view === ui.view));
    $("#view-title").textContent = TITULOS[ui.view];
    const anual = ui.view === "resumo";
    $("#mes-label").textContent = anual ? String(ui.ano) : `${MESES[ui.mes - 1]} ${ui.ano}`;
    $("#mes-sel").classList.toggle("hidden", ui.view === "metas");
    $("#fab").classList.toggle("hidden", ui.view === "metas");
    ({ painel: telaPainel, lancamentos: telaLancamentos, categorias: telaCategorias, resumo: telaResumo, metas: telaMetas })[ui.view]();
  }

  function kpi(lbl, val, cmp, c, bgc) {
    return `<div class="card kpi" style="--c:${c};--bgc:${bgc}"><div class="lbl">${lbl}</div><div class="val" title="${esc(val)}">${val}</div><div class="cmp">${cmp}</div></div>`;
  }
  function comparar(atual, antes) {
    if (!antes) return "sem dados do mês anterior";
    return (atual >= antes ? "▲ " : "▼ ") + Math.round(Math.abs(atual / antes - 1) * 100) + "% vs mês anterior";
  }

  function telaPainel() {
    const { ano: a, mes: m } = ui;
    const t = totais(a, m), [pa, pm] = mesAnterior(a, m), tp = totais(pa, pm);
    const guardado = t.rec ? t.saldo / t.rec : 0;
    const gastos = gastoPorCat(a, m);
    const despCats = S.categorias.filter((c) => c.tipo === "Despesa");
    const acima = despCats.filter((c) => c.orcamento > 0 && (gastos[c.id] || 0) > c.orcamento);

    let msg;
    if (!t.rec && !t.desp) msg = "👋 Nenhum lançamento neste mês ainda. Toque no botão <b>+</b> para começar!";
    else if (t.saldo < 0) msg = "⚠️ Atenção: você gastou mais do que ganhou este mês. Veja abaixo onde dá para cortar.";
    else if (guardado < 0.1) msg = "🙂 Sobrou pouco este mês. Tente guardar pelo menos 10% do que você ganha.";
    else if (guardado < 0.2) msg = "👍 Muito bem! Você guardou mais de 10%. Próximo passo: chegar a 20%.";
    else msg = "🏆 Excelente! Você guardou 20% ou mais da sua renda. Continue assim!";
    const sub = acima.length
      ? `🔴 ${acima.length} categoria(s) acima do orçamento: ${acima.map((c) => esc(c.nome)).join(", ")}.`
      : "✅ Nenhuma categoria passou do orçamento neste mês.";

    const top = despCats.map((c) => ({ c, v: gastos[c.id] || 0 })).filter((x) => x.v > 0).sort((x, y) => y.v - x.v);
    const topHtml = top.length ? top.slice(0, 6).map(({ c, v }) => {
      const p = c.orcamento ? v / c.orcamento : 0;
      const cls = !c.orcamento ? "" : p > 1 ? "over" : p > 0.8 ? "warn" : "";
      return `<div class="row-bar"><span class="nm">${esc(c.nome)}</span><span class="vl ${p > 1 ? "neg" : ""}">${fmt(v)}</span>
        <div class="bar ${cls}"><i style="width:${c.orcamento ? Math.min(100, p * 100) : 100}%"></i></div>
        <span class="meta">${c.orcamento ? `${pct(p)} de ${fmt(c.orcamento)}` : "sem limite definido"}</span></div>`;
    }).join("") : `<div class="empty">Nenhum gasto neste mês.</div>`;

    const porForma = FORMAS.map((f) => doMes(a, m).filter((l) => tipoDe(l) === "Despesa" && l.forma === f).reduce((s, l) => s + +l.valor, 0));
    const grupos = GRUPOS.map((g, i) => {
      const v = despCats.filter((c) => c.grupo === g).reduce((s, c) => s + (gastos[c.id] || 0), 0);
      const real = t.rec ? v / t.rec : 0, ideal = [0.5, 0.3, 0.2][i];
      const ok = i < 2 ? real <= ideal : real >= ideal;
      const txt = !t.rec ? "—" : ok ? (i < 2 ? "🟢 Dentro do ideal" : "🟢 Ótimo, investindo no futuro") : (i < 2 ? "🔴 Acima do ideal" : "🟡 Abaixo do ideal");
      return `<div class="row-bar"><span class="nm">${g} <small style="color:var(--muted)">(ideal ${pct(ideal)})</small></span><span class="vl">${pct(real)} · ${fmt(v)}</span>
        <div class="bar ${ok || !t.rec ? "" : i < 2 ? "over" : "warn"}"><i style="width:${Math.min(100, real * 100)}%"></i></div><span class="meta">${txt}</span></div>`;
    }).join("");

    $("#view").innerHTML = `
      <div class="grid g4">
        ${kpi("RECEITAS", fmt(t.rec), comparar(t.rec, tp.rec), "var(--green)", "var(--light)")}
        ${kpi("DESPESAS", fmt(t.desp), comparar(t.desp, tp.desp), "var(--red)", "var(--lred)")}
        ${kpi("SALDO DO MÊS", fmt(t.saldo), t.saldo >= 0 ? "✔ sobrou dinheiro" : "✖ gastou mais do que ganhou", "var(--blue)", "var(--lblue)")}
        ${kpi("% GUARDADO", pct(guardado), "meta recomendada: 20%", "var(--gold)", "var(--lgold)")}
      </div>
      <div class="alerta mt">${msg}<small>${sub}</small></div>
      <div class="grid g2 mt">
        <div class="card"><h3>🔥 Onde seu dinheiro foi</h3>${topHtml}</div>
        <div class="card"><h3>🍩 Gastos por categoria</h3>${top.length ? '<div class="chart-box"><canvas id="ch-donut"></canvas></div>' : '<div class="empty">Sem dados para o gráfico.</div>'}</div>
        <div class="card"><h3>⚖️ Regra 50-30-20</h3>${grupos}</div>
        <div class="card"><h3>💳 Como você pagou</h3>${porForma.some((v) => v) ? '<div class="chart-box"><canvas id="ch-formas"></canvas></div>' : '<div class="empty">Sem gastos neste mês.</div>'}</div>
      </div>`;

    if (top.length) grafico("ch-donut", { type: "doughnut", data: { labels: top.slice(0, 8).map((x) => x.c.nome), datasets: [{ data: top.slice(0, 8).map((x) => x.v), backgroundColor: CORES, borderWidth: 2 }] },
      options: { cutout: "60%", plugins: { legend: { position: "bottom", labels: { boxWidth: 12, font: { family: "Poppins", size: 11 } } }, tooltip: { callbacks: { label: (c) => ` ${c.label}: ${fmt(c.raw)}` } } } } });
    if (porForma.some((v) => v)) grafico("ch-formas", { type: "bar", data: { labels: FORMAS, datasets: [{ data: porForma, backgroundColor: "#1f6fb2", borderRadius: 6 }] },
      options: { indexAxis: "y", plugins: { legend: { display: false }, tooltip: { callbacks: { label: (c) => " " + fmt(c.raw) } } }, scales: { x: { grid: { display: false }, ticks: { callback: (v) => "R$ " + v } }, y: { grid: { display: false } } } } });
  }

  function telaLancamentos() {
    const { ano: a, mes: m } = ui;
    const t = totais(a, m);
    let lista = doMes(a, m).slice().sort((x, y) => y.data.localeCompare(x.data));
    const q = ui.busca.trim().toLowerCase();
    if (q) lista = lista.filter((l) => l.descricao.toLowerCase().includes(q));
    if (ui.filtroCat) lista = lista.filter((l) => l.categoriaId === ui.filtroCat);
    const opts = S.categorias.map((c) => `<option value="${c.id}" ${ui.filtroCat === c.id ? "selected" : ""}>${esc(c.nome)}</option>`).join("");
    const itens = lista.map((l) => {
      const c = cat(l.categoriaId), r = tipoDe(l) === "Receita";
      const d = l.data.split("-");
      return `<div class="lanc"><div class="dt"><b>${d[2]}</b>${MESES[+d[1] - 1].slice(0, 3)}</div>
        <div class="ds"><div>${esc(l.descricao) || "(sem descrição)"}</div><small>${esc(c ? c.nome : "Sem categoria")} · ${esc(l.forma || "")}</small></div>
        <div class="vl ${r ? "pos" : "neg"}">${r ? "+" : "−"} ${fmt(l.valor)}</div>
        <div><button class="ico-btn" data-edit="${l.id}" aria-label="Editar">✏️</button><button class="ico-btn" data-del="${l.id}" aria-label="Apagar">🗑️</button></div></div>`;
    }).join("");
    $("#view").innerHTML = `
      <div class="grid g4" style="margin-bottom:16px">
        ${kpi("ENTRADAS", fmt(t.rec), "", "var(--green)", "var(--light)")}
        ${kpi("SAÍDAS", fmt(t.desp), "", "var(--red)", "var(--lred)")}
      </div>
      <div class="toolbar">
        <input id="busca" placeholder="🔍 Buscar descrição..." value="${esc(ui.busca)}">
        <select id="fcat"><option value="">Todas as categorias</option>${opts}</select>
        <button class="btn hide-m" id="novo">+ Novo lançamento</button>
        <button class="btn ghost" id="csv">⬇️ Exportar (Excel)</button>
      </div>
      <div class="lanc-list">${itens || '<div class="card empty">Nenhum lançamento aqui. Clique em <b>+ Novo lançamento</b>.</div>'}</div>`;
    $("#busca").oninput = (e) => { ui.busca = e.target.value; const pos = e.target.selectionStart; render(); const b = $("#busca"); b.focus(); b.setSelectionRange(pos, pos); };
    $("#fcat").onchange = (e) => { ui.filtroCat = e.target.value; render(); };
    $("#novo").onclick = () => formLancamento();
    $("#csv").onclick = exportarCSV;
    document.querySelectorAll("[data-edit]").forEach((b) => (b.onclick = () => formLancamento(S.lancamentos.find((l) => l.id === b.dataset.edit))));
    document.querySelectorAll("[data-del]").forEach((b) => (b.onclick = () => {
      if (!confirm("Apagar este lançamento?")) return;
      S.lancamentos = S.lancamentos.filter((l) => l.id !== b.dataset.del); mudou(); toast("Lançamento apagado");
    }));
  }

  function telaCategorias() {
    const { ano: a, mes: m } = ui;
    const g = gastoPorCat(a, m);
    const linhas = S.categorias.map((c) => {
      const v = g[c.id] || 0, p = c.orcamento ? v / c.orcamento : 0;
      const st = c.tipo === "Receita" ? "—" : !c.orcamento ? "Sem limite" : p > 1 ? "🔴 Acima" : p > 0.8 ? "🟡 Perto" : "🟢 Ok";
      return `<tr>
        <td><input class="inp-cell" data-f="nome" data-id="${c.id}" value="${esc(c.nome)}" style="min-width:170px"></td>
        <td><select class="inp-cell" data-f="tipo" data-id="${c.id}"><option ${c.tipo === "Receita" ? "selected" : ""}>Receita</option><option ${c.tipo === "Despesa" ? "selected" : ""}>Despesa</option></select></td>
        <td>${c.tipo === "Despesa" ? `<select class="inp-cell" data-f="grupo" data-id="${c.id}">${GRUPOS.map((x) => `<option ${c.grupo === x ? "selected" : ""}>${x}</option>`).join("")}</select>` : "—"}</td>
        <td>${c.tipo === "Despesa" ? `<input class="inp-cell" type="number" min="0" step="10" inputmode="decimal" data-f="orcamento" data-id="${c.id}" value="${c.orcamento || 0}">` : "—"}</td>
        <td class="num">${fmt(v)}</td><td>${st}</td>
        <td><button class="ico-btn" data-delc="${c.id}" aria-label="Apagar">🗑️</button></td></tr>`;
    }).join("");
    $("#view").innerHTML = `
      <div class="card">
        <h3>🏷️ Suas categorias e limites mensais <button class="btn sm" id="nova-cat">+ Nova categoria</button></h3>
        <p style="color:var(--muted);font-size:.85rem;margin-bottom:12px">Altere direto na tabela — salva sozinho. O gasto mostrado é de <b>${MESES[m - 1]}</b>.</p>
        <div class="tbl-wrap"><table><thead><tr><th>Categoria</th><th>Tipo</th><th>Grupo 50-30-20</th><th>Limite mensal (R$)</th><th class="num">Gasto no mês</th><th>Situação</th><th></th></tr></thead>
        <tbody>${linhas}</tbody></table></div>
      </div>`;
    document.querySelectorAll(".inp-cell").forEach((el) => (el.onchange = () => {
      const c = cat(el.dataset.id), f = el.dataset.f;
      c[f] = f === "orcamento" ? Math.max(0, parseFloat(el.value) || 0) : el.value.trim();
      if (f === "tipo") c.grupo = c.tipo === "Despesa" ? (c.grupo || "Estilo de vida") : "";
      if (f === "nome" && !c.nome) c.nome = "Sem nome";
      mudou(); toast("Salvo ✓");
    }));
    $("#nova-cat").onclick = () => { S.categorias.push({ id: uid(), nome: "Nova categoria", tipo: "Despesa", grupo: "Estilo de vida", orcamento: 0 }); mudou(); };
    document.querySelectorAll("[data-delc]").forEach((b) => (b.onclick = () => {
      const usados = S.lancamentos.filter((l) => l.categoriaId === b.dataset.delc).length;
      if (usados) return alert(`Esta categoria tem ${usados} lançamento(s). Mude a categoria deles antes de apagar.`);
      if (!confirm("Apagar esta categoria?")) return;
      S.categorias = S.categorias.filter((c) => c.id !== b.dataset.delc); mudou();
    }));
  }

  function telaResumo() {
    const a = ui.ano;
    const meses = MESES.map((_, i) => totais(a, i + 1));
    let acum = 0;
    const linhas = meses.map((t, i) => {
      const vazio = !t.rec && !t.desp;
      acum += t.saldo;
      const g = t.rec ? t.saldo / t.rec : 0;
      const st = vazio ? "—" : t.saldo < 0 ? "🔴 Negativo" : g >= 0.2 ? "🏆 Ótimo" : g >= 0.1 ? "🟢 Bom" : "🟡 Apertado";
      return `<tr><td><b>${MESES[i]}</b></td><td class="num">${fmt(t.rec)}</td><td class="num">${fmt(t.desp)}</td>
        <td class="num ${t.saldo < 0 ? "neg" : ""}">${fmt(t.saldo)}</td><td class="num ${acum < 0 ? "neg" : ""}">${vazio ? "—" : fmt(acum)}</td>
        <td class="num">${vazio || !t.rec ? "—" : pct(g)}</td><td>${st}</td></tr>`;
    }).join("");
    const tot = meses.reduce((s, t) => ({ rec: s.rec + t.rec, desp: s.desp + t.desp }), { rec: 0, desp: 0 });
    // mapa de calor
    const despCats = S.categorias.filter((c) => c.tipo === "Despesa");
    const mat = despCats.map((c) => MESES.map((_, i) => gastoPorCat(a, i + 1)[c.id] || 0));
    const max = Math.max(1, ...mat.flat());
    const cor = (v) => { if (!v) return "#fff"; const k = v / max; return `rgba(240,138,126,${0.15 + k * 0.75})`; };
    const heat = despCats.map((c, r) => `<tr><td><b>${esc(c.nome)}</b></td>${mat[r].map((v) => `<td style="background:${cor(v)}">${v ? fmt(v).replace(",00", "") : "–"}</td>`).join("")}<td><b>${fmt(mat[r].reduce((s, v) => s + v, 0))}</b></td></tr>`).join("");

    $("#view").innerHTML = `
      <div class="grid g4">
        ${kpi("RECEITAS NO ANO", fmt(tot.rec), "", "var(--green)", "var(--light)")}
        ${kpi("DESPESAS NO ANO", fmt(tot.desp), "", "var(--red)", "var(--lred)")}
        ${kpi("SALDO DO ANO", fmt(tot.rec - tot.desp), "", "var(--blue)", "var(--lblue)")}
        ${kpi("% GUARDADO", tot.rec ? pct((tot.rec - tot.desp) / tot.rec) : "—", "", "var(--gold)", "var(--lgold)")}
      </div>
      <div class="grid g2 mt">
        <div class="card"><h3>📊 Receitas x Despesas</h3><div class="chart-box"><canvas id="ch-ano"></canvas></div></div>
        <div class="card"><h3>📈 Saldo acumulado</h3><div class="chart-box"><canvas id="ch-acum"></canvas></div></div>
      </div>
      <div class="card mt"><h3>📅 Mês a mês</h3><div class="tbl-wrap"><table><thead><tr><th>Mês</th><th class="num">Receitas</th><th class="num">Despesas</th><th class="num">Saldo</th><th class="num">Acumulado</th><th class="num">% guardado</th><th>Situação</th></tr></thead><tbody>${linhas}</tbody></table></div></div>
      <div class="card mt"><h3>🔥 Mapa de calor dos gastos</h3><p style="color:var(--muted);font-size:.85rem;margin-bottom:10px">Quanto mais vermelho, mais você gastou naquela categoria e mês.</p>
        <div class="tbl-wrap"><table class="heat"><thead><tr><th>Categoria</th>${MESES.map((x) => `<th class="num">${x.slice(0, 3)}</th>`).join("")}<th class="num">Total</th></tr></thead><tbody>${heat}</tbody></table></div></div>`;

    const labels = MESES.map((x) => x.slice(0, 3));
    grafico("ch-ano", { type: "bar", data: { labels, datasets: [
      { label: "Receitas", data: meses.map((t) => t.rec), backgroundColor: "#1e8e5a", borderRadius: 5 },
      { label: "Despesas", data: meses.map((t) => t.desp), backgroundColor: "#f08a7e", borderRadius: 5 }] },
      options: { plugins: { legend: { position: "bottom" }, tooltip: { callbacks: { label: (c) => ` ${c.dataset.label}: ${fmt(c.raw)}` } } }, scales: { x: { grid: { display: false } } } } });
    let ac = 0; const acData = meses.map((t) => (!t.rec && !t.desp ? null : (ac += t.saldo)));
    grafico("ch-acum", { type: "line", data: { labels, datasets: [{ label: "Saldo acumulado", data: acData, borderColor: "#1f6fb2", backgroundColor: "rgba(31,111,178,.12)", fill: true, tension: 0.35, spanGaps: true, pointRadius: 4 }] },
      options: { plugins: { legend: { display: false }, tooltip: { callbacks: { label: (c) => " " + fmt(c.raw) } } }, scales: { x: { grid: { display: false } } } } });
  }

  function telaMetas() {
    const cards = S.metas.map((mt) => {
      const p = mt.valor ? Math.min(1, mt.guardado / mt.valor) : 0, falta = Math.max(0, mt.valor - mt.guardado);
      let porMes = "";
      if (mt.prazo && falta > 0) {
        const [y, mm] = mt.prazo.split("-").map(Number);
        const n = Math.max(1, (y - hoje.getFullYear()) * 12 + mm - (hoje.getMonth() + 1));
        porMes = `Guardar ${fmt(falta / n)} por mês`;
      }
      const venc = mt.prazo && mt.prazo < hojeISO();
      const st = falta === 0 ? "🎉 Concluída!" : !mt.prazo ? "Defina um prazo" : venc ? "⏰ Prazo vencido" : "🚀 Em andamento";
      return `<div class="card meta-card">
        <div class="top-line"><div><div class="nome">${esc(mt.nome)}</div><span class="status">${st}</span></div>
          <div><button class="ico-btn" data-add="${mt.id}" title="Guardar dinheiro">💰</button><button class="ico-btn" data-editm="${mt.id}" aria-label="Editar">✏️</button><button class="ico-btn" data-delm="${mt.id}" aria-label="Apagar">🗑️</button></div></div>
        <div class="bar ${falta === 0 ? "" : ""}"><i style="width:${p * 100}%"></i></div>
        <div class="info"><span><b>${fmt(mt.guardado)}</b> de ${fmt(mt.valor)} (${pct(p)})</span><span>${mt.prazo ? "Prazo: " + mt.prazo.split("-").reverse().join("/") : ""}</span></div>
        ${porMes ? `<div class="info" style="margin-top:6px"><span>🎯 ${porMes}</span><span>Falta ${fmt(falta)}</span></div>` : ""}
      </div>`;
    }).join("");
    $("#view").innerHTML = `
      <div class="toolbar"><button class="btn" id="nova-meta">+ Nova meta</button></div>
      <div class="grid g2">${cards || '<div class="card empty">Cadastre seu primeiro sonho: uma viagem, a reserva de emergência, um carro...</div>'}</div>`;
    $("#nova-meta").onclick = () => formMeta();
    document.querySelectorAll("[data-editm]").forEach((b) => (b.onclick = () => formMeta(S.metas.find((x) => x.id === b.dataset.editm))));
    document.querySelectorAll("[data-delm]").forEach((b) => (b.onclick = () => { if (confirm("Apagar esta meta?")) { S.metas = S.metas.filter((x) => x.id !== b.dataset.delm); mudou(); } }));
    document.querySelectorAll("[data-add]").forEach((b) => (b.onclick = () => {
      const mt = S.metas.find((x) => x.id === b.dataset.add);
      modal(`💰 Guardar para "${esc(mt.nome)}"`, `<div class="field"><label>Quanto você guardou agora? (R$)</label><input name="v" type="number" step="0.01" min="0.01" inputmode="decimal" required autofocus></div>`,
        (f) => { mt.guardado = +(mt.guardado + parseFloat(f.v.value)).toFixed(2); mudou(); toast("Valor adicionado à meta 🎉"); });
    }));
  }

  // ---------- formulários ----------
  function modal(titulo, corpo, onSubmit, textoBotao = "Salvar") {
    const root = $("#modal-root");
    root.innerHTML = `<div class="modal-bg"><form class="modal"><h3>${titulo}</h3>${corpo}
      <div class="acts"><button type="button" class="btn ghost" data-close>Cancelar</button><button class="btn">${textoBotao}</button></div></form></div>`;
    const bg = root.firstElementChild, form = bg.querySelector("form");
    const fechar = () => (root.innerHTML = "");
    bg.addEventListener("click", (e) => { if (e.target === bg) fechar(); });
    form.querySelector("[data-close]").onclick = fechar;
    form.onsubmit = (e) => { e.preventDefault(); if (onSubmit(form) !== false) fechar(); };
    const first = form.querySelector("[autofocus]") || form.querySelector("input");
    if (first) setTimeout(() => first.focus(), 50);
    return form;
  }

  function formLancamento(l) {
    let tipo = l ? tipoDe(l) : "Despesa";
    const dataPadrao = l ? l.data : (ui.ano === hoje.getFullYear() && ui.mes === hoje.getMonth() + 1 ? hojeISO() : `${ui.ano}-${pad(ui.mes)}-01`);
    const corpo = `
      <div class="seg"><button type="button" data-t="Despesa">− Despesa</button><button type="button" data-t="Receita">+ Receita</button></div>
      <div class="field"><label>Valor (R$)</label><input name="valor" type="number" step="0.01" min="0.01" inputmode="decimal" required value="${l ? l.valor : ""}" autofocus></div>
      <div class="field"><label>Descrição</label><input name="descricao" maxlength="80" placeholder="Ex.: mercado, salário..." value="${l ? esc(l.descricao) : ""}"></div>
      <div class="field"><label>Categoria</label><select name="cat" required></select></div>
      <div class="field"><label>Data</label><input name="data" type="date" required value="${dataPadrao}"></div>
      <div class="field"><label>Forma de pagamento</label><select name="forma">${FORMAS.map((f) => `<option ${l && l.forma === f ? "selected" : ""}>${f}</option>`).join("")}</select></div>`;
    const form = modal(l ? "✏️ Editar lançamento" : "➕ Novo lançamento", corpo, (f) => {
      const dados = { data: f.data.value, descricao: f.descricao.value.trim(), categoriaId: f.cat.value, valor: Math.round(parseFloat(f.valor.value) * 100) / 100, forma: f.forma.value };
      if (!dados.categoriaId) { alert("Crie uma categoria do tipo " + tipo + " primeiro."); return false; }
      if (l) Object.assign(l, dados); else S.lancamentos.push(Object.assign({ id: uid() }, dados));
      const [y, m] = dados.data.split("-").map(Number); ui.ano = y; ui.mes = m;
      mudou(); toast(l ? "Lançamento atualizado ✓" : "Lançamento salvo ✓");
    });
    const preencher = () => {
      form.querySelectorAll(".seg button").forEach((b) => (b.className = b.dataset.t === tipo ? (tipo === "Receita" ? "on-r" : "on-d") : ""));
      const cats = S.categorias.filter((c) => c.tipo === tipo);
      form.cat.innerHTML = cats.map((c) => `<option value="${c.id}" ${l && l.categoriaId === c.id ? "selected" : ""}>${esc(c.nome)}</option>`).join("");
    };
    form.querySelectorAll(".seg button").forEach((b) => (b.onclick = () => { tipo = b.dataset.t; preencher(); }));
    preencher();
  }

  function formMeta(mt) {
    const corpo = `
      <div class="field"><label>Nome da meta</label><input name="nome" required maxlength="60" placeholder="Ex.: Viagem para a praia" value="${mt ? esc(mt.nome) : ""}" autofocus></div>
      <div class="field"><label>Valor da meta (R$)</label><input name="valor" type="number" step="0.01" min="1" inputmode="decimal" required value="${mt ? mt.valor : ""}"></div>
      <div class="field"><label>Já guardei (R$)</label><input name="guardado" type="number" step="0.01" min="0" inputmode="decimal" value="${mt ? mt.guardado : 0}"></div>
      <div class="field"><label>Prazo</label><input name="prazo" type="date" value="${mt ? mt.prazo || "" : ""}"></div>`;
    modal(mt ? "✏️ Editar meta" : "🎯 Nova meta", corpo, (f) => {
      const d = { nome: f.nome.value.trim(), valor: parseFloat(f.valor.value) || 0, guardado: parseFloat(f.guardado.value) || 0, prazo: f.prazo.value };
      if (mt) Object.assign(mt, d); else S.metas.push(Object.assign({ id: uid() }, d));
      mudou();
    });
  }

  function exportarCSV() {
    const linhas = [["Data","Descrição","Categoria","Tipo","Valor","Forma de pagamento"]];
    S.lancamentos.slice().sort((x, y) => x.data.localeCompare(y.data)).forEach((l) => {
      const c = cat(l.categoriaId);
      linhas.push([l.data.split("-").reverse().join("/"), l.descricao, c ? c.nome : "", tipoDe(l), String(l.valor).replace(".", ","), l.forma || ""]);
    });
    const csv = "﻿" + linhas.map((r) => r.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(";")).join("\r\n");
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    a.download = "meus-lancamentos.csv"; a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  }

  // ---------- navegação ----------
  function ligarApp() {
    document.querySelectorAll(".nav-btn").forEach((b) => (b.onclick = () => { ui.view = b.dataset.view; window.scrollTo(0, 0); render(); }));
    $("#prev").onclick = () => { if (ui.view === "resumo") ui.ano--; else if (--ui.mes < 1) { ui.mes = 12; ui.ano--; } render(); };
    $("#next").onclick = () => { if (ui.view === "resumo") ui.ano++; else if (++ui.mes > 12) { ui.mes = 1; ui.ano++; } render(); };
    $("#fab").onclick = () => formLancamento();
    const sair = async () => {
      if (modo === "demo") { location.href = location.pathname; return; }
      await sb.auth.signOut(); location.reload();
    };
    $("#logout").onclick = sair; $("#logout-m").onclick = sair;
  }

  function abrirApp() {
    $("#auth").classList.add("hidden");
    $("#app").classList.remove("hidden");
    $("#demo-bar").classList.toggle("hidden", modo !== "demo");
    $("#demo-buy").href = linkCompra;
    $("#user-email").textContent = modo === "demo" ? "Demonstração" : usuario.email;
    if (modo === "demo") { $("#logout").textContent = "Sair da demonstração"; $("#logout-m").textContent = "Sair"; }
    ligarApp(); render();
  }

  function iniciarDemo() {
    modo = "demo";
    let salvo = null;
    try { salvo = JSON.parse(localStorage.getItem("gnc-demo") || "null"); } catch (e) { /* ignora */ }
    S = salvo && salvo.categorias ? salvo : estadoDemo();
    salvar(); abrirApp();
  }

  // ---------- login (Supabase) ----------
  function telaAuth(tipo, aviso) {
    $("#auth").classList.remove("hidden");
    $("#app").classList.add("hidden");
    const box = $("#auth-content");
    const msg = aviso ? `<div class="msg ${aviso.ok ? "ok" : "err"}">${aviso.t}</div>` : "";
    const demoBtn = `<div class="divider">ou</div><a class="btn ghost full" href="?demo=1">👀 Ver demonstração grátis</a>`;
    if (tipo === "semacesso") {
      box.innerHTML = `<h2>Quase lá! 🔒</h2><p class="sub">O e-mail <b>${esc(usuario.email)}</b> ainda não tem acesso liberado.</p>${msg}
        <p style="font-size:.9rem;margin-bottom:16px">Se você já comprou, use o <b>mesmo e-mail da compra</b>. A liberação pode levar alguns minutos.</p>
        <a class="btn yellow full" href="${esc(linkCompra)}">Comprar acesso</a>
        <div class="auth-links"><button class="link" id="recheck">Já comprei, verificar de novo</button><button class="link" id="sair">Sair</button></div>`;
      $("#recheck").onclick = () => verificarAcesso();
      $("#sair").onclick = async () => { await sb.auth.signOut(); telaAuth("login"); };
      return;
    }
    if (tipo === "novasenha") {
      box.innerHTML = `<h2>Criar nova senha</h2><p class="sub">Digite sua nova senha.</p>${msg}
        <form id="f"><div class="field"><label>Nova senha</label><input name="senha" type="password" minlength="6" required autocomplete="new-password"></div>
        <button class="btn full">Salvar senha</button></form>`;
      $("#f").onsubmit = async (e) => {
        e.preventDefault();
        const { error } = await sb.auth.updateUser({ password: e.target.senha.value });
        if (error) return telaAuth("novasenha", { t: "Não deu certo: " + error.message });
        history.replaceState(null, "", location.pathname); verificarAcesso();
      };
      return;
    }
    if (tipo === "esqueci") {
      box.innerHTML = `<h2>Esqueci minha senha</h2><p class="sub">Enviaremos um link para criar uma nova senha.</p>${msg}
        <form id="f"><div class="field"><label>E-mail</label><input name="email" type="email" required autocomplete="email"></div>
        <button class="btn full">Enviar link</button></form>
        <div class="auth-links"><button class="link" data-go="login">← Voltar</button></div>`;
      $("#f").onsubmit = async (e) => {
        e.preventDefault();
        const { error } = await sb.auth.resetPasswordForEmail(e.target.email.value.trim(), { redirectTo: location.origin + location.pathname });
        telaAuth("esqueci", error ? { t: "Erro: " + error.message } : { ok: 1, t: "Pronto! Confira seu e-mail (e a caixa de spam)." });
      };
    } else {
      const cad = tipo === "cadastro";
      box.innerHTML = `<h2>${cad ? "Criar minha conta" : "Entrar"}</h2>
        <p class="sub">${cad ? "Use o <b>mesmo e-mail da compra</b>." : "Acesse sua planilha online."}</p>${msg}
        <form id="f">
          <div class="field"><label>E-mail</label><input name="email" type="email" required autocomplete="email"></div>
          <div class="field"><label>Senha ${cad ? "(mínimo 6 caracteres)" : ""}</label><input name="senha" type="password" minlength="6" required autocomplete="${cad ? "new-password" : "current-password"}"></div>
          <button class="btn full" id="go">${cad ? "Criar conta" : "Entrar"}</button>
        </form>
        <div class="auth-links">${cad ? '<button class="link" data-go="login">Já tenho conta</button>' : '<button class="link" data-go="cadastro">Primeiro acesso? Criar conta</button><button class="link" data-go="esqueci">Esqueci a senha</button>'}</div>
        ${demoBtn}`;
      $("#f").onsubmit = async (e) => {
        e.preventDefault();
        const email = e.target.email.value.trim(), password = e.target.senha.value;
        $("#go").disabled = true; $("#go").textContent = "Aguarde…";
        if (cad) {
          const { data, error } = await sb.auth.signUp({ email, password, options: { emailRedirectTo: location.origin + location.pathname } });
          if (error) return telaAuth("cadastro", { t: traduzErro(error.message) });
          if (!data.session) return telaAuth("login", { ok: 1, t: "Conta criada! 📩 Confirme pelo link que enviamos para seu e-mail e depois entre aqui." });
        } else {
          const { error } = await sb.auth.signInWithPassword({ email, password });
          if (error) return telaAuth("login", { t: traduzErro(error.message) });
        }
        verificarAcesso();
      };
    }
    box.querySelectorAll("[data-go]").forEach((b) => (b.onclick = () => telaAuth(b.dataset.go)));
  }

  function traduzErro(m) {
    if (/Invalid login/i.test(m)) return "E-mail ou senha incorretos.";
    if (/Email not confirmed/i.test(m)) return "Confirme seu e-mail pelo link que enviamos antes de entrar.";
    if (/already registered/i.test(m)) return "Este e-mail já tem conta. Clique em \"Já tenho conta\".";
    if (/Password should be/i.test(m)) return "A senha precisa ter pelo menos 6 caracteres.";
    return m;
  }

  async function verificarAcesso() {
    const { data: { user } } = await sb.auth.getUser();
    if (!user) return telaAuth("login");
    usuario = user;
    const { data: ok, error } = await sb.rpc("tem_acesso");
    if (error) return telaAuth("login", { t: "Erro ao verificar acesso: " + error.message });
    if (!ok) return telaAuth("semacesso");
    const { data, error: e2 } = await sb.from("dados").select("conteudo").eq("user_id", user.id).maybeSingle();
    if (e2) return telaAuth("login", { t: "Erro ao carregar seus dados: " + e2.message });
    modo = "nuvem";
    S = data && data.conteudo ? data.conteudo : estadoVazio();
    if (!data) salvar();
    abrirApp();
  }

  // ---------- início ----------
  const params = new URLSearchParams(location.search);
  const temNuvem = CFG.SUPABASE_URL && CFG.SUPABASE_ANON_KEY && window.supabase;
  if (params.has("demo") || !temNuvem) {
    iniciarDemo();
  } else {
    sb = window.supabase.createClient(CFG.SUPABASE_URL, CFG.SUPABASE_ANON_KEY);
    let recuperando = /type=recovery/.test(location.hash);
    sb.auth.onAuthStateChange((ev) => { if (ev === "PASSWORD_RECOVERY") { recuperando = true; telaAuth("novasenha"); } });
    setTimeout(() => { if (recuperando) telaAuth("novasenha"); else verificarAcesso(); }, 300);
  }
})();
