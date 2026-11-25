/* =========================================================================
   admin.js — Área administrativa (front-end / localStorage)
   Regras e validações ficam em DB (js/db.js); aqui só a camada de telas.
   ========================================================================= */

const Admin = {
  cadastrarLivro(dados) { return DB.criarLivro(dados); },
  editarLivro(id, dados) { return DB.atualizarLivro(id, dados); },
  excluirLivro(id) { return DB.removerLivro(id); },

  estatisticas() {
    const livros = DB.getLivros();
    const usuarios = DB.getUsuarios().filter((u) => u.tipo === "usuario");
    const emprestimos = DB.getEmprestimos();
    const atrasados = emprestimos.filter((e) => DB.emAtraso(e)).length;
    const exemplaresDisponiveis = livros.reduce((s, l) => s + (Number(l.qtdDisp) || 0), 0);
    return {
      totalLivros: livros.length,
      exemplares: livros.reduce((s, l) => s + (Number(l.qtdTotal) || 0), 0),
      exemplaresDisponiveis,
      usuarios: usuarios.length,
      emprestimos: emprestimos.filter((e) => DB.emAberto(e)).length,
      devolvidos: emprestimos.filter((e) => e.status === "devolvido").length,
      atrasados,
    };
  },

  renderGraficoAcessos(containerEl) {
    if (!containerEl) return;
    const livros = [...DB.getLivros()].map((l) => ({ ...l, acessos: Number(l.acessos) || 0 }))
      .sort((a, b) => b.acessos - a.acessos).slice(0, 5);
    if (!livros.length) {
      containerEl.innerHTML = '<div class="grafico-vazio">Ainda não há livros cadastrados.</div>';
      return;
    }
    const max = Math.max(...livros.map((l) => l.acessos), 1);
    containerEl.innerHTML = livros.map((l, i) => {
      const largura = Math.max(7, Math.round((l.acessos / max) * 100));
      return `
        <button type="button" class="grafico-linha" data-grafico-livro="${l.id}" style="--delay:${i * 55}ms" aria-label="${escapeHTML(l.titulo)} com ${l.acessos} acessos">
          <span class="grafico-rank">${String(i + 1).padStart(2, "0")}</span>
          <span class="grafico-dados"><span class="grafico-nome" title="${escapeHTML(l.titulo)}">${escapeHTML(l.titulo)}</span><span class="grafico-autordesc">${escapeHTML(l.autor)} · ${escapeHTML(nomeCategoria(l.categoria))}</span><span class="grafico-trilho"><span class="grafico-barra" style="--largura:${largura}%"></span></span></span>
          <span class="grafico-valor">${l.acessos}</span>
        </button>`;
    }).join("");
    $$('[data-grafico-livro]', containerEl).forEach((el) => el.addEventListener("click", () => abrirDetalheLivro(Number(el.dataset.graficoLivro))));
  },

  renderCategorias(containerEl) {
    if (!containerEl) return;
    const livros = DB.getLivros();
    const cats = DB.getCategorias().map((c) => ({ ...c, total: livros.filter((l) => l.categoria === c.id).length }))
      .filter((c) => c.total > 0)
      .sort((a, b) => b.total - a.total);
    const total = Math.max(1, livros.length);
    /* Mesma cor da categoria nas capas e nos cards (CATEGORY_PALETTE), para o gráfico bater com o resto do site. */
    const corDe = (c) => (typeof CATEGORY_PALETTE !== "undefined" && CATEGORY_PALETTE[c.id]?.[1]) || "var(--gold)";
    let acumulado = 0;
    const stops = cats.map((c) => {
      const ini = acumulado;
      acumulado += (c.total / total) * 360;
      return `${corDe(c)} ${ini.toFixed(2)}deg ${acumulado.toFixed(2)}deg`;
    }).join(", ");
    containerEl.innerHTML = `
      <div class="categoria-donut" style="background:conic-gradient(${stops || "var(--surface-2) 0deg 360deg"})">
        <div class="categoria-donut-centro"><strong>${livros.length}</strong><span>títulos</span></div>
      </div>
      <div class="categoria-legenda">${cats.map((c) => `<div><span class="categoria-legenda-cor" style="background:${corDe(c)}"></span><span>${escapeHTML(c.nome)}</span><strong>${c.total}</strong></div>`).join("")}</div>`;
  },

  renderAtividades(containerEl) {
    if (!containerEl) return;
    const atividades = [];
    const emprestimos = [...DB.getEmprestimos()].sort((a, b) => new Date(`${b.data}T12:00:00`) - new Date(`${a.data}T12:00:00`));
    emprestimos.slice(0, 4).forEach((e) => atividades.push({ icone: e.status === "devolvido" ? "↩" : e.status === "pendente" ? "⏳" : "↗", titulo: e.status === "devolvido" ? "Livro devolvido" : e.status === "pendente" ? "Devolução a conferir" : "Novo empréstimo", texto: e.titulo, data: formatarDataISO(e.data) }));
    [...DB.getLivros()].sort((a, b) => (b.criadoEm || 0) - (a.criadoEm || 0)).slice(0, 3).forEach((l) => atividades.push({ icone: "+", titulo: "Livro no acervo", texto: l.titulo, data: l.criadoEm ? formatarData(l.criadoEm) : "Agora" }));
    if (!atividades.length) {
      containerEl.innerHTML = '<div class="grafico-vazio">Ainda não há movimentações.</div>';
      return;
    }
    containerEl.innerHTML = atividades.slice(0, 6).map((a) => `<div class="atividade-item"><span class="atividade-icone">${a.icone}</span><div><strong>${escapeHTML(a.titulo)}</strong><span>${escapeHTML(a.texto)}</span></div><time>${escapeHTML(a.data)}</time></div>`).join("");
  },

  renderAtrasados(containerEl) {
    if (!containerEl) return;
    const atrasados = DB.getEmprestimos().filter((e) => DB.emAtraso(e)).slice(0, 5);
    containerEl.innerHTML = atrasados.length
      ? atrasados.map((e) => `<div class="alerta-emprestimo"><span class="alerta-icone">!</span><div><strong>${escapeHTML(e.titulo)}</strong><span>${escapeHTML(e.nome || e.email)} · venceu em ${formatarDataISO(e.devolucao)}</span></div><span class="badge badge-indisp">Atrasado</span></div>`).join("")
      : '<div class="sem-alertas"><span>✓</span><div><strong>Nenhum empréstimo atrasado</strong><small>O acervo está em dia neste momento.</small></div></div>';
  },
};

