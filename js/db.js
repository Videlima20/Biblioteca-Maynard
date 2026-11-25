/* =========================================================================
   db.js — Camada única de dados da Biblioteca Maynard (esquema v2)

   Todo acesso ao localStorage passa por aqui (Auth, Admin e app.js não
   tocam mais no storage). Se um dia entrar uma API/banco de verdade, só
   este arquivo muda.

   Modelo (o que é GRAVADO):
     livros       { id, titulo, autorId, editora, ano, categoria, qtdTotal,
                    descricao, acessos, criadoEm, arquivado? }
     autores      { id, nome, anos, bio, citacao, destaque }
     emprestimos  { id, livroId, email, nome, telefone, data, devolucao,
                    status ("solicitacao"|"ativo"|"pendente"|"recusado"|"devolvido"), solicitadoEm?, devolucaoInformadaEm?, devolvidoEm? }
     notificacoes { id, email, mensagem, detalhes, lida, criadoEm }

   O que é DERIVADO na leitura (nunca gravado, para não divergir):
     livro.autor      <- autores[autorId].nome
     livro.qtdDisp    <- qtdTotal - empréstimos ativos do livro
     emprestimo.titulo/autor/categoria <- livro do empréstimo

   Convenção de tempo:
     datas de calendário (data, devolucao)   "YYYY-MM-DD" no fuso LOCAL
     instantes (criadoEm, devolvidoEm)       epoch em milissegundos
   ========================================================================= */

const SCHEMA_VERSION = 2;

const LIMITES = {
  prazoPadraoDias: 14,
  prazoMaxDias: 30,
  maxEmprestimosAtivos: 5,
  maxNotificacoesPorUsuario: 50,
};

const COLECOES = ["categorias", "autores", "livros", "usuarios", "emprestimos", "notificacoes"];

const CHAVE = {
  schema: "biblioteca_schema",
  livros: "biblioteca_livros",
  autores: "biblioteca_autores",
  categorias: "biblioteca_categorias",
  usuarios: "biblioteca_usuarios",
  emprestimos: "biblioteca_emprestimos",
  notificacoes: "biblioteca_notificacoes",
};

/* -------------------------------------------------------------------------
   Datas no fuso local. Nunca usar toISOString() para "data de hoje": ele
   devolve UTC e, à noite no Brasil, já cai no dia seguinte.
   ------------------------------------------------------------------------- */
