/* =========================================================================
   data.js — Dados semente da Biblioteca Maynard
   Populam o localStorage na primeira execução. Nada aqui é backend:
   é o "banco de dados simulado" em formato de objetos JS, estruturado
   para que, no futuro, cada bloco possa ser trocado por uma chamada de API
   sem alterar o restante da aplicação (ver camada DB em js/db.js).
   Requer js/db.js carregado antes deste arquivo.
   ========================================================================= */

const SEED_CATEGORIES = [
  { id: "romance", nome: "Romance", desc: "Histórias de laços, perdas e reencontros." },
  { id: "conto", nome: "Conto", desc: "Narrativas curtas, de impacto imediato." },
  { id: "novela", nome: "Novela", desc: "Entre o conto e o romance, no ritmo certo." },
  { id: "teatro", nome: "Teatro", desc: "Textos escritos para o palco e a voz." },
  { id: "ensaios", nome: "Ensaios", desc: "Reflexão e argumento em prosa livre." },
  { id: "poema", nome: "Poema", desc: "A linguagem levada ao osso." },
  { id: "texto", nome: "Texto", desc: "Textos diversos para leitura e estudo." },
  { id: "diario", nome: "Diário", desc: "Registros do cotidiano e da memória." },
  { id: "biografia", nome: "Biografia", desc: "Vidas contadas, décadas revisitadas." },
];

/* Autores reais em destaque. A foto é buscada em tempo real na Wikipédia
   (ver js/authors-photo.js) — aqui guardamos apenas o "wiki" (título exato
   do verbete em pt.wikipedia.org) usado nessa busca, e uma citação curta. */
const SEED_AUTHORS = [
  {
    id: "machado-de-assis",
    nome: "Machado de Assis",
    wiki: "Machado de Assis",
    anos: "1839 — 1908",
    bio: "Fundador da Academia Brasileira de Letras, é considerado o maior nome da literatura brasileira, mestre da ironia e do narrador não confiável.",
    citacao: "Um dos grandes nomes da literatura brasileira.",
  },
  {
    id: "clarice-lispector",
    nome: "Clarice Lispector",
    wiki: "Clarice Lispector",
    anos: "1920 — 1977",
    bio: "Romancista e contista, revolucionou a prosa brasileira com uma escrita introspectiva e epifânica sobre a existência.",
    citacao: "A vida se manifesta através de pequenas epifanias.",
  },
  {
    id: "carlos-drummond-de-andrade",
    nome: "Carlos Drummond de Andrade",
    wiki: "Carlos Drummond de Andrade",
    anos: "1902 — 1987",
    bio: "Poeta de Itabira, um dos nomes centrais da poesia brasileira do século XX, entre o lirismo e a ironia social.",
    citacao: "No meio do caminho tinha uma pedra.",
  },
  {
    id: "cecilia-meireles",
    nome: "Cecília Meireles",
    wiki: "Cecília Meireles",
    anos: "1901 — 1964",
    bio: "Poeta e educadora, autora de 'Romanceiro da Inconfidência', com uma obra marcada pela musicalidade dos versos.",
    citacao: "Livre é quem não teme perder-se.",
  },
  {
    id: "jorge-amado",
    nome: "Jorge Amado",
    wiki: "Jorge Amado",
    anos: "1912 — 2001",
    bio: "Romancista baiano, retratou o povo e a cultura da Bahia com humor e sensualidade em obras traduzidas mundialmente.",
    citacao: "A literatura é a fala do povo.",
  },
  {
    id: "monteiro-lobato",
    nome: "Monteiro Lobato",
    wiki: "Monteiro Lobato",
    anos: "1882 — 1948",
    bio: "Criador do Sítio do Picapau Amarelo, fundador da literatura infantil brasileira moderna.",
    citacao: "Um país se faz com homens e livros.",
  },
];

/* Livros dos autores reais — usados nas seções "Obras de <autor>" do
   carrossel 3D. Capas geradas (ver js/covers.js). */