function preencherCategoriasGerenciar() {
  const select = $("#filtro-categoria-gerenciar");
  if (!select) return;
  const atual = select.value;
  select.innerHTML = `<option value="">Todas as categorias</option>` + DB.getCategorias().map((c) => `<option value="${escapeHTML(c.id)}">${escapeHTML(c.nome)}</option>`).join("");
  select.value = atual;
}

function initAreaAdmin() {
  $("#btn-cadastrar-livro")?.addEventListener("click", () => abrirFormLivro());
  $("#form-livro")?.addEventListener("submit", (e) => {
    e.preventDefault();
    const dados = {
      titulo: $("#campo-titulo").value,
      autor: $("#campo-autor").value,
      editora: $("#campo-editora").value,
      ano: $("#campo-ano").value,
      categoria: $("#campo-categoria").value,
      qtdTotal: $("#campo-qtd").value,
      descricao: $("#campo-descricao").value,
    };
    const id = Number($("#form-livro").dataset.editId || 0);
    const res = id ? Admin.editarLivro(id, dados) : Admin.cadastrarLivro(dados);
    if (!res.ok) { toast(res.erro, "erro"); return; }
    toast(id ? "Livro atualizado com sucesso." : "Livro cadastrado com sucesso.");
    fecharModal("modal-livro");
    renderCatalogo(); renderCategorias(); renderGerenciarLivros(); renderMaisAcessados();
    if (Auth.isAdmin()) renderDashboard();
  });
  $("#campo-pesquisa-gerenciar")?.addEventListener("input", renderGerenciarLivros);
  $("#filtro-categoria-gerenciar")?.addEventListener("change", renderGerenciarLivros);
  $("#filtro-disponibilidade-gerenciar")?.addEventListener("change", renderGerenciarLivros);
  $("#ordenacao-gerenciar")?.addEventListener("change", renderGerenciarLivros);
  preencherCategoriasGerenciar();
  initAdminExtras();
}

