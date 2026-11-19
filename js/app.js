/* =========================================================================
   app.js — Núcleo da aplicação (Biblioteca Maynard)
   ========================================================================= */

/* A camada de dados (DB) vive em js/db.js. */

/* -------------------------------------------------------------------------
   Estado da aplicação (não persistido)
   ------------------------------------------------------------------------- */
const State = {
  filtro: "",
  categoriaAtiva: null,
  livroSelecionado: null,
  navAtiva: "inicio",
  ultimaPesquisa: "",
};

/* -------------------------------------------------------------------------
   Utilidades
   ------------------------------------------------------------------------- */
function $(sel, ctx = document) { return ctx.querySelector(sel); }
function $$(sel, ctx = document) { return [...ctx.querySelectorAll(sel)]; }

function normalizarTexto(texto) {
  return String(texto ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

function nomeCategoria(id) {
  const categoria = DB.getCategorias().find((c) => c.id === id);
  return categoria ? categoria.nome : id || "";
}

function escopoPesquisaGlobal(termo) {
  const q = normalizarTexto(termo);
  if (!q) return [];
  const user = Auth.getUser();
  const paginas = [
    { id: "inicio", nome: "Início", alvo: "inicio", descricao: "Página inicial da biblioteca", aliases: "home biblioteca principal" },
    { id: "livros", nome: "Livros", alvo: "livros", descricao: "Catálogo completo de livros", aliases: "acervo catálogo catalogo" },
    { id: "autores", nome: "Autores", alvo: "inicio", anchor: "orbita-secao", descricao: "Autores em destaque", aliases: "escritores escritoras" },
    { id: "categorias", nome: "Categorias", alvo: "inicio", anchor: "secao-categorias", descricao: "Categorias e gêneros", aliases: "gêneros generos" },
    { id: "emprestimos", nome: "Empréstimos", alvo: "emprestimos", descricao: "Seus empréstimos", aliases: "emprestimo pedidos devolução devolucao" },
    { id: "conta", nome: "Minha conta", alvo: "conta", descricao: "Dados do seu perfil", aliases: "perfil usuário usuario" },
  ];
  if (user?.tipo === "admin") {
    paginas.push(
      { id: "dashboard", nome: "Dashboard", alvo: "dashboard", descricao: "Visão geral administrativa", aliases: "painel estatísticas estatisticas" },
      { id: "gerenciar", nome: "Gerenciar livros", alvo: "gerenciar", descricao: "Cadastrar, editar e excluir livros", aliases: "gestão gestao administrador administração administracao" },
      { id: "admin-emprestimos", nome: "Controle de empréstimos", alvo: "admin-emprestimos", descricao: "Confirmar devoluções e ver quem está com cada livro", aliases: "circulação circulacao devolver atrasos atrasados bibliotecário bibliotecario" },
      { id: "usuarios", nome: "Usuários", alvo: "usuarios", descricao: "Contas de leitores e administradores", aliases: "leitores alunos contas cadastro permissões permissoes" },
      { id: "sistema", nome: "Backup e dados", alvo: "sistema", descricao: "Exportar e importar os dados da biblioteca", aliases: "backup exportar importar restaurar salvar json" },
    );
  }

  const livros = DB.getLivros()
    .filter((l) => [l.titulo, l.autor, l.editora, nomeCategoria(l.categoria), l.categoria]
      .some((v) => normalizarTexto(v).includes(q)))
    .slice(0, 7)
    .map((l) => ({ tipo: "livro", id: l.id, nome: l.titulo, descricao: `${l.autor} · ${nomeCategoria(l.categoria)} · ${l.ano}`, livro: l }));

  const autores = DB.getAutoresDestaque()
    .filter((a) => normalizarTexto(a.nome).includes(q))
    .slice(0, 5)
    .map((a) => ({ tipo: "autor", id: a.id, nome: a.nome, descricao: `${a.anos} · Autor em destaque`, autor: a }));

  const categorias = DB.getCategorias()
    .filter((c) => normalizarTexto(c.nome).includes(q) || normalizarTexto(c.id).includes(q) || normalizarTexto(c.desc).includes(q))
    .slice(0, 5)
    .map((c) => ({ tipo: "categoria", id: c.id, nome: c.nome, descricao: `${c.desc} · ${DB.getLivros().filter((l) => l.categoria === c.id).length} títulos`, categoria: c }));

  const paginasMatch = paginas
    .filter((p) => [p.nome, p.descricao, p.aliases].some((v) => normalizarTexto(v).includes(q)))
    .slice(0, 5)
    .map((p) => ({ tipo: "pagina", ...p }));

  const todos = [...paginasMatch, ...autores, ...categorias, ...livros];
  const vistos = new Set();
  return todos.filter((r) => {
    const chave = `${r.tipo}:${r.id}`;
    if (vistos.has(chave)) return false;
    vistos.add(chave);
    return true;
  }).slice(0, 12);
}

function executarResultadoPesquisa(resultado) {
  if (!resultado) return;
  const campo = $("#campo-pesquisa");
  if (resultado.tipo === "pagina") {
    State.filtro = "";
    State.categoriaAtiva = null;
    campo.value = "";
    irPara(resultado.alvo, resultado.id);
    if (resultado.anchor) {
      setTimeout(() => document.getElementById(resultado.anchor)?.scrollIntoView({ behavior: "smooth", block: "start" }), 100);
    }
    return;
  }
  if (resultado.tipo === "livro") {
    State.filtro = normalizarTexto(resultado.nome);
    State.categoriaAtiva = null;
    campo.value = resultado.nome;
    irPara("livros", "livros");
    renderCatalogo();
    return;
  }
  if (resultado.tipo === "categoria") {
    State.categoriaAtiva = resultado.categoria.id;
    State.filtro = "";
    campo.value = resultado.categoria.nome;
    $("#filtro-categoria").value = resultado.categoria.id;
    irPara("livros", "livros");
    renderCatalogo();
    return;
  }
  if (resultado.tipo === "autor") {
    State.filtro = "";
    State.categoriaAtiva = null;
    campo.value = resultado.autor.nome;
    irPara("inicio", "autores");
    if (window.__carrosselAutores) window.__carrosselAutores.goTo(DB.getAutoresDestaque().findIndex((a) => a.id === resultado.autor.id));
    setTimeout(() => document.getElementById("orbita-secao")?.scrollIntoView({ behavior: "smooth", block: "start" }), 100);
  }
}

function toast(msg, tipo = "sucesso") {
  const el = document.createElement("div");
  el.className = `toast toast-${tipo}`;
  el.textContent = msg;
  $("#toast-container").appendChild(el);
  requestAnimationFrame(() => el.classList.add("mostrar"));
  setTimeout(() => {
    el.classList.remove("mostrar");
    setTimeout(() => el.remove(), 300);
  }, 3200);
}

function confirmar(mensagem, rotulo = "Confirmar") {
  return new Promise((resolve) => {
    const overlay = $("#confirm-overlay");
    $("#confirm-texto").textContent = mensagem;
    $("#confirm-sim").textContent = rotulo;
    overlay.classList.add("aberto");
    const cleanup = (val) => {
      overlay.classList.remove("aberto");
      btnSim.removeEventListener("click", onSim);
      btnNao.removeEventListener("click", onNao);
      resolve(val);
    };
    const btnSim = $("#confirm-sim");
    const btnNao = $("#confirm-nao");
    const onSim = () => cleanup(true);
    const onNao = () => cleanup(false);
    btnSim.addEventListener("click", onSim);
    btnNao.addEventListener("click", onNao);
  });
}

function formatarData(ts) {
  return new Date(ts).toLocaleDateString("pt-BR");
}

function formatarDataISO(valor) {
  if (!valor) return "—";
  const data = new Date(`${valor}T00:00:00`);
  return Number.isNaN(data.getTime()) ? "—" : data.toLocaleDateString("pt-BR");
}

/* -------------------------------------------------------------------------
   Inicialização
   ------------------------------------------------------------------------- */
document.addEventListener("DOMContentLoaded", () => {
  seedDatabase();
  const user = Auth.requireSession();
  if (!user) return;

  montarShell(user);
  montarMenu(user);
  montarSidebar();
  ativarNavegacao();
  ativarNotificacoes();
  renderCategorias();
  renderCarrossel();
  renderCatalogo();
  renderMaisAcessados();
  renderNotificacoes();
  ativarPesquisa();
  ativarModais();

  if (user.tipo === "admin") {
    initAreaAdmin();
  }

  irPara("inicio");
});

function montarShell(user) {
  $("#usuario-nome").textContent = user.nome.split(" ")[0];
  $("#usuario-tipo").textContent = user.tipo === "admin" ? "Administrador(a)" : "Leitor(a)";
  $$(".btn-logout").forEach((b) => b.addEventListener("click", () => Auth.logout()));
}

function montarMenu(user) {
  if (user.tipo !== "admin") {
    $$(".menu-admin-only").forEach((el) => el.remove());
  }
}

function ativarNavegacao() {
  $$(`[data-view-target]`).forEach((btn) => {
    btn.addEventListener("click", (e) => {
      e.preventDefault();
      const navKey = btn.dataset.navKey || btn.dataset.viewTarget;
      irPara(btn.dataset.viewTarget, navKey);
      $("#menu-mobile").classList.remove("aberto");
      if (btn.dataset.anchor) {
        setTimeout(() => {
          const alvo = document.getElementById(btn.dataset.anchor);
          if (alvo) alvo.scrollIntoView({ behavior: "smooth", block: "start" });
        }, 100);
      }
    });
  });

  $$(".nav-item").forEach((btn) => {
    const texto = btn.textContent.replace(/\s+/g, " ").trim();
    if (texto) btn.setAttribute("title", texto);
  });

  const marcaHome = $("#marca-home");
  marcaHome?.addEventListener("click", (e) => {
    e.preventDefault();
    irPara("inicio", "inicio");
    $("#menu-mobile").classList.remove("aberto");
  });

  $("#menu-mobile")?.addEventListener("click", (e) => {
    if (e.target === $("#menu-mobile")) $("#menu-mobile").classList.remove("aberto");
  });

  $("#btn-menu-mobile")?.addEventListener("click", () => {
    const menu = $("#menu-mobile");
    menu.classList.toggle("aberto");
    const aberto = menu.classList.contains("aberto");
    $("#btn-menu-mobile").setAttribute("aria-label", aberto ? "Fechar menu" : "Abrir menu");
    $("#btn-menu-mobile").setAttribute("title", aberto ? "Fechar menu" : "Abrir menu");
  });

  document.addEventListener("keydown", (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
      e.preventDefault();
      $("#campo-pesquisa")?.focus();
    }
  });

  const inicio = $("#view-inicio");
  const anchors = [
    ["secao-categorias", "categorias"],
    ["orbita-secao", "autores"],
  ];
  if (inicio && "IntersectionObserver" in window) {
    const obs = new IntersectionObserver((entries) => {
      if (!inicio.classList.contains("ativo")) return;
      const visiveis = entries.filter((e) => e.isIntersecting).sort((a, b) => b.intersectionRatio - a.intersectionRatio);
      if (!visiveis.length) return;
      const encontrado = anchors.find(([id]) => id === visiveis[0].target.id);
      State.navAtiva = encontrado ? encontrado[1] : "inicio";
      $$(`[data-view-target]`).forEach((b) => {
    const ativo = (b.dataset.navKey || b.dataset.viewTarget) === State.navAtiva;
    b.classList.toggle("ativo", ativo);
    if (ativo) b.setAttribute("aria-current", "page"); else b.removeAttribute("aria-current");
  });
    }, { threshold: [0.2, 0.45, 0.7], rootMargin: "-12% 0px -55% 0px" });
    anchors.forEach(([id]) => { const el = document.getElementById(id); if (el) obs.observe(el); });
  }
}

function montarSidebar() {
  const shell = $(".shell");
  const btn = $("#btn-sidebar-toggle");
  if (!shell || !btn) return;

  const salvarEstado = (colapsada) => {
    shell.classList.toggle("sidebar-colapsada", colapsada);
    btn.setAttribute("aria-label", colapsada ? "Abrir menu" : "Recolher menu");
    btn.setAttribute("title", colapsada ? "Abrir menu" : "Recolher menu");
    btn.innerHTML = colapsada
      ? '<svg id="icone-sidebar-toggle" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><path d="m9 6 6 6-6 6"/></svg>'
      : '<svg id="icone-sidebar-toggle" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><path d="m15 6-6 6 6 6"/></svg>';
    try { localStorage.setItem("biblioteca_sidebar_colapsada", colapsada ? "1" : "0"); } catch (e) {}
  };

  let colapsada = false;
  try { colapsada = localStorage.getItem("biblioteca_sidebar_colapsada") === "1"; } catch (e) {}
  salvarEstado(colapsada);

  btn.addEventListener("click", () => {
    salvarEstado(!shell.classList.contains("sidebar-colapsada"));
  });
}

const VIEWS_SO_ADMIN = ["admin-emprestimos", "usuarios", "sistema"];

function irPara(viewId, navKey = viewId) {
  if (VIEWS_SO_ADMIN.includes(viewId) && !Auth.isAdmin()) return;
  State.navAtiva = navKey || viewId;
  $$(".view").forEach((v) => v.classList.remove("ativo"));
  const target = $(`#view-${viewId}`);
  if (target) target.classList.add("ativo");
  $$(`[data-view-target]`).forEach((b) => {
    const ativo = (b.dataset.navKey || b.dataset.viewTarget) === State.navAtiva;
    b.classList.toggle("ativo", ativo);
    if (ativo) b.setAttribute("aria-current", "page"); else b.removeAttribute("aria-current");
  });
  window.scrollTo({ top: 0, behavior: "smooth" });
  if (viewId === "inicio") {
    if (navKey === "inicio") setTimeout(() => window.scrollTo({ top: 0, behavior: "smooth" }), 0);
    renderMaisAcessados();
  }
  if (viewId === "conta") renderMinhaConta();
  if (viewId === "emprestimos") renderEmprestimos();
  if (viewId === "dashboard") renderDashboard();
  if (viewId === "gerenciar") renderGerenciarLivros();
  if (viewId === "admin-emprestimos") renderAdminEmprestimos();
  if (viewId === "usuarios") renderUsuarios();
  if (viewId === "sistema") renderSistema();
}
window.irPara = irPara;

/* -------------------------------------------------------------------------
   Categorias
   ------------------------------------------------------------------------- */
function renderCategorias() {
  const cont = $("#grid-categorias");
  const categorias = DB.getCategorias();
  const livros = DB.getLivros();
  cont.innerHTML = categorias
    .map((c, i) => {
      const total = livros.filter((l) => l.categoria === c.id).length;
      return `
        <button class="card-categoria" style="--delay:${i * 40}ms" data-cat="${c.id}">
          <div class="card-categoria-topo">
            <span class="card-categoria-nome">${c.nome}</span>
            <span class="card-categoria-seta">→</span>
          </div>
          <p class="card-categoria-desc">${c.desc}</p>
          <span class="card-categoria-total">${total} título${total === 1 ? "" : "s"}</span>
        </button>`;
    })
    .join("");
  $$(".card-categoria", cont).forEach((el) => {
    el.addEventListener("click", () => {
      State.categoriaAtiva = el.dataset.cat;
      State.filtro = "";
      $("#campo-pesquisa").value = "";
      irPara("livros");
      renderCatalogo();
    });
  });
}

/* -------------------------------------------------------------------------
   Catálogo / pesquisa
   ------------------------------------------------------------------------- */
function ativarPesquisa() {
  const campo = $("#campo-pesquisa");
  const resultados = $("#resultados-pesquisa-global");
  const limpar = $("#btn-limpar-pesquisa");
  let resultadosAtuais = [];
  let indiceAtivo = -1;

  const fecharResultados = () => { resultados.classList.remove("aberto"); indiceAtivo = -1; campo.removeAttribute("aria-activedescendant"); };
  const atualizarLimpar = () => limpar?.classList.toggle("visivel", !!campo.value);

  const escolher = (indice) => {
    const r = resultadosAtuais[indice];
    if (!r) return;
    executarResultadoPesquisa(r);
    fecharResultados();
  };

  const renderResultados = () => {
    const termo = campo.value.trim();
    State.ultimaPesquisa = termo;
    resultadosAtuais = escopoPesquisaGlobal(termo);
    indiceAtivo = -1;
    atualizarLimpar();
    if (!termo) {
      resultados.innerHTML = "";
      fecharResultados();
      return;
    }
    if (!resultadosAtuais.length) {
      resultados.innerHTML = `<div class="pesquisa-sem-resultado"><strong>Nenhum resultado</strong><span>Tente um título, autor, gênero ou nome de seção.</span></div>`;
      resultados.classList.add("aberto");
      return;
    }
    const icon = { livro: "▱", autor: "◉", categoria: "▦", pagina: "→" };
    const label = { livro: "Livro", autor: "Autor", categoria: "Categoria", pagina: "Seção" };
    resultados.innerHTML = resultadosAtuais.map((r, i) => `
      <button type="button" class="resultado-pesquisa-item" data-pesquisa-index="${i}" id="resultado-pesquisa-${i}" role="option" aria-selected="false">
        <span class="resultado-pesquisa-icone">${icon[r.tipo] || "•"}</span>
        <span class="resultado-pesquisa-textos"><strong>${escapeHTML(r.nome)}</strong><small>${escapeHTML(r.descricao)}</small></span>
        <span class="resultado-pesquisa-tipo">${label[r.tipo] || ""}</span>
      </button>`).join("");
    resultados.classList.add("aberto");
    $$(`.resultado-pesquisa-item`, resultados).forEach((btn) => btn.addEventListener("click", () => escolher(Number(btn.dataset.pesquisaIndex))));
  };

  const setAtivo = (idx) => {
    if (!resultadosAtuais.length) return;
    indiceAtivo = (idx + resultadosAtuais.length) % resultadosAtuais.length;
    $$(`.resultado-pesquisa-item`, resultados).forEach((btn, i) => {
      const ativo = i === indiceAtivo;
      btn.classList.toggle("selecionado", ativo);
      btn.setAttribute("aria-selected", ativo ? "true" : "false");
    });
    campo.setAttribute("aria-activedescendant", `resultado-pesquisa-${indiceAtivo}`);
  };

  campo.addEventListener("input", () => {
    State.filtro = normalizarTexto(campo.value);
    State.categoriaAtiva = null;
    renderResultados();
    if ($("#view-livros").classList.contains("ativo")) renderCatalogo();
  });

  campo.addEventListener("keydown", (e) => {
    if (e.key === "Escape") { fecharResultados(); campo.blur(); return; }
    if (e.key === "ArrowDown") { e.preventDefault(); setAtivo(indiceAtivo + 1); return; }
    if (e.key === "ArrowUp") { e.preventDefault(); setAtivo(indiceAtivo - 1); return; }
    if (e.key === "Enter") {
      e.preventDefault();
      if (indiceAtivo >= 0 && resultadosAtuais[indiceAtivo]) { escolher(indiceAtivo); return; }
      if (resultadosAtuais.length) { escolher(0); return; }
      if (campo.value.trim()) { irPara("livros", "livros"); renderCatalogo(); fecharResultados(); }
    }
  });

  campo.addEventListener("focus", () => { if (campo.value.trim()) renderResultados(); });
  limpar?.addEventListener("click", () => {
    campo.value = "";
    State.filtro = "";
    State.categoriaAtiva = null;
    fecharResultados();
    atualizarLimpar();
    $("#filtro-categoria").value = "";
    if (State.navAtiva === "livros" || $("#view-livros").classList.contains("ativo")) renderCatalogo();
    campo.focus();
  });
  document.addEventListener("click", (e) => { if (!e.target.closest(".campo-pesquisa-wrap")) fecharResultados(); });

  $("#filtro-categoria").addEventListener("change", (e) => {
    State.categoriaAtiva = e.target.value || null;
    State.filtro = "";
    campo.value = "";
    atualizarLimpar();
    renderCatalogo();
  });

  $("#btn-limpar-filtros")?.addEventListener("click", () => {
    State.categoriaAtiva = null;
    State.filtro = "";
    campo.value = "";
    $("#filtro-categoria").value = "";
    atualizarLimpar();
    renderCatalogo();
  });
}

function livrosFiltrados() {
  let livros = DB.getLivros();
  if (State.categoriaAtiva) livros = livros.filter((l) => l.categoria === State.categoriaAtiva);
  if (State.filtro) {
    const f = normalizarTexto(State.filtro);
    livros = livros.filter((l) =>
      [l.titulo, l.autor, l.editora, nomeCategoria(l.categoria), l.categoria, String(l.ano)]
        .some((valor) => normalizarTexto(valor).includes(f))
    );
  }
  return livros;
}

function renderCatalogo() {
  const cont = $("#grid-livros");
  const livros = livrosFiltrados();
  const filtroSelect = $("#filtro-categoria");
  if (filtroSelect.value !== (State.categoriaAtiva || "")) filtroSelect.value = State.categoriaAtiva || "";

  $("#livros-contagem").textContent = `${livros.length} ${livros.length === 1 ? "livro encontrado" : "livros encontrados"}`;
  cont.innerHTML = livros.length
    ? livros.map((l, i) => cardLivroHTML(l, i)).join("")
    : `<div class="estado-vazio estado-vazio-card"><span class="estado-vazio-icon">⌕</span><strong>Nenhum livro encontrado</strong><p>Tente outro título, autor, gênero ou use "Limpar filtros".</p><button class="btn btn-secundario" type="button" id="btn-vazio-limpar">Limpar pesquisa</button></div>`;

  $$(".card-livro", cont).forEach((el) => el.addEventListener("click", () => abrirDetalheLivro(Number(el.dataset.id))));
  $("#btn-vazio-limpar")?.addEventListener("click", () => {
    State.filtro = ""; State.categoriaAtiva = null;
    $("#campo-pesquisa").value = ""; $("#filtro-categoria").value = "";
    renderCatalogo();
  });
}

function cardLivroHTML(l, i) {
  const disp = Number(l.qtdDisp) || 0;
  const total = Math.max(1, Number(l.qtdTotal) || 1);
  const pct = Math.round((disp / total) * 100);
  return `
    <article class="card-livro" style="--delay:${i * 30}ms" data-id="${l.id}" tabindex="0" aria-label="Abrir detalhes de ${escapeHTML(l.titulo)}">
      <div class="card-livro-capa-wrap">${renderCoverHTML(l)}<span class="card-acesso">${Number(l.acessos) || 0} acessos</span></div>
      <div class="card-livro-info">
        <div class="card-livro-meta-top"><span class="chip-chip">${escapeHTML(nomeCategoria(l.categoria))}</span><span>${escapeHTML(String(l.ano))}</span></div>
        <h3>${escapeHTML(l.titulo)}</h3>
        <span class="card-livro-autor">${escapeHTML(l.autor)}</span>
        <div class="card-livro-rodape"><span class="badge ${disp > 0 ? "badge-disp" : "badge-indisp"}">${disp > 0 ? "Disponível" : "Indisponível"}</span><span>${disp}/${total} exemplares</span></div>
        <div class="mini-progress"><span style="width:${pct}%"></span></div>
      </div>
    </article>`;
}


function renderMaisAcessados() {
  const livros = [...DB.getLivros()].sort((a, b) => (Number(b.acessos) || 0) - (Number(a.acessos) || 0)).slice(0, 5);
  $("#lista-mais-acessados").innerHTML = livros.length
    ? livros.map((l, i) => `
      <button type="button" class="ranking-item" style="--delay:${i * 60}ms" data-id="${l.id}">
        <span class="ranking-pos">${String(i + 1).padStart(2, "0")}</span>
        <div class="ranking-capa">${renderCoverHTML(l)}</div>
        <div class="ranking-info"><strong>${escapeHTML(l.titulo)}</strong><span>${escapeHTML(l.autor)} · ${escapeHTML(nomeCategoria(l.categoria))}</span></div>
        <span class="ranking-acessos">${Number(l.acessos) || 0}</span>
      </button>`).join("")
    : `<div class="estado-vazio">Ainda não há dados de acesso.</div>`;
  $$(".ranking-item", $("#lista-mais-acessados")).forEach((el) => el.addEventListener("click", () => abrirDetalheLivro(Number(el.dataset.id))));
}

/* -------------------------------------------------------------------------
   Detalhe do livro / solicitar empréstimo
   ------------------------------------------------------------------------- */
/* Conta a visualização só para leitores e no máximo uma vez por livro por sessão
   (admin conferindo o acervo e cliques repetidos não inflam o ranking). */
function contarAcessoUmaVezPorSessao(livroId) {
  if (Auth.isAdmin()) return;
  let vistos = [];
  try { vistos = JSON.parse(sessionStorage.getItem("biblioteca_acessos_sessao") || "[]"); } catch (e) { vistos = []; }
  if (vistos.includes(livroId)) return;
  DB.registrarAcesso(livroId);
  try { sessionStorage.setItem("biblioteca_acessos_sessao", JSON.stringify([...vistos, livroId])); } catch (e) { /* ignora */ }
}

function abrirDetalheLivro(id) {
  if (!DB.getLivros().some((l) => l.id === id)) return;
  contarAcessoUmaVezPorSessao(id);
  const livro = DB.getLivros().find((l) => l.id === id);

  State.livroSelecionado = livro;
  const modal = $("#modal-detalhe");
  $("#detalhe-capa", modal).innerHTML = renderCoverHTML(livro);
  $("#detalhe-titulo", modal).textContent = livro.titulo;
  $("#detalhe-autor", modal).textContent = livro.autor;
  $("#detalhe-editora", modal).textContent = livro.editora || "—";
  $("#detalhe-ano", modal).textContent = livro.ano || "—";
  $("#detalhe-categoria", modal).textContent = nomeCategoria(livro.categoria);
  $("#detalhe-categoria-chip", modal).textContent = nomeCategoria(livro.categoria);
  $("#detalhe-qtd", modal).textContent = `${livro.qtdDisp} de ${livro.qtdTotal}`;
  $("#detalhe-descricao", modal).textContent = livro.descricao || "Sem descrição cadastrada.";
  $("#detalhe-acessos", modal).textContent = `${Number(livro.acessos) || 0} acessos`;
  const total = Math.max(1, Number(livro.qtdTotal) || 1);
  const disp = Math.max(0, Number(livro.qtdDisp) || 0);
  const pct = Math.round((disp / total) * 100);
  $("#detalhe-qtd-percentual", modal).textContent = `${pct}%`;
  $("#detalhe-progress-bar", modal).style.width = `${pct}%`;
  const badge = $("#detalhe-disponibilidade", modal);
  badge.textContent = disp > 0 ? "Disponível" : "Indisponível";
  badge.className = `badge ${disp > 0 ? "badge-disp" : "badge-indisp"}`;
  $("#btn-solicitar-livro").disabled = disp <= 0;
  if (disp <= 0) $("#btn-solicitar-livro").textContent = "Indisponível";
  else $("#btn-solicitar-livro").textContent = "Solicitar livro";
  renderMaisAcessados();
  abrirModal("modal-detalhe");
}

function ativarModais() {
  $$('[data-close-modal]').forEach((btn) => btn.addEventListener("click", () => fecharModal(btn.closest(".modal-overlay").id)));
  $("#btn-fechar-detalhe-sec")?.addEventListener("click", () => fecharModal("modal-detalhe"));
  $$(".modal-overlay").forEach((overlay) => overlay.addEventListener("click", (e) => { if (e.target === overlay) fecharModal(overlay.id); }));
  document.addEventListener("keydown", (e) => { if (e.key === "Escape") $$(".modal-overlay.aberto").forEach((m) => fecharModal(m.id)); });

  $("#btn-solicitar-livro").addEventListener("click", () => {
    const user = Auth.getUser();
    const livro = State.livroSelecionado;
    if (!user || !livro || Number(livro.qtdDisp) <= 0) return;
    const ativo = DB.getEmprestimos().some((e) => e.email === user.email && e.livroId === livro.id && e.status === "ativo");
    if (ativo) { toast("Você já possui este livro em empréstimo.", "erro"); return; }
    $("#form-emprestimo-nome").value = user.nome;
    $("#form-emprestimo-email").value = user.email;
    $("#form-emprestimo-telefone").value = user.telefone || "";
    const hoje = dataLocalISO();
    $("#form-emprestimo-email").readOnly = true;
    $("#form-emprestimo-data").readOnly = true;
    $("#form-emprestimo-data").value = hoje;
    const campoDevolucao = $("#form-emprestimo-devolucao");
    campoDevolucao.min = somarDiasISO(hoje, 1);
    campoDevolucao.max = somarDiasISO(hoje, LIMITES.prazoMaxDias);
    campoDevolucao.value = somarDiasISO(hoje, LIMITES.prazoPadraoDias);
    $("#emprestimo-contexto").innerHTML = `<strong>${escapeHTML(livro.titulo)}</strong><span>${escapeHTML(livro.autor)} · ${escapeHTML(nomeCategoria(livro.categoria))}</span>`;
    fecharModal("modal-detalhe");
    abrirModal("modal-emprestimo");
  });

  $("#form-emprestimo").addEventListener("submit", (e) => {
    e.preventDefault();
    const livro = State.livroSelecionado;
    const user = Auth.getUser();
    if (!livro || !user) return;
    const res = DB.emprestar({
      livroId: livro.id,
      user,
      nome: $("#form-emprestimo-nome").value,
      telefone: $("#form-emprestimo-telefone").value,
      data: $("#form-emprestimo-data").value,
      devolucao: $("#form-emprestimo-devolucao").value,
    });
    if (!res.ok) {
      toast(res.erro, "erro");
      if (/indispon|não encontrado/i.test(res.erro)) { fecharModal("modal-emprestimo"); renderCatalogo(); }
      return;
    }
    fecharModal("modal-emprestimo");
    toast("Empréstimo registrado com sucesso.");
    renderCatalogo(); renderMaisAcessados(); renderNotificacoes(); renderEmprestimos();
  });
}


function abrirModal(id) { $(`#${id}`).classList.add("aberto"); }
function fecharModal(id) { $(`#${id}`).classList.remove("aberto"); }

/* -------------------------------------------------------------------------
   Carrossel 3D de autores + obras sincronizadas
   ------------------------------------------------------------------------- */
function sobrenomeAutor(autor) {
  const porAutor = {
    "machado-de-assis": "de Assis",
    "clarice-lispector": "Lispector",
    "carlos-drummond-de-andrade": "Drummond de Andrade",
    "cecilia-meireles": "Meireles",
    "jorge-amado": "Amado",
    "monteiro-lobato": "Lobato",
  };
  return porAutor[autor.id] || autor.nome.split(" ").slice(1).join(" ") || autor.nome;
}

function renderCarrossel() {
  const autores = DB.getAutoresDestaque();
  if (!autores.length) return;
  const carrossel = new Carousel3D({
    trackEl: $("#orbita-track"),
    indicatorsEl: $("#orbita-indicadores"),
    prevBtn: $("#orbita-prev"),
    nextBtn: $("#orbita-next"),
    autores,
    onChange: (autor) => atualizarPainelAutor(autor),
  });
  window.__carrosselAutores = carrossel;
  $("#btn-ver-autor")?.addEventListener("click", () => {
    const atual = ((carrossel.index % autores.length) + autores.length) % autores.length;
    abrirPerfilAutor(autores[atual].id);
  });
  atualizarPainelAutor(autores[0]);
}

function atualizarPainelAutor(autor) {
  if (!autor) return;
  const painel = $("#orbita-painel");
  painel.classList.add("saindo");
  setTimeout(() => {
    $("#orbita-nome-autor").textContent = autor.nome;
    $("#orbita-periodo-autor").textContent = autor.anos;
    $("#orbita-citacao").textContent = `"${autor.citacao}"`;
    $("#orbita-bio").textContent = autor.bio;
    painel.classList.remove("saindo");

    const grid = $("#orbita-obras");
    const livrosAutor = DB.getLivros().filter((l) => l.autorId === autor.id);
    grid.classList.add("saindo");
    setTimeout(() => {
      grid.innerHTML = livrosAutor.length
        ? livrosAutor.map((l, i) => `<div class="obra-item" style="--delay:${i * 60}ms" data-id="${l.id}">${renderCoverHTML(l, { withMeta: true })}</div>`).join("")
        : `<div class="estado-vazio">Nenhuma obra deste autor está cadastrada no catálogo.</div>`;
      grid.classList.remove("saindo");
      $$(".obra-item", grid).forEach((el) => el.addEventListener("click", () => abrirDetalheLivro(Number(el.dataset.id))));
    }, 180);
  }, 140);
}

function abrirPerfilAutor(autorId) {
  const autor = DB.getAutores().find((a) => a.id === autorId);
  if (!autor) return;
  $("#autor-modal-nome").textContent = autor.nome;
  $("#autor-modal-anos").textContent = autor.anos;
  $("#autor-modal-bio").textContent = autor.bio;
  const livros = DB.getLivros().filter((l) => l.autorId === autor.id);
  $("#autor-modal-total").textContent = `${livros.length} ${livros.length === 1 ? "obra" : "obras"}`;
  $("#autor-modal-obras").innerHTML = livros.length ? livros.map((l) => `<button type="button" class="autor-obra-mini" data-autor-livro="${l.id}">${renderCoverHTML(l)}<span>${escapeHTML(l.titulo)}</span></button>`).join("") : `<div class="estado-vazio">Nenhuma obra cadastrada.</div>`;
  const img = $("#autor-modal-foto");
  const wrap = $(".autor-perfil-foto");
  const fallback = $("#autor-modal-fallback");
  wrap.classList.remove("sem-foto");
  fallback.textContent = AuthorPhoto.initials(autor.nome);
  AuthorPhoto.apply(img, autor);
  $$("[data-autor-livro]").forEach((btn) => btn.addEventListener("click", () => { fecharModal("modal-autor"); abrirDetalheLivro(Number(btn.dataset.autorLivro)); }));
  abrirModal("modal-autor");
}

/* -------------------------------------------------------------------------
   Notificações
   ------------------------------------------------------------------------- */
function renderNotificacoes() {
  const user = Auth.getUser();
  if (!user) return;
  const minhas = DB.getNotificacoes().filter((n) => n.email === user.email);
  const naoLidas = minhas.filter((n) => !n.lida).length;
  $("#badge-notificacoes").textContent = naoLidas;
  $("#badge-notificacoes").style.display = naoLidas ? "inline-flex" : "none";

  $("#lista-notificacoes").innerHTML = minhas.length
    ? minhas.map((n) => {
        const detalhes = n.detalhes;
        const isEmprestimo = detalhes?.tipo === "emprestimo";
        const devolucao = detalhes?.devolucao ? new Date(`${detalhes.devolucao}T23:59:59`) : null;
        const atrasado = isEmprestimo && devolucao && devolucao < new Date();
        return `
          <div class="notificacao-item ${n.lida ? "" : "nao-lida"}" data-notificacao-id="${n.id}" tabindex="0" role="button" aria-expanded="false">
            <div class="notificacao-status-dot"></div>
            <div class="notificacao-conteudo"><p>${escapeHTML(n.mensagem)}</p><time>${formatarData(n.criadoEm)}</time></div>
            ${isEmprestimo ? `<div class="notificacao-detalhes">
              <strong>${escapeHTML(detalhes.titulo)}</strong>
              <span>${escapeHTML(detalhes.autor || "Livro do acervo")}</span>
              <span>Emprestado em ${formatarDataISO(detalhes.data)}</span>
              <span>Devolução prevista para ${formatarDataISO(detalhes.devolucao)}${atrasado ? " · atrasado" : ""}</span>
              <span class="notificacao-link-hint">Confira o status completo na aba Empréstimos.</span>
              <button type="button" class="btn-abrir-emprestimos" data-open-emprestimos>Ver em Empréstimos</button>
            </div>` : ""}
          </div>`;
      }).join("")
    : `<div class="notificacao-vazia"><span>✓</span><strong>Você está em dia</strong><small>Nenhuma notificação nova por aqui.</small></div>`;

  const painel = $("#painel-notificacoes");
  const cabecalho = painel.querySelector(".notificacoes-cabecalho");
  if (!cabecalho) {
    painel.insertAdjacentHTML("afterbegin", `<div class="notificacoes-cabecalho"><div><strong>Notificações</strong><span>${naoLidas ? `${naoLidas} nova${naoLidas === 1 ? "" : "s"}` : "Tudo lido"}</span></div><button type="button" id="btn-marcar-notificacoes" class="btn-notificacoes-link">Marcar todas como lidas</button></div>`);
  } else {
    const sub = cabecalho.querySelector("span");
    if (sub) sub.textContent = naoLidas ? `${naoLidas} nova${naoLidas === 1 ? "" : "s"}` : "Tudo lido";
  }

  $("#btn-marcar-notificacoes")?.addEventListener("click", (e) => {
    e.stopPropagation();
    DB.setNotificacoes(DB.getNotificacoes().map((n) => (n.email === user.email ? { ...n, lida: true } : n)));
    renderNotificacoes();
  });

  $$(".notificacao-item", $("#lista-notificacoes")).forEach((item) => {
    const id = Number(item.dataset.notificacaoId);
    const ativar = () => {
      const atual = DB.getNotificacoes().find((n) => n.id === id);
      if (atual && !atual.lida) {
        DB.setNotificacoes(DB.getNotificacoes().map((n) => (n.id === id ? { ...n, lida: true } : n)));
        item.classList.remove("nao-lida");
        renderNotificacoes();
        item = $("[data-notificacao-id='" + id + "']");
      }
      if (item) {
        const aberto = item.classList.toggle("expandida");
        item.setAttribute("aria-expanded", aberto ? "true" : "false");
      }
    };
    item.addEventListener("click", (e) => {
      if (e.target.closest("[data-open-emprestimos]")) return;
      ativar();
    });
    item.addEventListener("keydown", (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); ativar(); } });
    item.querySelector("[data-open-emprestimos]")?.addEventListener("click", (e) => { e.stopPropagation(); irPara("emprestimos", "emprestimos"); $("#painel-notificacoes").classList.remove("aberto"); });
  });
}