const SEED_AUTHOR_BOOKS = {
  "machado-de-assis": [
    { titulo: "Dom Casmurro", ano: 1899, categoria: "romance" },
    { titulo: "O Alienista", ano: 1882, categoria: "conto" },
    { titulo: "Memórias Póstumas de Brás Cubas", ano: 1881, categoria: "romance" },
  ],
  "clarice-lispector": [
    { titulo: "A Hora da Estrela", ano: 1977, categoria: "romance" },
    { titulo: "Laços de Família", ano: 1960, categoria: "conto" },
    { titulo: "Água Viva", ano: 1973, categoria: "texto" },
  ],
  "carlos-drummond-de-andrade": [
    { titulo: "Alguma Poesia", ano: 1930, categoria: "poema" },
    { titulo: "A Rosa do Povo", ano: 1945, categoria: "poema" },
    { titulo: "Sentimento do Mundo", ano: 1940, categoria: "poema" },
  ],
  "cecilia-meireles": [
    { titulo: "Romanceiro da Inconfidência", ano: 1953, categoria: "poema" },
    { titulo: "Viagem", ano: 1939, categoria: "poema" },
    { titulo: "Ou Isto ou Aquilo", ano: 1964, categoria: "poema" },
  ],
  "jorge-amado": [
    { titulo: "Gabriela, Cravo e Canela", ano: 1958, categoria: "romance" },
    { titulo: "Capitães da Areia", ano: 1937, categoria: "romance" },
    { titulo: "Dona Flor e Seus Dois Maridos", ano: 1966, categoria: "romance" },
  ],
  "monteiro-lobato": [
    { titulo: "Reinações de Narizinho", ano: 1931, categoria: "conto" },
    { titulo: "O Saci", ano: 1921, categoria: "conto" },
    { titulo: "Urupês", ano: 1918, categoria: "conto" },
  ],
};

/* Os 10 livros fictícios do catálogo principal (item 18 do briefing).
   A disponibilidade NÃO é gravada: é calculada a partir dos empréstimos. */
const SEED_BOOKS = [
  { titulo: "O Jardim das Estrelas", autor: "Marina Silva", editora: "Biblioteca Escolar", ano: 2024, categoria: "romance", qtdTotal: 6, descricao: "Uma jovem astrônoma descobre, num jardim esquecido, cartas que ligam sua família a um observatório abandonado — e a um segredo guardado por três gerações." },
  { titulo: "Depois da Chuva", autor: "Renato Cabral", editora: "Editora Alameda", ano: 2023, categoria: "conto", qtdTotal: 5, descricao: "Oito contos sobre recomeços, ambientados em uma cidade litorânea logo após uma tempestade que muda a rotina de seus moradores." },
  { titulo: "A Última Página", autor: "Beatriz Nogueira", editora: "Editora Alameda", ano: 2022, categoria: "novela", qtdTotal: 4, descricao: "Uma restauradora de livros antigos encontra, na última página de um exemplar raro, uma dedicatória que não deveria existir." },
  { titulo: "Caminhos do Tempo", autor: "Eduardo Prado", editora: "Biblioteca Escolar", ano: 2021, categoria: "romance", qtdTotal: 7, descricao: "Três linhas do tempo se cruzam na mesma casa de campo, contadas por moradores que nunca se conheceram — mas dividiram o mesmo endereço." },
  { titulo: "O Segredo da Floresta", autor: "Marina Silva", editora: "Editora Alameda", ano: 2020, categoria: "novela", qtdTotal: 6, descricao: "Uma guarda-florestal investiga o desaparecimento de trilhas inteiras de um parque nacional — e o que a floresta parece esconder de propósito." },
  { titulo: "Cartas para o Amanhã", autor: "Helena Duarte", editora: "Editora Alameda", ano: 2023, categoria: "diario", qtdTotal: 5, descricao: "O diário fictício de uma professora que escreve, todo fim de ano letivo, uma carta para a turma que ainda vai conhecer." },
  { titulo: "Entre Dois Mundos", autor: "Rafael Torres", editora: "Biblioteca Escolar", ano: 2019, categoria: "romance", qtdTotal: 1, descricao: "Um imigrante recomeça a vida em uma nova língua, dividido entre a saudade de casa e a vida que insiste em florescer no novo país." },
  { titulo: "O Diário Perdido", autor: "Helena Duarte", editora: "Editora Alameda", ano: 2018, categoria: "diario", qtdTotal: 4, descricao: "Um caderno encontrado em um sebo revela a rotina de uma adolescente nos anos 1990 — e quem o lê não consegue mais devolvê-lo." },
  { titulo: "Vozes do Silêncio", autor: "Eduardo Prado", editora: "Biblioteca Escolar", ano: 2022, categoria: "ensaios", qtdTotal: 5, descricao: "Ensaios curtos sobre escuta, silêncio e os espaços que a linguagem não alcança — pensados para leitura e debate em sala." },
  { titulo: "Além do Horizonte", autor: "Rafael Torres", editora: "Editora Alameda", ano: 2024, categoria: "romance", qtdTotal: 8, descricao: "Uma tripulação de pesquisa passa um ano isolada em uma estação costeira — e aprende a se conhecer pelo que o isolamento revela." },
];