function abrirFormLivro(livro = null) {
  const form = $("#form-livro");
  form.reset();
  form.dataset.editId = livro ? livro.id : "";
  const listaAutores = $("#lista-autores");
  if (listaAutores) listaAutores.innerHTML = DB.getAutores().map((a) => `<option value="${escapeHTML(a.nome)}"></option>`).join("");
  $("#modal-livro-titulo").textContent = livro ? "Editar livro" : "Cadastrar livro";
  $("#modal-livro-botao").textContent = livro ? "Salvar alterações" : "Cadastrar livro";
  if (livro) {
    $("#campo-titulo").value = livro.titulo;
    $("#campo-autor").value = livro.autor;
    $("#campo-editora").value = livro.editora;
    $("#campo-ano").value = livro.ano;
    $("#campo-categoria").value = livro.categoria;
    $("#campo-qtd").value = livro.qtdTotal;
    $("#campo-descricao").value = livro.descricao;
  }
  abrirModal("modal-livro");
  setTimeout(() => $("#campo-titulo")?.focus(), 100);
}
window.abrirFormLivro = abrirFormLivro;

function renderGerenciarLivros() {
  const termo = normalizarTexto($("#campo-pesquisa-gerenciar")?.value || "");
  const categoria = $("#filtro-categoria-gerenciar")?.value || "";
  const disponibilidade = $("#filtro-disponibilidade-gerenciar")?.value || "";
  const ordem = $("#ordenacao-gerenciar")?.value || "titulo-asc";
  let livros = DB.getLivros().filter((l) => {
    const busca = [l.titulo, l.autor, l.editora, l.categoria, nomeCategoria(l.categoria)].some((v) => normalizarTexto(v).includes(termo));
    const catOk = !categoria || l.categoria === categoria;
    const disp = Number(l.qtdDisp) > 0;
    const statusOk = !disponibilidade || (disponibilidade === "disponivel" ? disp : !disp);
    return busca && catOk && statusOk;
  });
  livros.sort((a, b) => {
    if (ordem === "titulo-desc") return b.titulo.localeCompare(a.titulo, "pt-BR");
    if (ordem === "acessos-desc") return (Number(b.acessos) || 0) - (Number(a.acessos) || 0);
    if (ordem === "recentes") return (b.criadoEm || 0) - (a.criadoEm || 0);
    return a.titulo.localeCompare(b.titulo, "pt-BR");
  });
  $("#gerenciar-contagem").textContent = `${livros.length} ${livros.length === 1 ? "livro encontrado" : "livros encontrados"}`;
  $("#tabela-livros-corpo").innerHTML = livros.length ? livros.map((l) => `
    <tr>
      <td class="col-capa-mini">${renderCoverHTML(l)}</td>
      <td><strong>${escapeHTML(l.titulo)}</strong><small class="linha-secundaria">${escapeHTML(l.editora || "Sem editora")} · ${escapeHTML(String(l.ano || "—"))}</small></td>
      <td>${escapeHTML(l.autor)}</td>
      <td><span class="chip-chip">${escapeHTML(nomeCategoria(l.categoria))}</span></td>
      <td><span class="estoque-indicador"><i class="estoque-ponto ${l.qtdDisp > 0 ? "ok" : "off"}"></i>${l.qtdDisp} / ${l.qtdTotal}</span></td>
      <td class="col-acoes"><button class="btn-icone" data-editar="${l.id}" aria-label="Editar ${escapeHTML(l.titulo)}">Editar</button><button class="btn-icone btn-icone-perigo" data-excluir="${l.id}" aria-label="Excluir ${escapeHTML(l.titulo)}">Excluir</button></td>
    </tr>`).join("") : `<tr><td colspan="6"><div class="tabela-vazia"><strong>Nenhum livro encontrado</strong><span>Tente outro título, autor, gênero ou filtro.</span></div></td></tr>`;

  $$('[data-editar]').forEach((btn) => btn.addEventListener("click", () => { const livro = DB.getLivros().find((l) => l.id === Number(btn.dataset.editar)); if (livro) abrirFormLivro(livro); }));
  $$('[data-excluir]').forEach((btn) => btn.addEventListener("click", async () => {
    const livro = DB.getLivros().find((l) => l.id === Number(btn.dataset.excluir));
    if (!livro) return;
    const ok = await confirmar(`Tem certeza que deseja excluir "${livro.titulo}"? Se o livro já teve empréstimos, ele sai do catálogo mas o histórico é preservado.`, "Excluir");
    if (!ok) return;
    const res = Admin.excluirLivro(livro.id);
    if (!res.ok) { toast(res.motivo, "erro"); return; }
    toast(res.arquivado ? "Livro retirado do catálogo (histórico de empréstimos preservado)." : "Livro excluído com sucesso.");
    renderCatalogo(); renderCategorias(); renderGerenciarLivros(); renderMaisAcessados(); renderDashboard();
  }));
}