function ativarNotificacoes() {
  const btn = $("#btn-notificacoes");
  const painel = $("#painel-notificacoes");
  if (!btn || !painel) return;
  btn.addEventListener("click", (e) => {
    e.stopPropagation();
    painel.classList.toggle("aberto");
  });
  painel.addEventListener("click", (e) => e.stopPropagation());
  document.addEventListener("click", (e) => {
    if (painel.classList.contains("aberto") && !painel.contains(e.target) && !btn.contains(e.target)) {
      painel.classList.remove("aberto");
    }
  });
}

/* -------------------------------------------------------------------------
   Empréstimos e Minha Conta
   ------------------------------------------------------------------------- */
function renderEmprestimos() {
  const user = Auth.getUser();
  const emprestimos = DB.getEmprestimos().filter((e) => e.email === user.email).sort((a, b) => new Date(b.data) - new Date(a.data));
  const ativos = emprestimos.filter((e) => e.status === "ativo");
  const atrasados = ativos.filter((e) => DB.emAtraso(e));
  const cont = $("#lista-emprestimos");
  cont.innerHTML = `
    <div class="emprestimos-resumo">
      <div><span>Ativos</span><strong>${ativos.length}</strong></div>
      <div><span>Atrasados</span><strong class="${atrasados.length ? "valor-alerta" : ""}">${atrasados.length}</strong></div>
      <div><span>Histórico</span><strong>${emprestimos.length}</strong></div>
    </div>
    ${emprestimos.length ? emprestimos.map((e) => {
      const atrasado = DB.emAtraso(e);
      const devolvido = e.status === "devolvido";
      return `<article class="emprestimo-item ${atrasado ? "atrasado" : ""} ${devolvido ? "devolvido" : ""}">
        <div class="emprestimo-capa">${renderCoverHTML({ titulo: e.titulo, autor: e.autor || "", categoria: e.categoria || "romance" })}</div>
        <div class="emprestimo-dados"><div class="emprestimo-kicker">${devolvido ? "Histórico" : "Empréstimo ativo"}</div><strong>${escapeHTML(e.titulo)}</strong><span>${escapeHTML(e.autor || "Livro do acervo")}</span><small>Emprestado em ${formatarDataISO(e.data)} · devolução ${formatarDataISO(e.devolucao)}${e.devolvidoEm ? ` · devolvido em ${formatarData(e.devolvidoEm)}` : ""}</small></div>
        <div class="emprestimo-acao"><span class="badge ${devolvido ? "badge-disp" : atrasado ? "badge-indisp" : "badge-disp"}">${devolvido ? "Devolvido" : atrasado ? "Atrasado" : "Em dia"}</span>${!devolvido ? `<button type="button" class="btn btn-secundario btn-pequeno" data-devolver="${e.id}">Registrar devolução</button>` : ""}</div>
      </article>`;
    }).join("") : `<div class="estado-vazio estado-vazio-card"><span class="estado-vazio-icon">▱</span><strong>Nenhum empréstimo registrado</strong><p>Explore o catálogo para encontrar seu próximo livro.</p><button type="button" class="btn btn-primario" data-view-target="livros">Explorar catálogo</button></div>`}`;

  $$("[data-devolver]", cont).forEach((btn) => btn.addEventListener("click", async () => {
    const id = Number(btn.dataset.devolver);
    const emprestimo = DB.getEmprestimos().find((e) => e.id === id);
    if (!emprestimo || emprestimo.status !== "ativo") return;
    const ok = await confirmar(`Registrar a devolução de "${emprestimo.titulo}"?`);
    if (!ok) return;
    const res = DB.devolver(id, user);
    if (!res.ok) { toast(res.erro, "erro"); return; }
    toast("Devolução registrada com sucesso.");
    renderEmprestimos(); renderCatalogo(); renderMaisAcessados(); renderNotificacoes();
  }));
  $$("[data-view-target]", cont).forEach((btn) => btn.addEventListener("click", () => irPara(btn.dataset.viewTarget)));
}