/* -------------------------------------------------------------------------
   Inicialização do "banco de dados" local.
   - Base vazia            -> cria o esquema v2 já com os dados de demonstração.
   - Base da versão antiga -> migra (com backup) em vez de recriar.
   - Já está no v2         -> não faz nada.
   ------------------------------------------------------------------------- */

/* Acessos de demonstração: determinísticos (mesmo título => mesmo número),
   só para o ranking não nascer vazio. Troque por 0 para começar do zero. */
function acessosDemo(titulo) {
  let h = 0;
  for (const c of titulo) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return 20 + (h % 70);
}

function semearBaseNova() {
  const autores = SEED_AUTHORS.map((a) => ({ ...a, destaque: true }));
  const livros = [];
  const novoLivro = (dados) => ({ id: livros.length + 1, acessos: acessosDemo(dados.titulo), criadoEm: Date.now(), ...dados });

  SEED_BOOKS.forEach(({ autor, ...b }) => {
    livros.push(novoLivro({ ...b, autorId: DB._obterOuCriarAutor(autores, autor).id }));
  });

  Object.entries(SEED_AUTHOR_BOOKS).forEach(([autorId, obras]) => {
    const nome = SEED_AUTHORS.find((a) => a.id === autorId).nome;
    obras.forEach((o) => {
      livros.push(novoLivro({
        titulo: o.titulo, autorId, editora: "Clássicos da Literatura Brasileira", ano: o.ano, categoria: o.categoria,
        qtdTotal: 5, descricao: `Obra de ${nome}, disponível no acervo da biblioteca escolar.`,
      }));
    });
  });

  const usuarios = [
    { email: "admin@biblioteca.com", senha: "Admin123!", tipo: "admin", nome: "Administrador(a)", telefone: "" },
    { email: "usuario@biblioteca.com", senha: "Usuario123!", tipo: "usuario", nome: "Antônio Ferreira", telefone: "" },
  ];

  // Empréstimos de demonstração do leitor de teste. Dois já estão atrasados (alimentam o dashboard).
  const hoje = dataLocalISO();
  const demo = [
    { livro: "O Jardim das Estrelas", dataOffset: -25, devolucaoOffset: -11 },
    { livro: "Depois da Chuva", dataOffset: -18, devolucaoOffset: -4 },
    { livro: "A Última Página", dataOffset: -2, devolucaoOffset: 12 },
    { livro: "Entre Dois Mundos", dataOffset: -1, devolucaoOffset: 13 },
  ];
  const emprestimos = demo.map((d, i) => ({
    id: i + 1,
    livroId: livros.find((l) => l.titulo === d.livro).id,
    email: usuarios[1].email,
    nome: usuarios[1].nome,
    telefone: "",
    data: somarDiasISO(hoje, d.dataOffset),
    devolucao: somarDiasISO(hoje, d.devolucaoOffset),
    status: "ativo",
  }));

  const ok = [
    DB._gravar(CHAVE.categorias, SEED_CATEGORIES),
    DB._gravar(CHAVE.autores, autores),
    DB._gravar(CHAVE.livros, livros),
    DB._gravar(CHAVE.usuarios, usuarios),
    DB._gravar(CHAVE.emprestimos, emprestimos),
    DB._gravar(CHAVE.notificacoes, []),
  ].every(Boolean);
  if (ok) localStorage.setItem(CHAVE.schema, String(SCHEMA_VERSION));
}

function seedDatabase() {
  try {
    const versao = Number(localStorage.getItem(CHAVE.schema)) || 0;
    if (versao >= SCHEMA_VERSION) return;
    if (localStorage.getItem("biblioteca_seeded_v1")) DB.migrarDeV1();
    else semearBaseNova();
  } catch (e) {
    console.error("[DB] não foi possível inicializar o armazenamento local:", e);
  }
}