function renderDashboard() {
  const stats = Admin.estatisticas();
  $("#stat-total-livros").textContent = stats.totalLivros;
  $("#stat-exemplares").textContent = stats.exemplares;
  $("#stat-usuarios").textContent = stats.usuarios;
  $("#stat-emprestimos").textContent = stats.emprestimos;
  $("#stat-atrasados").textContent = stats.atrasados;
  Admin.renderGraficoAcessos($("#grafico-acessos"));
  Admin.renderCategorias($("#grafico-categorias"));
  Admin.renderAtividades($("#dash-atividades"));
  Admin.renderAtrasados($("#dash-atrasados-lista"));
  const autoresProcurados = DB.getAutores().map((autor) => ({ ...autor, acessos: DB.getLivros().filter((l) => l.autorId === autor.id).reduce((s, l) => s + (Number(l.acessos) || 0), 0) })).sort((a,b) => b.acessos - a.acessos).slice(0, 5);
  $("#dash-autores-procurados").innerHTML = autoresProcurados.length ? autoresProcurados.map((a, i) => `<li><span class="lista-rank-num">${String(i+1).padStart(2,"0")}</span><span class="lista-rank-nome"><strong>${escapeHTML(a.nome)}</strong><small>${escapeHTML(a.anos || "Autor do acervo")}</small></span><small>${a.acessos} acessos</small></li>`).join("") : '<li>Nenhum autor encontrado.</li>';
  }


/* =========================================================================
   Controle de empréstimos (bibliotecário)
   ========================================================================= */
function situacaoEmprestimo(e, hoje = dataLocalISO()) {
  if (e.status === "solicitacao") return { chave: "solicitacao", rotulo: "Empréstimo aguardando confirmação", classe: "badge badge-pendente" };
  if (e.status === "recusado") return { chave: "recusado", rotulo: "Solicitação recusada", classe: "badge badge-indisp" };
  if (e.status === "devolvido") return { chave: "devolvido", rotulo: "Devolvido", classe: "badge badge-disp" };
  if (e.status === "pendente") return { chave: "pendente", rotulo: "Devolução a conferir", classe: "badge badge-pendente" };
  const dias = diasEntreISO(hoje, e.devolucao);
  if (dias < 0) return { chave: "atrasado", rotulo: `Atrasado há ${-dias} dia${dias === -1 ? "" : "s"}`, classe: "badge badge-indisp" };
  if (dias === 0) return { chave: "vencendo", rotulo: "Vence hoje", classe: "chip-chip" };
  if (dias <= 3) return { chave: "vencendo", rotulo: `Vence em ${dias} dia${dias === 1 ? "" : "s"}`, classe: "chip-chip" };
  return { chave: "emdia", rotulo: "Em dia", classe: "badge badge-disp" };
}

