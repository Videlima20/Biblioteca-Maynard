# Arquitetura e organização dos dados

## 1. Visão por camadas

A aplicação principal segue uma organização modular em JavaScript:

```text
Páginas HTML
    |
    v
Interface e navegação (js/app.js e js/admin.js)
    |
    v
Autenticação local (js/auth.js) e camada de dados (js/db.js)
    |
    v
localStorage / sessionStorage do navegador
```

A API Node.js é um componente separado no estado atual:

```text
Cliente HTTP
    |
    v
Express (api/server.js)
    |
    +--> Rotas de catálogo --> MySQL
    |
    +--> Rotas de conta (api/contas.js) --> MySQL
                                |
                                +--> Sessões em memória
```

A segunda arquitetura representa o servidor existente, mas ainda não está conectada ao fluxo principal das páginas.

## 2. Módulos do front-end

| Arquivo | Responsabilidade |
|---|---|
| `index.html` | Estrutura da aplicação principal e das áreas de catálogo e administração. |
| `login.html` | Interface de login e cadastro local. |
| `js/app.js` | Inicialização, navegação, pesquisa, catálogo, detalhes, empréstimos, conta e notificações. |
| `js/admin.js` | Operações administrativas, indicadores, gráficos, usuários e backup. |
| `js/auth.js` | Login, logout, sessão e identificação de perfil no navegador. |
| `js/db.js` | Camada central de leitura, gravação, validação, empréstimos e backups. |
| `js/data.js` | Dados iniciais, contas de demonstração e migração do esquema local. |
| `js/theme.js` | Alternância de tema e persistência da preferência. |
| `js/covers.js` | Apresentação das capas dos livros. |
| `js/authors-photo.js` | Obtenção/apresentação de imagens de autores. |
| `js/carousel3d.js` | Comportamento do carrossel 3D. |
| `js/api-client.js` | Adaptador experimental para leitura do catálogo via API. |

## 3. Coleções locais

A camada `js/db.js` centraliza as coleções armazenadas no `localStorage`.

| Coleção | Chave local | Finalidade |
|---|---|---|
| Categorias | `biblioteca_categorias` | Classificação das obras. |
| Autores | `biblioteca_autores` | Cadastro e informações dos autores. |
| Livros | `biblioteca_livros` | Dados bibliográficos e quantidade total de exemplares. |
| Usuários | `biblioteca_usuarios` | Contas locais e seus perfis. |
| Empréstimos | `biblioteca_emprestimos` | Histórico e situação das movimentações. |
| Notificações | `biblioteca_notificacoes` | Avisos internos associados aos usuários. |

A versão do esquema local é identificada por `biblioteca_schema`. O código atual utiliza a versão 2 e possui rotina de migração a partir da estrutura anterior.

A sessão local é mantida separadamente em `sessionStorage`, sob a chave `biblioteca_sessao`.

## 4. Modelo conceitual dos dados

O modelo local pode ser representado pelas seguintes relações:

```text
AUTORES 1 -------- N LIVROS N -------- 1 CATEGORIAS
                       |
                       |
                       1
                       |
                       N
                  EMPRESTIMOS
                       |
                       |
                       N
                       |
                       1
                   USUARIOS

USUARIOS 1 -------- N NOTIFICACOES
```

Interpretação:

- Um autor pode estar associado a vários livros.
- Cada livro possui uma referência de autor.
- Uma categoria pode classificar vários livros.
- Um livro pode possuir vários registros de empréstimo ao longo do tempo.
- Um usuário pode possuir vários empréstimos.
- Um usuário pode receber várias notificações.

No armazenamento local, os empréstimos guardam `livroId` e os dados do leitor. Título, autor e categoria do livro são recuperados na leitura. A disponibilidade também é derivada, em vez de ser armazenada como um número independente.

## 5. Dados de um livro

Os registros de livro utilizam, entre outros, os seguintes campos:

| Campo | Descrição |
|---|---|
| `id` | Identificador do livro. |
| `titulo` | Título da obra. |
| `autorId` | Referência ao autor. |
| `editora` | Editora responsável pela publicação. |
| `ano` | Ano de publicação. |
| `categoria` | Identificador da categoria. |
| `qtdTotal` | Quantidade total de exemplares cadastrados. |
| `descricao` | Texto descritivo da obra. |
| `acessos` | Contador de acessos utilizado no ranking. |
| `criadoEm` | Instante de criação, em milissegundos desde epoch. |
| `arquivado` | Indicador opcional de retirada do catálogo sem apagar o histórico. |

O autor e a quantidade disponível são enriquecidos/calculados pela camada de dados no momento da consulta.

## 6. Regras de consistência

### Disponibilidade

A quantidade disponível é calculada pela regra:

```text
quantidade disponível =
quantidade total de exemplares - quantidade de empréstimos ativos
```

Isso evita manter dois valores independentes que poderiam divergir.

### Cadastro e edição de livros

A camada local valida:

- título com pelo menos dois caracteres;
- autor com pelo menos dois caracteres;
- editora preenchida;
- descrição com pelo menos dez caracteres;
- ano entre 1500 e o ano atual mais um;
- quantidade total inteira entre 1 e 9999;
- categoria existente;
- quantidade total não inferior ao número de exemplares atualmente emprestados.

Autores são reaproveitados quando o nome coincide após normalização de acentos, caixa e espaços; caso contrário, um novo registro é criado.

### Empréstimos

A camada local aplica estas condições:

- livro existente e não arquivado;
- pelo menos um exemplar disponível;
- o leitor não pode ter o mesmo livro em outro empréstimo ativo;
- limite de cinco empréstimos ativos por leitor;
- data do empréstimo igual à data local atual;
- data prevista posterior à data do empréstimo;
- prazo máximo de 30 dias.

O prazo padrão indicado na configuração da camada é de 14 dias, mas a operação recebe a data prevista e valida o limite máximo.

### Devoluções

- O leitor pode devolver somente um empréstimo vinculado ao próprio e-mail.
- O administrador pode confirmar a devolução de qualquer leitor.
- A operação altera o status para `devolvido`, registra o instante da devolução e gera uma notificação interna.

### Exclusões e histórico

- Livros com histórico de empréstimo são arquivados, preservando os registros.
- Livros com empréstimos ativos não podem ser excluídos/arquivados pela rotina.
- Usuários com empréstimos ativos não podem ser removidos.
- O último administrador não pode ser removido nem rebaixado.
- Um administrador não pode alterar o próprio perfil nem excluir a própria conta.

## 7. Datas

A camada local adota duas convenções:

- Datas de calendário: `YYYY-MM-DD`, interpretadas no fuso local.
- Instantes: epoch em milissegundos.

A função `dataLocalISO()` evita utilizar diretamente a data UTC para representar o dia local, prevenindo divergências de calendário em determinados horários.

## 8. Migração e backup

A camada local contém:

- migração do esquema anterior para a versão 2;
- cópia de segurança da estrutura antiga antes da migração, quando possível;
- validação estrutural de backups;
- verificação de identificadores duplicados e referências;
- verificação de empréstimos ativos em relação à quantidade de exemplares;
- restauração dos dados anteriores se a gravação de uma importação falhar.

A importação de backup substitui as coleções atuais após confirmação. O arquivo de backup local contém senhas em texto puro e deve ser protegido.
