/* Ponte de consulta pública. Carregar depois de db/data e antes de app.js.
   Nenhuma credencial, pessoa ou empréstimo é solicitado à API. */
(() => {
  'use strict';
  let catalogo = null;
  let carregamento = null;
  const aviso = 'Esta etapa integra somente consultas do catálogo. Empréstimos, perfil, usuários e administração não estão integrados ao MySQL e estão desativados aqui.';
  DB.somenteLeitura = true;
  DB.avisoSomenteLeitura = aviso;

  const copiar = (lista) => lista.map((item) => ({ ...item }));
  const ler = (colecao) => {
    if (!catalogo) throw new Error('O catálogo da API ainda não foi carregado.');
    return copiar(catalogo[colecao]);
  };
  const id = (valor) => {
    const n = Number(valor);
    if (!Number.isSafeInteger(n) || n <= 0) throw new Error('ID inválido na API.');
    return n;
  };
  const unicos = (lista) => {
    if (new Set(lista.map((x) => x.id)).size !== lista.length) throw new Error('IDs duplicados na API.');
    return lista;
  };
  async function buscar(url, signal) {
    const resposta = await fetch(url, { signal, cache: 'no-store', headers: { Accept: 'application/json' } });
    if (!resposta.ok) throw new Error('Consulta pública indisponível.');
    const dados = await resposta.json();
    if (!Array.isArray(dados)) throw new Error('Resposta inválida da API.');
    return dados;
  }

  DB.carregarCatalogo = () => {
    if (catalogo) return Promise.resolve();
    if (carregamento) return carregamento;
    carregamento = (async () => {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 10000);
      try {
        const [livrosAPI, autoresAPI, categoriasAPI] = await Promise.all([
          buscar('/api/livros', controller.signal),
          buscar('/api/autores', controller.signal),
          buscar('/api/categorias', controller.signal),
        ]);
        // Slugs são apenas chaves de apresentação; dbId preserva o ID real.
        // Correspondência por nome mantém paletas e fotos originais sem depender
        // da ordem dos AUTO_INCREMENT ou de dados antigos do localStorage.
        const categorias = unicos(categoriasAPI.map((c) => {
          const dbId = id(c.id);
          const original = SEED_CATEGORIES.find((s) => DB._norm(s.nome) === DB._norm(c.nome));
          return { id: original ? original.id : `categoria-${dbId}`, dbId, nome: String(c.nome), desc: c.descricao || '' };
        }));
        const autores = unicos(autoresAPI.map((a) => {
          const dbId = id(a.id);
          const original = SEED_AUTHORS.find((s) => DB._norm(s.nome) === DB._norm(a.nome));
          return { id: original ? original.id : `autor-${dbId}`, dbId, nome: String(a.nome), anos: a.anos || '', bio: a.bio || '', citacao: a.citacao || '', wiki: a.wiki || '', destaque: a.destaque === true || a.destaque === 1 };
        }));
        const catPorId = new Map(categorias.map((c) => [c.dbId, c.id]));
        const autorPorId = new Map(autores.map((a) => [a.dbId, a]));
        const livros = unicos(livrosAPI.map((l) => {
          const autor = autorPorId.get(id(l.autorId));
          const categoria = catPorId.get(id(l.categoria));
          if (!autor || !categoria) throw new Error('Referência inexistente no catálogo.');
          const qtdTotal = Number(l.qtdTotal), qtdDisp = Number(l.qtdDisp);
          if (!Number.isInteger(qtdTotal) || qtdTotal < 1 || !Number.isInteger(qtdDisp) || qtdDisp < 0 || qtdDisp > qtdTotal) throw new Error('Disponibilidade inválida na API.');
          return { id: id(l.id), titulo: String(l.titulo), autorId: autor.id, autor: autor.nome, categoria, categoriaId: id(l.categoria), autorDbId: autor.dbId, editora: l.editora || '', ano: l.ano, descricao: l.descricao || '', qtdTotal, qtdDisp, acessos: Number(l.acessos) || 0, criadoEm: Date.parse(l.criadoEm) || 0 };
        }));
        catalogo = { livros, autores, categorias }; // Publicação atômica após validar as três respostas.
      } finally {
        clearTimeout(timeout);
        controller.abort();
      }
    })().finally(() => { carregamento = null; });
    return carregamento;
  };
  DB.getLivros = () => ler('livros');
  DB.getLivrosTodos = () => ler('livros'); // Só o catálogo público, sem arquivados.
  DB.getCategorias = () => ler('categorias');
  DB.getAutores = () => ler('autores');
  DB.getAutoresDestaque = () => ler('autores').filter((a) => a.destaque);
  DB.registrarAcesso = () => {}; // Contagem do MySQL é somente leitura nesta etapa.
  DB.getEmprestimos = () => []; // Não confundir histórico local com dados do MySQL.
  DB.getNotificacoes = () => [];
  for (const metodo of ['criarLivro', 'atualizarLivro', 'removerLivro', 'emprestar', 'devolver', 'criarUsuario', 'alterarPapel', 'removerUsuario', 'importar']) {
    DB[metodo] = () => ({ ok: false, erro: aviso, motivo: aviso, erros: [aviso] });
  }
  DB.setUsuarios = DB.setNotificacoes = () => false;
  DB.addNotificacao = () => {};
  DB.exportar = () => { throw new Error('Exportação do MySQL não faz parte desta etapa.'); };
  // Defesa contra métodos antigos que tentem gravar coleções localmente.
  DB._gravar = () => false;
})();