function dataLocalISO(d = new Date()) {
  const dois = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${dois(d.getMonth() + 1)}-${dois(d.getDate())}`;
}

function somarDiasISO(iso, dias) {
  const [a, m, d] = iso.split("-").map(Number);
  return dataLocalISO(new Date(a, m - 1, d + dias));
}

/* Dias entre duas datas "YYYY-MM-DD" (b - a), sem efeito de horário de verão. */
function diasEntreISO(a, b) {
  const t = (iso) => { const [y, m, d] = iso.split("-").map(Number); return Date.UTC(y, m - 1, d); };
  return Math.round((t(b) - t(a)) / 86400000);
}

const DB = {
  _cache: {},

  /* ---- leitura/escrita de baixo nível ---------------------------------- */
  _ler(chave) {
    let bruto;
    try { bruto = localStorage.getItem(chave); } catch (e) { return []; }
    if (bruto === null) return [];
    const c = this._cache[chave];
    if (c && c.bruto === bruto) return c.valor.slice();
    try {
      const valor = JSON.parse(bruto);
      if (!Array.isArray(valor)) throw new Error("esperava uma lista");
      this._cache[chave] = { bruto, valor };
      return valor.slice();
    } catch (e) {
      console.warn(`[DB] "${chave}" está corrompido e foi ignorado:`, e.message);
      return [];
    }
  },

  _gravar(chave, lista) {
    try {
      localStorage.setItem(chave, JSON.stringify(lista));
      delete this._cache[chave];
      return true;
    } catch (e) {
      console.error(`[DB] não foi possível gravar "${chave}":`, e.message);
      return false;
    }
  },

  _norm(texto) {
    return String(texto ?? "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/\s+/g, " ").trim();
  },

  _slug(texto) {
    return this._norm(texto).replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
  },

  _proximoId(lista) {
    return lista.reduce((m, x) => Math.max(m, Number(x.id) || 0), 0) + 1;
  },

  /* ---- referências (somente leitura) ----------------------------------- */
  getCategorias() { return this._ler(CHAVE.categorias); },
  getAutores() { return this._ler(CHAVE.autores); },
  getAutoresDestaque() { return this.getAutores().filter((a) => a.destaque !== false); },
  getUsuarios() { return this._ler(CHAVE.usuarios); },
  setUsuarios(lista) { return this._gravar(CHAVE.usuarios, lista); },

  /* Procura um autor pelo nome (sem acento/caixa); cria se não existir. */
  _obterOuCriarAutor(autores, nome) {
    const alvo = this._norm(nome);
    const existente = autores.find((a) => this._norm(a.nome) === alvo);
    if (existente) return existente;
    const base = this._slug(nome) || "autor";
    let id = base;
    for (let n = 2; autores.some((a) => a.id === id); n++) id = `${base}-${n}`;
    const novo = { id, nome: String(nome).trim().replace(/\s+/g, " "), anos: "", bio: "", citacao: "", destaque: false };
    autores.push(novo);
    return novo;
  },

  /* ---- livros ---------------------------------------------------------- */
  _livrosEnriquecidos(brutos) {
    const nomes = new Map(this.getAutores().map((a) => [a.id, a.nome]));
    const ativos = new Map();
    this._ler(CHAVE.emprestimos).forEach((e) => {
      if (this.emAberto(e)) ativos.set(e.livroId, (ativos.get(e.livroId) || 0) + 1);
    });
    return brutos.map((l) => ({
      ...l,
      autor: nomes.get(l.autorId) || "Autor desconhecido",
      qtdDisp: Math.max(0, (Number(l.qtdTotal) || 0) - (ativos.get(l.id) || 0)),
    }));
  },

  /* Catálogo visível (sem arquivados). */
  getLivros() { return this._livrosEnriquecidos(this._ler(CHAVE.livros).filter((l) => !l.arquivado)); },
  /* Inclui arquivados (livros removidos que ainda têm histórico). */
  getLivrosTodos() { return this._livrosEnriquecidos(this._ler(CHAVE.livros)); },

  /* Devolve um texto de erro ou null. `qtdMinima` = exemplares já emprestados. */
  validarLivro(d, qtdMinima = 1) {
    const texto = (v) => String(v ?? "").trim();
    if (texto(d.titulo).length < 2) return "Informe o título (mínimo 2 caracteres).";
    if (texto(d.autor).length < 2) return "Informe o autor (mínimo 2 caracteres).";
    if (texto(d.editora).length < 1) return "Informe a editora.";
    if (texto(d.descricao).length < 10) return "A descrição precisa ter pelo menos 10 caracteres.";
    const ano = Number(d.ano);
    const anoMax = new Date().getFullYear() + 1;
    if (!Number.isInteger(ano) || ano < 1500 || ano > anoMax) return `Informe um ano entre 1500 e ${anoMax}.`;
    const qtd = Number(d.qtdTotal);
    if (!Number.isInteger(qtd) || qtd < 1 || qtd > 9999) return "A quantidade total deve ser um número inteiro entre 1 e 9999.";
    if (qtd < qtdMinima) return `Há ${qtdMinima} exemplar(es) emprestado(s); a quantidade total não pode ser menor que isso.`;
    if (!this.getCategorias().some((c) => c.id === d.categoria)) return "Escolha uma categoria válida.";
    return null;
  },

  criarLivro(d) {
    const erro = this.validarLivro(d);
    if (erro) return { ok: false, erro };
    const livros = this._ler(CHAVE.livros);
    const autores = this.getAutores();
    const autor = this._obterOuCriarAutor(autores, d.autor);
    const livro = {
      id: this._proximoId(livros),
      titulo: String(d.titulo).trim(),
      autorId: autor.id,
      editora: String(d.editora).trim(),
      ano: Number(d.ano),
      categoria: d.categoria,
      qtdTotal: Number(d.qtdTotal),
      descricao: String(d.descricao).trim(),
      acessos: 0,
      criadoEm: Date.now(),
    };
    livros.push(livro);
    if (!this._gravar(CHAVE.autores, autores) || !this._gravar(CHAVE.livros, livros)) {
      return { ok: false, erro: "Não foi possível salvar: o armazenamento do navegador está cheio." };
    }
    return { ok: true, livro: this.getLivrosTodos().find((l) => l.id === livro.id) };
  },

  atualizarLivro(id, d) {
    const livros = this._ler(CHAVE.livros);
    const idx = livros.findIndex((l) => l.id === id);
    if (idx === -1) return { ok: false, erro: "Livro não encontrado." };
    const emprestados = this._ler(CHAVE.emprestimos).filter((e) => e.livroId === id && this.emAberto(e)).length;
    const erro = this.validarLivro(d, emprestados);
    if (erro) return { ok: false, erro };
    const autores = this.getAutores();
    const autor = this._obterOuCriarAutor(autores, d.autor);
    livros[idx] = {
      ...livros[idx],
      titulo: String(d.titulo).trim(),
      autorId: autor.id,
      editora: String(d.editora).trim(),
      ano: Number(d.ano),
      categoria: d.categoria,
      qtdTotal: Number(d.qtdTotal),
      descricao: String(d.descricao).trim(),
    };
    if (!this._gravar(CHAVE.autores, autores) || !this._gravar(CHAVE.livros, livros)) {
      return { ok: false, erro: "Não foi possível salvar: o armazenamento do navegador está cheio." };
    }
    return { ok: true, livro: this.getLivrosTodos().find((l) => l.id === id) };
  },

  /* Remove o livro; se já houve empréstimos, apenas arquiva (preserva o histórico). */
  removerLivro(id) {
    const emprestimos = this._ler(CHAVE.emprestimos).filter((e) => e.livroId === id);
    if (emprestimos.some((e) => this.emAberto(e))) {
      return { ok: false, motivo: "Este livro possui um empréstimo ativo e não pode ser removido agora." };
    }
    const livros = this._ler(CHAVE.livros);
    if (!livros.some((l) => l.id === id)) return { ok: false, motivo: "Livro não encontrado." };
    const arquivar = emprestimos.length > 0;
    const novos = arquivar ? livros.map((l) => (l.id === id ? { ...l, arquivado: true } : l)) : livros.filter((l) => l.id !== id);
    if (!this._gravar(CHAVE.livros, novos)) return { ok: false, motivo: "Não foi possível salvar a alteração." };
    return { ok: true, arquivado: arquivar };
  },

  registrarAcesso(id) {
    const livros = this._ler(CHAVE.livros);
    const idx = livros.findIndex((l) => l.id === id);
    if (idx === -1) return;
    livros[idx] = { ...livros[idx], acessos: (Number(livros[idx].acessos) || 0) + 1 };
    this._gravar(CHAVE.livros, livros);
  },

  /* ---- empréstimos ----------------------------------------------------- */
  getEmprestimos() {
    const livros = new Map(this.getLivrosTodos().map((l) => [l.id, l]));
    return this._ler(CHAVE.emprestimos).map((e) => {
      const l = livros.get(e.livroId);
      return { ...e, titulo: l ? l.titulo : "Livro removido", autor: l ? l.autor : "", categoria: l ? l.categoria : "texto" };
    });
  },

  /* Situações: "ativo" (com o leitor), "pendente" (o leitor informou a devolução, mas a
     biblioteca ainda não conferiu) e "devolvido" (confirmado pelo administrador).
     Só "devolvido" libera o exemplar; "pendente" ainda conta como emprestado. */
  emAberto(e) {
    return e.status === "solicitacao" || e.status === "ativo" || e.status === "pendente";
  },

  emAtraso(e) {
    return e.status === "ativo" && e.devolucao < dataLocalISO();
  },

  /* Registra a solicitação de empréstimo. Ela reserva o exemplar, mas só
     se torna empréstimo efetivo após a confirmação administrativa. */
  emprestar({ livroId, user, nome, telefone, data, devolucao }) {
    const livro = this.getLivros().find((l) => l.id === livroId);
    if (!livro) return { ok: false, erro: "Livro não encontrado no acervo." };
    if (livro.qtdDisp <= 0) return { ok: false, erro: "Este livro ficou indisponível." };

    const lista = this._ler(CHAVE.emprestimos);
    const doUsuario = lista.filter((e) => e.email === user.email && this.emAberto(e));
    if (doUsuario.some((e) => e.livroId === livroId)) return { ok: false, erro: "Você já possui este livro em empréstimo." };
    if (doUsuario.length >= LIMITES.maxEmprestimosAtivos) {
      return { ok: false, erro: `Limite de ${LIMITES.maxEmprestimosAtivos} empréstimos ativos atingido. Devolva um livro antes de pegar outro.` };
    }

    const nomeLimpo = String(nome || "").trim();
    if (nomeLimpo.length < 3) return { ok: false, erro: "Informe um nome válido." };
    if (data !== dataLocalISO()) return { ok: false, erro: "A data do empréstimo deve ser a de hoje." };
    if (!/^\d{4}-\d{2}-\d{2}$/.test(String(devolucao)) || devolucao <= data) {
      return { ok: false, erro: "A data de devolução deve ser posterior à data do empréstimo." };
    }
    if (devolucao > somarDiasISO(data, LIMITES.prazoMaxDias)) {
      return { ok: false, erro: `O prazo máximo de empréstimo é de ${LIMITES.prazoMaxDias} dias.` };
    }

    const emprestimo = {
      id: this._proximoId(lista),
      livroId,
      email: user.email,
      nome: nomeLimpo,
      telefone: String(telefone || "").trim(),
      data,
      devolucao,
      status: "solicitacao",
      solicitadoEm: Date.now(),
    };
    lista.push(emprestimo);
    if (!this._gravar(CHAVE.emprestimos, lista)) {
      return { ok: false, erro: "Não foi possível salvar: o armazenamento do navegador está cheio." };
    }
    this.addNotificacao(user.email, `Solicitação de empréstimo enviada: "${livro.titulo}". Aguarde a confirmação da biblioteca.`, {
      tipo: "emprestimo_solicitado", emprestimoId: emprestimo.id, livroId, titulo: livro.titulo, autor: livro.autor, data, devolucao,
    });
    this.getUsuarios().filter((u) => u.tipo === "admin" && u.email !== user.email).forEach((adm) => {
      this.addNotificacao(adm.email, `${nomeLimpo} solicitou o empréstimo de "${livro.titulo}".`, { tipo: "emprestimo_solicitado", emprestimoId: emprestimo.id, livroId, titulo: livro.titulo });
    });
    return { ok: true, emprestimo: { ...emprestimo, titulo: livro.titulo, autor: livro.autor, categoria: livro.categoria } };
  },

  /* Confirma ou recusa solicitação de empréstimo, exclusivamente admin. */
  confirmarEmprestimo(id, quem) {
    if (!quem || quem.tipo !== "admin") return { ok: false, erro: "Somente a biblioteca pode confirmar empréstimos." };
    const lista = this._ler(CHAVE.emprestimos), idx = lista.findIndex((e) => e.id === id);
    if (idx < 0 || lista[idx].status !== "solicitacao") return { ok: false, erro: "Solicitação não encontrada ou já processada." };
    const atual = lista[idx], hoje = dataLocalISO();
    lista[idx] = { ...atual, status: "ativo", data: hoje, confirmadoEm: Date.now(), devolucao: atual.devolucao > hoje ? atual.devolucao : somarDiasISO(hoje, LIMITES.prazoPadraoDias) };
    if (!this._gravar(CHAVE.emprestimos, lista)) return { ok: false, erro: "Não foi possível confirmar o empréstimo." };
    const livro = this.getLivrosTodos().find((l) => l.id === atual.livroId), titulo = livro ? livro.titulo : "livro";
    this.addNotificacao(atual.email, `Empréstimo confirmado pela biblioteca: "${titulo}".`, { tipo: "emprestimo", emprestimoId: id, livroId: atual.livroId, titulo, data: lista[idx].data, devolucao: lista[idx].devolucao });
    return { ok: true };
  },

  recusarEmprestimo(id, quem) {
    if (!quem || quem.tipo !== "admin") return { ok: false, erro: "Somente a biblioteca pode recusar empréstimos." };
    const lista = this._ler(CHAVE.emprestimos), idx = lista.findIndex((e) => e.id === id);
    if (idx < 0 || lista[idx].status !== "solicitacao") return { ok: false, erro: "Solicitação não encontrada ou já processada." };
    const atual = lista[idx]; lista[idx] = { ...atual, status: "recusado", recusadoEm: Date.now() };
    if (!this._gravar(CHAVE.emprestimos, lista)) return { ok: false, erro: "Não foi possível recusar a solicitação." };
    const livro = this.getLivrosTodos().find((l) => l.id === atual.livroId), titulo = livro ? livro.titulo : "livro";
    this.addNotificacao(atual.email, `A biblioteca recusou a solicitação de empréstimo de "${titulo}".`, { tipo: "emprestimo_recusado", emprestimoId: id, livroId: atual.livroId, titulo });
    return { ok: true };
  },

  /* Devolução em 3 etapas, para o administrador ter controle:
     1) solicitarDevolucao — o LEITOR informa que devolveu. Fica "pendente"; o livro NÃO volta ao estoque.
     2) devolver           — só o ADMIN confirma que recebeu o livro. Aí vira "devolvido".
     3) recusarDevolucao   — o ADMIN diz que não recebeu: volta para "ativo" e o leitor é avisado.
     `quem` = { email, tipo } da sessão. */
  solicitarDevolucao(id, quem) {
    const lista = this._ler(CHAVE.emprestimos);
    const idx = lista.findIndex((e) => e.id === id);
    if (idx === -1 || !quem || quem.email !== lista[idx].email) return { ok: false, erro: "Empréstimo não encontrado." };
    const atual = lista[idx];
    if (atual.status === "pendente") return { ok: false, erro: "A devolução já foi informada e aguarda a confirmação da biblioteca." };
    if (atual.status !== "ativo") return { ok: false, erro: "Este empréstimo já foi devolvido." };
    const devolucaoInformadaEm = Date.now();
    lista[idx] = { ...atual, status: "pendente", devolucaoInformadaEm };
    if (!this._gravar(CHAVE.emprestimos, lista)) return { ok: false, erro: "Não foi possível salvar a solicitação." };
    const livro = this.getLivrosTodos().find((l) => l.id === atual.livroId);
    const titulo = livro ? livro.titulo : "livro";
    const detalhes = { tipo: "devolucao_informada", emprestimoId: id, livroId: atual.livroId, titulo, devolucaoInformadaEm };
    this.addNotificacao(atual.email, `Devolução informada: "${titulo}". Aguardando a confirmação da biblioteca.`, detalhes);
    this.getUsuarios().filter((u) => u.tipo === "admin" && u.email !== atual.email).forEach((adm) => {
      this.addNotificacao(adm.email, `${atual.nome || atual.email} informou a devolução de "${titulo}". Confirme o recebimento em Controle de empréstimos.`, detalhes);
    });
    return { ok: true };
  },

  /* Confirmação do recebimento: exclusiva do administrador. */
  devolver(id, quem) {
    if (!quem || quem.tipo !== "admin") return { ok: false, erro: "Somente a biblioteca pode confirmar uma devolução." };
    const lista = this._ler(CHAVE.emprestimos);
    const idx = lista.findIndex((e) => e.id === id);
    if (idx === -1) return { ok: false, erro: "Empréstimo não encontrado." };
    if (lista[idx].status === "devolvido") return { ok: false, erro: "Este empréstimo já foi devolvido." };
    const dono = lista[idx].email;
    const devolvidoEm = Date.now();
    lista[idx] = { ...lista[idx], status: "devolvido", devolvidoEm };
    if (!this._gravar(CHAVE.emprestimos, lista)) return { ok: false, erro: "Não foi possível salvar a devolução." };
    const livro = this.getLivrosTodos().find((l) => l.id === lista[idx].livroId);
    this.addNotificacao(dono, `Devolução confirmada pela biblioteca: "${livro ? livro.titulo : "livro"}".`, {
      tipo: "devolucao", emprestimoId: id, livroId: lista[idx].livroId, titulo: livro ? livro.titulo : "", devolvidoEm,
    });
    return { ok: true };
  },

  /* Reverte uma devolução confirmada por engano: reabre o empréstimo existente. */
  reabrirEmprestimo(id, quem) {
    if (!quem || quem.tipo !== "admin") return { ok: false, erro: "Somente a biblioteca pode reabrir um empréstimo." };
    const lista = this._ler(CHAVE.emprestimos);
    const idx = lista.findIndex((e) => e.id === id);
    if (idx === -1) return { ok: false, erro: "Empréstimo não encontrado." };
    if (lista[idx].status !== "devolvido") return { ok: false, erro: "Este empréstimo não está marcado como devolvido." };
    const { devolvidoEm, ...resto } = lista[idx];
    lista[idx] = { ...resto, status: "ativo" };
    if (!this._gravar(CHAVE.emprestimos, lista)) return { ok: false, erro: "Não foi possível reabrir o empréstimo." };
    const livro = this.getLivrosTodos().find((l) => l.id === lista[idx].livroId);
    const titulo = livro ? livro.titulo : "livro";
    this.addNotificacao(lista[idx].email, `A biblioteca desfez o registro de devolução de "${titulo}". O empréstimo voltou a ficar em aberto.`, {
      tipo: "devolucao_revertida", emprestimoId: id, livroId: lista[idx].livroId, titulo,
    });
    return { ok: true };
  },

  /* O administrador não recebeu o livro: o empréstimo volta a ficar ativo. */
  recusarDevolucao(id, quem) {
    if (!quem || quem.tipo !== "admin") return { ok: false, erro: "Somente a biblioteca pode recusar uma devolução." };
    const lista = this._ler(CHAVE.emprestimos);
    const idx = lista.findIndex((e) => e.id === id);
    if (idx === -1) return { ok: false, erro: "Empréstimo não encontrado." };
    if (lista[idx].status !== "pendente") return { ok: false, erro: "Não há devolução informada para este empréstimo." };
    const { devolucaoInformadaEm, ...resto } = lista[idx];
    lista[idx] = { ...resto, status: "ativo" };
    if (!this._gravar(CHAVE.emprestimos, lista)) return { ok: false, erro: "Não foi possível salvar a recusa." };
    const livro = this.getLivrosTodos().find((l) => l.id === lista[idx].livroId);
    const titulo = livro ? livro.titulo : "livro";
    this.addNotificacao(lista[idx].email, `A biblioteca não localizou a devolução de "${titulo}". O empréstimo continua ativo; procure a biblioteca.`, {
      tipo: "devolucao_recusada", emprestimoId: id, livroId: lista[idx].livroId, titulo,
    });
    return { ok: true };
  },

  /* ---- notificações ---------------------------------------------------- */
  getNotificacoes() { return this._ler(CHAVE.notificacoes); },
  setNotificacoes(lista) { return this._gravar(CHAVE.notificacoes, lista); },

  addNotificacao(paraEmail, mensagem, detalhes = null) {
    const atual = this.getNotificacoes();
    const nova = { id: this._proximoId(atual), email: paraEmail, mensagem, detalhes, lida: false, criadoEm: Date.now() };
    const porEmail = new Map();
    const lista = [nova, ...atual].filter((n) => {
      const qtd = (porEmail.get(n.email) || 0) + 1;
      porEmail.set(n.email, qtd);
      return qtd <= LIMITES.maxNotificacoesPorUsuario;
    });
    this.setNotificacoes(lista);
  },

  /* ---- usuários ---------------------------------------------------------
     ATENÇÃO: as senhas ainda ficam em texto puro no navegador (sem servidor não
     há como protegê-las de verdade). Hash + sessão no servidor = próxima etapa. */
  validarUsuario({ nome, email, senha }) {
    if (String(nome ?? "").trim().length < 3) return "Informe o nome completo (mínimo 3 caracteres).";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(email ?? "").trim())) return "Informe um e-mail válido.";
    const s = String(senha ?? "");
    if (s.length < 8 || !/[A-Za-z]/.test(s) || !/\d/.test(s)) return "A senha precisa ter pelo menos 8 caracteres, com letras e números.";
    return null;
  },

  criarUsuario({ nome, email, senha, tipo = "usuario", telefone = "" }) {
    const erro = this.validarUsuario({ nome, email, senha });
    if (erro) return { ok: false, erro };
    if (!["usuario", "admin"].includes(tipo)) return { ok: false, erro: "Tipo de conta inválido." };
    const usuarios = this.getUsuarios();
    const mail = String(email).trim().toLowerCase();
    if (usuarios.some((u) => String(u.email).toLowerCase() === mail)) return { ok: false, erro: "Já existe uma conta com este e-mail." };
    usuarios.push({ email: mail, senha: String(senha), tipo, nome: String(nome).trim().replace(/\s+/g, " "), telefone: String(telefone).trim() });
    if (!this.setUsuarios(usuarios)) return { ok: false, erro: "Não foi possível salvar: o armazenamento do navegador está cheio." };
    return { ok: true, email: mail };
  },

  /* Lista para telas administrativas: nunca expõe a senha. */
  listarUsuarios() {
    const emprestimos = this._ler(CHAVE.emprestimos);
    return this.getUsuarios().map(({ senha, ...u }) => {
      const meus = emprestimos.filter((e) => e.email === u.email);
      const ativos = meus.filter((e) => this.emAberto(e));
      return { ...u, ativos: ativos.length, total: meus.length, atrasados: ativos.filter((e) => this.emAtraso(e)).length };
    });
  },

  _outrosAdmins(usuarios, email) {
    return usuarios.filter((u) => u.tipo === "admin" && u.email !== email).length;
  },

  alterarPapel(email, tipo, solicitanteEmail) {
    if (!["usuario", "admin"].includes(tipo)) return { ok: false, erro: "Tipo de conta inválido." };
    if (email === solicitanteEmail) return { ok: false, erro: "Você não pode alterar o seu próprio tipo de conta." };
    const usuarios = this.getUsuarios();
    const idx = usuarios.findIndex((u) => u.email === email);
    if (idx === -1) return { ok: false, erro: "Usuário não encontrado." };
    if (usuarios[idx].tipo === "admin" && tipo !== "admin" && this._outrosAdmins(usuarios, email) === 0) {
      return { ok: false, erro: "Precisa existir pelo menos um administrador." };
    }
    usuarios[idx] = { ...usuarios[idx], tipo };
    return this.setUsuarios(usuarios) ? { ok: true } : { ok: false, erro: "Não foi possível salvar a alteração." };
  },

  /* Só remove quem não tem empréstimo ativo. O histórico de empréstimos fica (guarda nome e e-mail). */
  removerUsuario(email, solicitanteEmail) {
    if (email === solicitanteEmail) return { ok: false, erro: "Você não pode excluir a própria conta." };
    const usuarios = this.getUsuarios();
    const alvo = usuarios.find((u) => u.email === email);
    if (!alvo) return { ok: false, erro: "Usuário não encontrado." };
    if (this._ler(CHAVE.emprestimos).some((e) => e.email === email && this.emAberto(e))) {
      return { ok: false, erro: "Este usuário tem empréstimo ativo. Registre a devolução antes de excluir a conta." };
    }
    if (alvo.tipo === "admin" && this._outrosAdmins(usuarios, email) === 0) return { ok: false, erro: "Precisa existir pelo menos um administrador." };
    if (!this.setUsuarios(usuarios.filter((u) => u.email !== email))) return { ok: false, erro: "Não foi possível salvar a alteração." };
    this.setNotificacoes(this.getNotificacoes().filter((n) => n.email !== email));
    return { ok: true };
  },

  /* ---- backup (exportar / importar) -------------------------------------- */
  exportar() {
    return {
      app: "biblioteca-maynard",
      schema: SCHEMA_VERSION,
      exportadoEm: new Date().toISOString(),
      dados: Object.fromEntries(COLECOES.map((c) => [c, this._ler(CHAVE[c])])),
    };
  },

  /* Valida o arquivo inteiro ANTES de tocar nos dados e devolve uma cópia saneada
     (só os campos conhecidos, com tipos conferidos e referências íntegras). */
  validarBackup(arquivo) {
    const erros = [];
    const falha = (m) => { if (erros.length < 8) erros.push(m); };
    if (!arquivo || typeof arquivo !== "object" || arquivo.app !== "biblioteca-maynard") {
      return { ok: false, erros: ["Este arquivo não é um backup da Biblioteca Maynard."] };
    }
    if (arquivo.schema !== SCHEMA_VERSION) {
      return { ok: false, erros: [`Backup do esquema ${arquivo.schema}; esta versão só importa o esquema ${SCHEMA_VERSION}.`] };
    }
    const d = arquivo.dados || {};
    const faltando = COLECOES.filter((c) => !Array.isArray(d[c]));
    if (faltando.length) return { ok: false, erros: [`Backup incompleto: faltam ${faltando.join(", ")}.`] };

    const txt = (v) => (typeof v === "string" ? v : "");
    const inteiro = (v) => Number.isInteger(v);
    const unicos = (lista, campo, nome) => {
      const vistos = new Set();
      lista.forEach((x) => { if (vistos.has(x[campo])) falha(`${nome}: "${x[campo]}" aparece repetido.`); vistos.add(x[campo]); });
    };

    const categorias = d.categorias.map((c) => ({ id: txt(c?.id), nome: txt(c?.nome), desc: txt(c?.desc) }));
    categorias.forEach((c) => { if (!c.id || !c.nome) falha("Categoria sem id ou nome."); });
    unicos(categorias, "id", "Categoria");

    const autores = d.autores.map((a) => ({
      id: txt(a?.id), nome: txt(a?.nome), anos: txt(a?.anos), bio: txt(a?.bio), citacao: txt(a?.citacao),
      destaque: a?.destaque !== false, ...(txt(a?.wiki) ? { wiki: txt(a.wiki) } : {}),
    }));
    autores.forEach((a) => { if (!a.id || !a.nome) falha("Autor sem id ou nome."); });
    unicos(autores, "id", "Autor");

    const idsAutor = new Set(autores.map((a) => a.id));
    const idsCat = new Set(categorias.map((c) => c.id));
    const livros = d.livros.map((l) => ({
      id: l?.id, titulo: txt(l?.titulo), autorId: txt(l?.autorId), editora: txt(l?.editora),
      ano: l?.ano === null ? null : l?.ano, categoria: txt(l?.categoria), qtdTotal: l?.qtdTotal,
      descricao: txt(l?.descricao), acessos: Number(l?.acessos) || 0, criadoEm: Number(l?.criadoEm) || 0,
      ...(l?.arquivado ? { arquivado: true } : {}),
    }));
    livros.forEach((l) => {
      if (!inteiro(l.id) || l.id < 1) falha("Livro com id inválido.");
      if (!l.titulo) falha(`Livro ${l.id}: sem título.`);
      if (!idsAutor.has(l.autorId)) falha(`Livro "${l.titulo}": autor inexistente.`);
      if (!idsCat.has(l.categoria)) falha(`Livro "${l.titulo}": categoria inexistente.`);
      if (!inteiro(l.qtdTotal) || l.qtdTotal < 1 || l.qtdTotal > 9999) falha(`Livro "${l.titulo}": quantidade inválida.`);
      if (l.ano !== null && !inteiro(l.ano)) falha(`Livro "${l.titulo}": ano inválido.`);
    });
    unicos(livros, "id", "Livro");

    const usuarios = d.usuarios.map((u) => ({ email: txt(u?.email).toLowerCase(), senha: txt(u?.senha), tipo: u?.tipo, nome: txt(u?.nome), telefone: txt(u?.telefone) }));
    usuarios.forEach((u) => {
      if (!u.email || !u.senha || !u.nome) falha("Usuário sem e-mail, senha ou nome.");
      if (!["usuario", "admin"].includes(u.tipo)) falha(`Usuário ${u.email}: tipo inválido.`);
    });
    unicos(usuarios, "email", "Usuário");
    if (!usuarios.some((u) => u.tipo === "admin")) falha("O backup precisa ter pelo menos um administrador.");

    const idsLivro = new Set(livros.map((l) => l.id));
    const dataISO = /^\d{4}-\d{2}-\d{2}$/;
    const emprestimos = d.emprestimos.map((e) => ({
      id: e?.id, livroId: e?.livroId, email: txt(e?.email).toLowerCase(), nome: txt(e?.nome), telefone: txt(e?.telefone),
      data: txt(e?.data), devolucao: txt(e?.devolucao), status: e?.status,
      ...(e?.devolvidoEm !== undefined ? { devolvidoEm: Number(e.devolvidoEm) || 0 } : {}),
      ...(e?.devolucaoInformadaEm !== undefined ? { devolucaoInformadaEm: Number(e.devolucaoInformadaEm) || 0 } : {}),
    }));
    emprestimos.forEach((e) => {
      if (!inteiro(e.id) || e.id < 1) falha("Empréstimo com id inválido.");
      if (!idsLivro.has(e.livroId)) falha(`Empréstimo ${e.id}: livro inexistente.`);
      if (!dataISO.test(e.data) || !dataISO.test(e.devolucao)) falha(`Empréstimo ${e.id}: datas inválidas.`);
      if (!["ativo", "pendente", "devolvido"].includes(e.status)) falha(`Empréstimo ${e.id}: situação inválida.`);
    });
    unicos(emprestimos, "id", "Empréstimo");
    const ativos = new Map(); const pares = new Set();
    emprestimos.filter((e) => e.status !== "devolvido").forEach((e) => {
      ativos.set(e.livroId, (ativos.get(e.livroId) || 0) + 1);
      const par = `${e.email}|${e.livroId}`;
      if (pares.has(par)) falha(`${e.email} tem o mesmo livro emprestado duas vezes.`);
      pares.add(par);
    });
    livros.forEach((l) => { if ((ativos.get(l.id) || 0) > l.qtdTotal) falha(`Livro "${l.titulo}": mais empréstimos ativos do que exemplares.`); });

    const notificacoes = d.notificacoes.map((n) => {
      const x = n?.detalhes && typeof n.detalhes === "object" ? n.detalhes : null;
      return {
        id: n?.id, email: txt(n?.email).toLowerCase(), mensagem: txt(n?.mensagem), lida: n?.lida === true, criadoEm: Number(n?.criadoEm) || 0,
        detalhes: x ? {
          tipo: txt(x.tipo), emprestimoId: x.emprestimoId, livroId: x.livroId, titulo: txt(x.titulo), autor: txt(x.autor),
          data: txt(x.data), devolucao: txt(x.devolucao), ...(x.devolvidoEm !== undefined ? { devolvidoEm: Number(x.devolvidoEm) || 0 } : {}),
        } : null,
      };
    });
    notificacoes.forEach((n) => { if (!inteiro(n.id)) falha("Notificação com id inválido."); });
    unicos(notificacoes, "id", "Notificação");

    return erros.length ? { ok: false, erros } : { ok: true, erros: [], dados: { categorias, autores, livros, usuarios, emprestimos, notificacoes } };
  },

  /* Substitui TODOS os dados pelo conteúdo do backup (tudo ou nada). */
  importar(arquivo) {
    const v = this.validarBackup(arquivo);
    if (!v.ok) return { ok: false, erros: v.erros };
    const antes = Object.fromEntries(COLECOES.map((c) => [c, localStorage.getItem(CHAVE[c])]));
    const gravou = COLECOES.every((c) => this._gravar(CHAVE[c], v.dados[c]));
    if (!gravou) {
      COLECOES.forEach((c) => { try { if (antes[c] === null) localStorage.removeItem(CHAVE[c]); else localStorage.setItem(CHAVE[c], antes[c]); } catch (e) { /* melhor esforço */ } });
      this._cache = {};
      return { ok: false, erros: ["Não foi possível importar: o armazenamento do navegador está cheio. Nada foi alterado."] };
    }
    try { localStorage.setItem(CHAVE.schema, String(SCHEMA_VERSION)); } catch (e) { /* já estava no v2 */ }
    this._cache = {};
    return { ok: true, resumo: { livros: v.dados.livros.length, usuarios: v.dados.usuarios.length, emprestimos: v.dados.emprestimos.length } };
  },

  /* Espaço usado pelos dados da biblioteca (aprox.: o limite do navegador é ~5 MB). */
  usoArmazenamento() {
    let chars = 0;
    try {
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (k && k.startsWith("biblioteca_")) chars += k.length + (localStorage.getItem(k) || "").length;
      }
    } catch (e) { /* localStorage indisponível */ }
    return { bytes: chars * 2, limiteBytes: 5 * 1024 * 1024 };
  },

  temBackupMigracao() { try { return localStorage.getItem("biblioteca_backup_v1") !== null; } catch (e) { return false; } },
  apagarBackupMigracao() { try { localStorage.removeItem("biblioteca_backup_v1"); return true; } catch (e) { return false; } },

  /* ---- migração v1 -> v2 ------------------------------------------------
     v1 gravava qtdDisp, o nome do autor e cópias de título/autor/categoria
     dentro de cada empréstimo, e tinha uma tabela de reservas que nunca foi
     usada. Faz backup do estado antigo antes de converter. */
  migrarDeV1() {
    const chavesV1 = [CHAVE.livros, CHAVE.autores, CHAVE.emprestimos, "biblioteca_reservas", "biblioteca_seeded_v1", "biblioteca_demo_dashboard_v2"];
    const antes = Object.fromEntries(chavesV1.map((k) => [k, localStorage.getItem(k)]));
    try { localStorage.setItem("biblioteca_backup_v1", JSON.stringify(antes)); } catch (e) { /* sem espaço: segue sem backup */ }

    const autores = this.getAutores().map((a) => ({ ...a, destaque: a.destaque === undefined ? true : a.destaque }));
    const novosLivros = [];
    this._ler(CHAVE.livros).forEach((l) => {
      const { autor, qtdDisp, ...resto } = l;
      const dono = autores.find((a) => a.id === l.autorId) || this._obterOuCriarAutor(autores, autor || "Autor desconhecido");
      const categoria = resto.titulo === "Urupês" && resto.categoria === "ensaios" ? "conto" : resto.categoria;
      novosLivros.push({ ...resto, categoria, autorId: dono.id });
    });

    // Empréstimos cujo livro foi excluído na v1: recria o livro como arquivado para não perder o histórico.
    const idsRecriados = new Map();
    const novosEmprestimos = this._ler(CHAVE.emprestimos).map((e) => {
      const { titulo, autor, categoria, ...resto } = e;
      let livroId = resto.livroId;
      if (!novosLivros.some((l) => l.id === livroId)) {
        if (!idsRecriados.has(livroId)) {
          const dono = this._obterOuCriarAutor(autores, autor || "Autor desconhecido");
          const novoId = this._proximoId(novosLivros);
          novosLivros.push({
            id: novoId, titulo: titulo || "Livro removido", autorId: dono.id, editora: "—", ano: null,
            categoria: categoria || "texto", qtdTotal: 1, descricao: "Livro removido do acervo (mantido apenas pelo histórico).",
            acessos: 0, criadoEm: Date.now(), arquivado: true,
          });
          idsRecriados.set(livroId, novoId);
        }
        livroId = idsRecriados.get(livroId);
      }
      return { ...resto, livroId };
    });

    // qtdTotal nunca pode ficar abaixo dos empréstimos ativos (o estoque agora é derivado).
    novosLivros.forEach((l) => {
      const ativos = novosEmprestimos.filter((e) => e.livroId === l.id && this.emAberto(e)).length;
      if (ativos > l.qtdTotal) l.qtdTotal = ativos;
    });

    try {
      const gravou = [
        this._gravar(CHAVE.autores, autores),
        this._gravar(CHAVE.livros, novosLivros),
        this._gravar(CHAVE.emprestimos, novosEmprestimos),
      ].every(Boolean);
      if (!gravou) throw new Error("armazenamento cheio");
      ["biblioteca_reservas", "biblioteca_seeded_v1", "biblioteca_demo_dashboard_v2"].forEach((k) => localStorage.removeItem(k));
      localStorage.setItem(CHAVE.schema, String(SCHEMA_VERSION));
    } catch (e) {
      Object.entries(antes).forEach(([k, v]) => { if (v === null) localStorage.removeItem(k); else localStorage.setItem(k, v); });
      console.error("[DB] migração v1→v2 falhou; estado anterior restaurado:", e);
    }
    this._cache = {};
  },
};