function renderMinhaConta() {
  const user = Auth.getUser();
  $("#conta-nome").value = user.nome;
  $("#conta-email").value = user.email;
  $("#conta-telefone").value = user.telefone || "";

  const emprestimos = DB.getEmprestimos().filter((e) => e.email === user.email);
  const ativos = emprestimos.filter((e) => e.status === "ativo");
  const atrasados = ativos.filter((e) => DB.emAtraso(e));
  $("#conta-total-emprestimos").textContent = emprestimos.length;
  $("#conta-emprestimos-ativos").textContent = ativos.length;
  const contaAtrasados = $("#conta-emprestimos-atrasados");
  const contaStatus = $("#conta-status");
  const contaIniciais = $("#conta-iniciais");
  if (contaAtrasados) contaAtrasados.textContent = atrasados.length;
  if (contaStatus) contaStatus.textContent = atrasados.length ? "Atenção necessária" : "Cadastro em dia";
  if (contaIniciais) contaIniciais.textContent = user.nome.split(/\s+/).filter(Boolean).slice(0,2).map((p) => p[0]).join("").toUpperCase();

  const form = $("#form-conta");
  form.onsubmit = (e) => {
    e.preventDefault();
    const nome = $("#conta-nome").value.trim();
    if (nome.length < 3) { toast("Informe um nome válido.", "erro"); return; }
    Auth.atualizarPerfil({ nome, telefone: $("#conta-telefone").value.trim() });
    $("#usuario-nome").textContent = nome.split(" ")[0];
    $("#usuario-avatar-letra").textContent = nome[0].toUpperCase();
    const contaIniciaisAtual = $("#conta-iniciais");
    if (contaIniciaisAtual) contaIniciaisAtual.textContent = nome.split(/\s+/).filter(Boolean).slice(0,2).map((p) => p[0]).join("").toUpperCase();
    toast("Dados atualizados com sucesso.");
  };
}