function renderAdminEmprestimos() {
  const hoje = dataLocalISO();
  const todos = DB.getEmprestimos().map((e) => ({ ...e, sit: situacaoEmprestimo(e, hoje) }));
  const ativos = todos.filter((e) => e.status === "ativo" || e.status === "pendente" || e.status === "solicitacao");
  $("#ae-stat-ativos").textContent = ativos.length;
  $("#ae-stat-pendentes").textContent = ativos.filter((e) => e.status === "pendente" || e.status === "solicitacao").length;
  $("#ae-stat-atrasados").textContent = ativos.filter((e) => e.sit.chave === "atrasado").length;
  $("#ae-stat-vencendo").textContent = ativos.filter((e) => e.sit.chave === "vencendo").length;
  $("#ae-stat-devolvidos").textContent = todos.filter((e) => e.status === "devolvido").length;

  const termo = normalizarTexto($("#ae-busca").value);
  const filtro = $("#ae-filtro").value;
  const passa = (e) => {
    if (filtro === "ativos" && (e.status === "devolvido" || e.status === "recusado")) return false;
    if (filtro === "pendentes" && e.status !== "pendente" && e.status !== "solicitacao") return false;
    if (filtro === "devolvidos" && e.status !== "devolvido") return false;
    if (filtro === "atrasados" && e.sit.chave !== "atrasado") return false;
    if (filtro === "vencendo" && e.sit.chave !== "vencendo") return false;
    return !termo || [e.titulo, e.autor, e.nome, e.email].some((v) => normalizarTexto(v).includes(termo));
  };
  const lista = todos.filter(passa).sort((a, b) => {
    const peso = { solicitacao: 0, pendente: 1, ativo: 2, recusado: 3, devolvido: 4 };
    if (a.status !== b.status) return peso[a.status] - peso[b.status];
    if (a.status === "solicitacao") return (a.solicitadoEm || 0) - (b.solicitadoEm || 0);
    if (a.status === "pendente") return (a.devolucaoInformadaEm || 0) - (b.devolucaoInformadaEm || 0);
    if (a.status === "ativo") return a.devolucao.localeCompare(b.devolucao) || a.id - b.id;
    return (b.devolvidoEm || 0) - (a.devolvidoEm || 0);
  });

  $("#ae-contagem").textContent = `${lista.length} ${lista.length === 1 ? "empréstimo" : "empréstimos"}`;
  $("#ae-corpo").innerHTML = lista.length ? lista.map((e) => `
    <tr>
      <td data-label="Livro"><strong>${escapeHTML(e.titulo)}</strong><small class="linha-secundaria">${escapeHTML(e.autor)}</small></td>
      <td data-label="Leitor"><strong>${escapeHTML(e.nome || e.email)}</strong><small class="linha-secundaria">${escapeHTML(e.email)}${e.telefone ? " · " + escapeHTML(e.telefone) : ""}</small></td>
      <td data-label="Retirada">${formatarDataISO(e.data)}</td>
      <td data-label="Devolução">${formatarDataISO(e.devolucao)}${e.devolvidoEm ? `<small class="linha-secundaria">devolvido em ${formatarData(e.devolvidoEm)}</small>` : ""}${e.status === "solicitacao" ? `<small class="linha-secundaria">solicitado em ${formatarData(e.solicitadoEm)}</small>` : e.status === "pendente" ? `<small class="linha-secundaria">leitor informou em ${formatarData(e.devolucaoInformadaEm)}</small>` : ""}</td>
      <td data-label="Situação"><span class="${e.sit.classe}">${escapeHTML(e.sit.rotulo)}</span></td>
      <td>${e.status === "solicitacao"
        ? `<div class="col-acoes"><button class="btn-icone" data-ae-emprestimo-confirmar="${e.id}">Confirmar empréstimo</button><button class="btn-icone btn-icone-perigo" data-ae-emprestimo-recusar="${e.id}">Recusar</button></div>`
        : e.status === "pendente" ? `<div class="col-acoes"><button class="btn-icone" data-ae-devolver="${e.id}">Confirmar recebimento</button><button class="btn-icone btn-icone-perigo" data-ae-recusar="${e.id}">Não recebi</button></div>`
        : e.status === "ativo" ? `<div class="col-acoes"><button class="btn-icone" data-ae-devolver="${e.id}">Registrar devolução</button></div>`
        : e.status === "devolvido" ? `<div class="col-acoes"><button class="btn-icone" data-ae-reabrir="${e.id}">Retornar para em aberto</button></div>` : ""}</td>
    </tr>`).join("")
    : `<tr><td colspan="6"><div class="tabela-vazia"><strong>Nenhum empréstimo encontrado</strong><span>Mude o filtro ou a busca.</span></div></td></tr>`;
}

/* =========================================================================
   Usuários
   ========================================================================= */
