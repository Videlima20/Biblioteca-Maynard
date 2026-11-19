# API e integração com MySQL

Este documento descreve exclusivamente o conteúdo encontrado na pasta `api/`. Ele não afirma que todas as telas do aplicativo já utilizam o banco relacional.

## 1. Visão geral

A API foi construída com Node.js e Express. O arquivo `server.js` cria um pool de conexões com MySQL por meio de `mysql2/promise`, carrega as configurações de ambiente com `dotenv` e registra as rotas HTTP.

Dependências declaradas em `api/package.json`:

- `express`
- `mysql2`
- `dotenv`
- `bcryptjs`

O servidor utiliza a porta definida em `PORT` ou, na ausência dela, a porta `3000`. O endereço de escuta é `127.0.0.1`.

## 2. Arquivos

| Arquivo | Responsabilidade |
|---|---|
| `server.js` | Configuração do Express, pool MySQL, arquivos estáticos e rotas públicas do catálogo. |
| `contas.js` | Cadastro, login, consulta da sessão e logout. |
| `importar.js` | Importação do backup inicial para o banco, dentro de uma transação. |
| `.env` | Configurações locais e credenciais; não deve ser versionado. |
| `.env.example` | Modelo sem credenciais reais. |
| `package.json` | Dependências Node.js. |

## 3. Configuração do ambiente

Crie `api/.env` com os valores do ambiente utilizado:

```dotenv
PORT=3000
DB_HOST=127.0.0.1
DB_PORT=3306
DB_USER=usuario_do_banco
DB_PASSWORD=senha_do_banco
DB_NAME=biblioteca_maynard
```

O arquivo `.env` deve permanecer fora de repositórios públicos e não deve ser compartilhado com credenciais reais.

Instalação:

```bash
cd api
npm install
node server.js
```

O processo testa a conexão com `SELECT 1` antes de começar a escutar requisições.

## 4. Endpoints identificados

### Catálogo — consultas GET

| Método | Rota | Conteúdo |
|---|---|---|
| GET | `/api/livros` | Livros não arquivados, autor, categoria, editora, ano, descrição, quantidade total, disponibilidade calculada e acessos. |
| GET | `/api/autores` | Autores e informações complementares. |
| GET | `/api/categorias` | Categorias cadastradas. |

As consultas são públicas e retornam JSON. A disponibilidade dos livros é calculada no SQL subtraindo a quantidade de empréstimos com status `ativo` da quantidade total de exemplares.

### Contas e sessão

| Método | Rota | Comportamento |
|---|---|---|
| POST | `/api/cadastro` | Cria uma conta do tipo `usuario`, gera hash bcrypt e inicia sessão. |
| POST | `/api/login` | Verifica e-mail e senha e inicia sessão. |
| GET | `/api/sessao` | Retorna os dados públicos da sessão válida. |
| POST | `/api/sair` | Encerra a sessão e limpa o cookie. |

As rotas POST de conta esperam JSON e validam a origem da requisição. O cadastro público sempre cria uma conta de leitor; a rota não oferece criação pública de administradores.

## 5. Autenticação e sessão da API

O módulo `contas.js` utiliza `bcryptjs` com custo de hash 12. A comparação da senha é feita com `bcrypt.compare`.

Após o login ou cadastro, o servidor cria um token aleatório com `node:crypto` e o envia em um cookie chamado `maynard_sessao`, configurado com `HttpOnly` e `SameSite=Strict`.

As sessões são armazenadas em um `Map` na memória do processo Node.js, com duração de oito horas. Consequências:

- reiniciar o servidor encerra as sessões existentes;
- executar mais de uma instância não compartilha as sessões;
- não há armazenamento persistente ou distribuído de sessões.

O módulo também aplica um limite simples de tentativas às rotas de cadastro e login.

## 6. Estrutura MySQL esperada pelo código

O arquivo de criação do esquema SQL não está presente no pacote analisado. Portanto, a tabela abaixo é uma leitura das tabelas e colunas referenciadas nas consultas e comandos da API, não um script oficial de criação.

| Tabela | Colunas identificadas no código |
|---|---|
| `categorias` | `id`, `nome`, `descricao` |
| `autores` | `id`, `nome`, `anos`, `bio`, `citacao`, `wiki`, `destaque` |
| `usuarios` | `id`, `nome`, `email`, `senha_hash`, `telefone`, `tipo` |
| `livros` | `id`, `titulo`, `autor_id`, `categoria_id`, `editora`, `ano`, `quantidade_total`, `descricao`, `acessos`, `criado_em`, `arquivado` |
| `emprestimos` | `id`, `usuario_id`, `livro_id`, `data_emprestimo`, `data_prevista_devolucao`, `devolvido_em`, `status` |
| `notificacoes` | `id`, `usuario_id`, `emprestimo_id`, `mensagem`, `detalhes`, `lida`, `criado_em` |

As rotas atuais consultam diretamente as tabelas `livros`, `autores`, `categorias`, `emprestimos` e `usuarios`.

## 7. Importação inicial

O script `importar.js` lê `backup/biblioteca-maynard-backup-inicial.json` e tenta inserir os dados nas tabelas MySQL.

Características observadas:

- exige o esquema de backup versão 2;
- verifica se as tabelas de destino estão vazias;
- executa as inserções em uma transação;
- converte senhas do backup em hashes bcrypt;
- relaciona autores, categorias, usuários, livros e empréstimos;
- executa rollback se ocorrer uma falha antes do commit.

O script não deve ser executado sobre tabelas que já contenham registros. O próprio código cancela a importação quando encontra dados.

A importação depende de o banco e as tabelas já terem sido criados. O pacote não inclui o DDL necessário para essa criação.

## 8. Limite da integração atual

O arquivo `js/api-client.js` contém um adaptador para carregar livros, autores e categorias pelas rotas públicas da API. Porém, o arquivo não é incluído pelas tags `<script>` de `index.html` e `login.html`.

Além disso, `js/auth.js` implementa autenticação local com `sessionStorage`, e `js/db.js` persiste as coleções no `localStorage`.

Assim, no estado atual:

- a API possui rotas de catálogo e conta;
- o cliente de API está presente, mas não está conectado às páginas;
- as telas e regras administrativas continuam utilizando a camada local;
- as operações de livros, empréstimos, usuários e notificações não estão integradas ao MySQL pela interface.

## 9. Próximas etapas recomendadas

1. Definir e versionar o script SQL de criação do banco.
2. Conectar o login e o cadastro da interface às rotas `/api/login` e `/api/cadastro`.
3. Consultar `/api/sessao` ao carregar a aplicação e tratar sessões expiradas.
4. Integrar o catálogo ao `api-client.js`.
5. Criar endpoints protegidos para operações administrativas.
6. Implementar autorização no servidor, verificando o perfil em cada operação.
7. Migrar empréstimos, devoluções, usuários, notificações e backups para o banco.
8. Adicionar testes automatizados para rotas, validações e regras de negócio.
9. Configurar HTTPS, política de cookies adequada ao ambiente e gerenciamento seguro de segredos antes de qualquer publicação.