function renderUsuarios() {
  const eu = Auth.getUser();
  const todos = DB.listarUsuarios();
  $("#us-stat-total").textContent = todos.length;
  $("#us-stat-leitores").textContent = todos.filter((u) => u.tipo === "usuario").length;
  $("#us-stat-admins").textContent = todos.filter((u) => u.tipo === "admin").length;
  $("#us-stat-atrasados").textContent = todos.filter((u) => u.atrasados > 0).length;

  const termo = normalizarTexto($("#us-busca").value);
  const tipo = $("#us-filtro").value;
  const lista = todos
    .filter((u) => (!tipo || u.tipo === tipo) && (!termo || [u.nome, u.email].some((v) => normalizarTexto(v).includes(termo))))
    .sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"));

  $("#us-contagem").textContent = `${lista.length} ${lista.length === 1 ? "usuário" : "usuários"}`;
  $("#us-corpo").innerHTML = lista.length ? lista.map((u) => {
    const voce = u.email === eu.email;
    const outroTipo = u.tipo === "admin" ? "usuario" : "admin";
    return `
    <tr>
      <td data-label="Usuário"><strong>${escapeHTML(u.nome)}${voce ? ' <span class="chip-chip">você</span>' : ""}</strong><small class="linha-secundaria">${escapeHTML(u.email)}${u.telefone ? " · " + escapeHTML(u.telefone) : ""}</small></td>
      <td data-label="Tipo"><span class="chip-chip">${u.tipo === "admin" ? "Administrador(a)" : "Leitor(a)"}</span></td>
      <td data-label="Ativos">${u.ativos}</td>
      <td data-label="Atrasados" class="${u.atrasados ? "valor-alerta" : ""}">${u.atrasados}</td>
      <td data-label="Total">${u.total}</td>
      <td>${voce ? "" : `<div class="col-acoes">
        <button class="btn-icone" data-us-papel="${escapeHTML(u.email)}" data-us-tipo="${outroTipo}">${u.tipo === "admin" ? "Tornar leitor" : "Tornar admin"}</button>
        <button class="btn-icone btn-icone-perigo" data-us-excluir="${escapeHTML(u.email)}">Excluir</button>
      </div>`}</td>
    </tr>`;
  }).join("") : `<tr><td colspan="6"><div class="tabela-vazia"><strong>Nenhum usuário encontrado</strong><span>Mude o filtro ou a busca.</span></div></td></tr>`;
}

/* =========================================================================
   Backup e dados
   ========================================================================= */
function renderSistema() {
  const d = DB.exportar().dados;
  $("#sis-stat-livros").textContent = d.livros.length;
  $("#sis-stat-usuarios").textContent = d.usuarios.length;
  $("#sis-stat-emprestimos").textContent = d.emprestimos.length;
  const { bytes, limiteBytes } = DB.usoArmazenamento();
  $("#sis-stat-uso").textContent = `${Math.max(1, Math.round((bytes / limiteBytes) * 100))}%`;
  $("#sis-stat-uso-rotulo").textContent = `${(bytes / 1024).toFixed(0)} KB de ~5 MB do navegador`;
  $("#sis-bloco-backup-antigo").style.display = DB.temBackupMigracao() ? "block" : "none";
  mostrarErrosImportacao([]);
}

function mostrarErrosImportacao(erros) {
  const box = $("#sis-erros-importacao");
  if (!erros.length) { box.style.display = "none"; box.textContent = ""; return; }
  box.style.display = "block";
  box.innerHTML = `<strong>Não foi possível importar. Nada foi alterado.</strong><ul style="margin:8px 0 0 18px;">${erros.map((e) => `<li>${escapeHTML(e)}</li>`).join("")}</ul>`;
}

function baixarBackup() {
  const conteudo = JSON.stringify(DB.exportar(), null, 2);
  const url = URL.createObjectURL(new Blob([conteudo], { type: "application/json" }));
  const a = document.createElement("a");
  a.href = url;
  a.download = `biblioteca-maynard-backup-${dataLocalISO()}.json`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  toast("Backup gerado. Guarde o arquivo em local seguro: ele contém senhas.");
}

async function importarArquivoBackup(arquivo) {
  mostrarErrosImportacao([]);
  if (arquivo.size > 4 * 1024 * 1024) { mostrarErrosImportacao(["O arquivo tem mais de 4 MB; não parece um backup desta biblioteca."]); return; }
  let json;
  try { json = JSON.parse(await arquivo.text()); }
  catch (e) { mostrarErrosImportacao(["O arquivo não é um JSON válido."]); return; }
  const v = DB.validarBackup(json);
  if (!v.ok) { mostrarErrosImportacao(v.erros); return; }
  const { livros, usuarios, emprestimos } = v.dados;
  const ok = await confirmar(`Importar ${livros.length} livros, ${usuarios.length} contas e ${emprestimos.length} empréstimos? Isto SUBSTITUI todos os dados atuais e você será desconectado.`, "Importar e substituir");
  if (!ok) return;
  const res = DB.importar(json);
  if (!res.ok) { mostrarErrosImportacao(res.erros); return; }
  toast("Backup importado com sucesso. Entre novamente.");
  setTimeout(() => Auth.logout(), 1200);
}

/* =========================================================================
   Ligação dos eventos das três telas (uma vez, na inicialização do admin)
   ========================================================================= */
function initAdminExtras() {
  // --- controle de empréstimos
  $("#ae-busca").addEventListener("input", renderAdminEmprestimos);
  $("#ae-filtro").addEventListener("change", renderAdminEmprestimos);
  $("#ae-corpo").addEventListener("click", async (ev) => {
    const confirmarEmp = ev.target.closest("[data-ae-emprestimo-confirmar]");
    if (confirmarEmp) {
      const id = Number(confirmarEmp.dataset.aeEmprestimoConfirmar), emp = DB.getEmprestimos().find(e => e.id === id);
      if (!emp || emp.status !== "solicitacao") return;
      if (!(await confirmar(`Confirmar que "${emp.titulo}" foi entregue a ${emp.nome || emp.email}?`, "Confirmar empréstimo"))) return;
      const result = DB.confirmarEmprestimo(id, Auth.getUser()); if (!result.ok) { toast(result.erro, "erro"); return; }
      toast("Empréstimo confirmado e registrado."); renderAdminEmprestimos(); renderCatalogo(); renderNotificacoes(); return;
    }
    const recusarEmp = ev.target.closest("[data-ae-emprestimo-recusar]");
    if (recusarEmp) {
      const id = Number(recusarEmp.dataset.aeEmprestimoRecusar), emp = DB.getEmprestimos().find(e => e.id === id);
      if (!emp || emp.status !== "solicitacao") return;
      if (!(await confirmar(`Recusar a solicitação de "${emp.titulo}" de ${emp.nome || emp.email}?`, "Recusar empréstimo"))) return;
      const result = DB.recusarEmprestimo(id, Auth.getUser()); if (!result.ok) { toast(result.erro, "erro"); return; }
      toast("Solicitação recusada. O exemplar foi liberado."); renderAdminEmprestimos(); renderCatalogo(); renderNotificacoes(); return;
    }
    const recusar = ev.target.closest("[data-ae-recusar]");
    if (recusar) {
      const idRec = Number(recusar.dataset.aeRecusar);
      const empRec = DB.getEmprestimos().find((e) => e.id === idRec);
      if (!empRec || empRec.status !== "pendente") return;
      const okRec = await confirmar(`Você NÃO recebeu "${empRec.titulo}" de ${empRec.nome || empRec.email}? O empréstimo voltará a ficar ativo e o leitor será avisado.`, "Não recebi");
      if (!okRec) return;
      const resRec = DB.recusarDevolucao(idRec, Auth.getUser());
      if (!resRec.ok) { toast(resRec.erro, "erro"); return; }
      toast("Devolução recusada. O empréstimo continua ativo e o leitor foi avisado.");
      renderAdminEmprestimos();
      return;
    }
    const reabrir = ev.target.closest("[data-ae-reabrir]");
    if (reabrir) {
      const idReabrir = Number(reabrir.dataset.aeReabrir);
      const emprestimo = DB.getEmprestimos().find((e) => e.id === idReabrir);
      if (!emprestimo || emprestimo.status !== "devolvido") return;
      const confirmaReabertura = await confirmar(`Retornar o empréstimo de "${emprestimo.titulo}" de ${emprestimo.nome || emprestimo.email} para em aberto? A devolução registrada será desfeita.`, "Retornar para em aberto");
      if (!confirmaReabertura) return;
      const resultado = DB.reabrirEmprestimo(idReabrir, Auth.getUser());
      if (!resultado.ok) { toast(resultado.erro, "erro"); return; }
      toast("Empréstimo retornado para em aberto.");
      renderAdminEmprestimos(); renderCatalogo(); renderNotificacoes(); renderMaisAcessados();
      return;
    }
    const btn = ev.target.closest("[data-ae-devolver]");
    if (!btn) return;
    const id = Number(btn.dataset.aeDevolver);
    const emp = DB.getEmprestimos().find((e) => e.id === id);
    if (!emp) return;
    const pergunta = emp.status === "pendente"
      ? `Você recebeu "${emp.titulo}" de ${emp.nome || emp.email}? Ao confirmar, o exemplar volta ao acervo.`
      : `Registrar a devolução de "${emp.titulo}" por ${emp.nome || emp.email}? Ao confirmar, o exemplar volta ao acervo.`;
    const ok = await confirmar(pergunta, "Confirmar recebimento");
    if (!ok) return;
    const res = DB.devolver(id, Auth.getUser());
    if (!res.ok) { toast(res.erro, "erro"); return; }
    toast("Devolução confirmada. O leitor foi avisado.");
    renderAdminEmprestimos(); renderCatalogo(); renderMaisAcessados();
  });

  // --- usuários
  $("#us-busca").addEventListener("input", renderUsuarios);
  $("#us-filtro").addEventListener("change", renderUsuarios);
  $("#btn-novo-usuario").addEventListener("click", () => {
    $("#form-usuario").reset();
    abrirModal("modal-usuario");
    setTimeout(() => $("#usuario-campo-nome").focus(), 100);
  });
  $("#form-usuario").addEventListener("submit", (e) => {
    e.preventDefault();
    const res = DB.criarUsuario({
      nome: $("#usuario-campo-nome").value,
      email: $("#usuario-campo-email").value,
      senha: $("#usuario-campo-senha").value,
      tipo: $("#usuario-campo-tipo").value,
    });
    if (!res.ok) { toast(res.erro, "erro"); return; }
    fecharModal("modal-usuario");
    toast("Usuário criado. Informe a senha provisória a ele.");
    renderUsuarios();
  });
  $("#us-corpo").addEventListener("click", async (ev) => {
    const eu = Auth.getUser();
    const papel = ev.target.closest("[data-us-papel]");
    const excluir = ev.target.closest("[data-us-excluir]");
    if (papel) {
      const email = papel.dataset.usPapel;
      const tipo = papel.dataset.usTipo;
      const ok = await confirmar(`Tornar ${email} ${tipo === "admin" ? "administrador(a)" : "leitor(a)"}?`, "Alterar");
      if (!ok) return;
      const res = DB.alterarPapel(email, tipo, eu.email);
      if (!res.ok) { toast(res.erro, "erro"); return; }
      toast("Tipo de conta atualizado.");
      renderUsuarios();
    } else if (excluir) {
      const email = excluir.dataset.usExcluir;
      const ok = await confirmar(`Excluir a conta de ${email}? O histórico de empréstimos dessa pessoa é mantido.`, "Excluir");
      if (!ok) return;
      const res = DB.removerUsuario(email, eu.email);
      if (!res.ok) { toast(res.erro, "erro"); return; }
      toast("Conta excluída.");
      renderUsuarios();
    }
  });

  // --- backup e dados
  $("#btn-exportar").addEventListener("click", baixarBackup);
  $("#btn-importar").addEventListener("click", () => $("#arquivo-importar").click());
  $("#arquivo-importar").addEventListener("change", async (ev) => {
    const arquivo = ev.target.files[0];
    ev.target.value = "";
    if (arquivo) await importarArquivoBackup(arquivo);
  });
  $("#btn-apagar-backup-antigo").addEventListener("click", async () => {
    const ok = await confirmar("Apagar a cópia de segurança da atualização anterior? Isso não afeta os dados atuais.", "Apagar");
    if (!ok) return;
    DB.apagarBackupMigracao();
    toast("Backup antigo apagado.");
    renderSistema();
  });
}
