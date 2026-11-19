# API — Biblioteca Maynard

## Sobre

A API do Biblioteca Maynard foi desenvolvida com Node.js e Express. Ela disponibiliza rotas para consulta de livros, autores e categorias, além de operações de cadastro e autenticação de contas utilizando MySQL.

## Tecnologias

- Node.js
- Express
- MySQL
- mysql2
- dotenv
- bcryptjs

## Instalação

No terminal, dentro desta pasta (`api`), execute:

```bash
npm install
```

Crie um arquivo `.env` com as configurações do banco de dados:

```dotenv
PORT=3000
DB_HOST=127.0.0.1
DB_PORT=3306
DB_USER=usuario_do_banco
DB_PASSWORD=senha_do_banco
DB_NAME=biblioteca_maynard
```

Ajuste os valores conforme o ambiente utilizado. O banco MySQL e suas tabelas precisam estar criados antes de iniciar a API.

Inicie o servidor:

```bash
node server.js
```

Por padrão, o servidor utiliza a porta `3000` e fica disponível localmente em `http://127.0.0.1:3000`.

## Rotas disponíveis

| Método | Rota | Descrição |
|---|---|---|
| GET | `/api/livros` | Consulta os livros do catálogo. |
| GET | `/api/autores` | Consulta os autores. |
| GET | `/api/categorias` | Consulta as categorias. |
| POST | `/api/cadastro` | Cadastra uma conta de leitor. |
| POST | `/api/login` | Realiza o login. |
| GET | `/api/sessao` | Consulta a sessão atual. |
| POST | `/api/sair` | Encerra a sessão. |

As rotas de cadastro e login recebem dados em formato JSON. As senhas cadastradas por essas rotas são protegidas com hash bcrypt.

## Arquivos principais

- `server.js`: configura o Express, a conexão MySQL e as rotas do catálogo.
- `contas.js`: implementa cadastro, login, consulta de sessão e logout.
- `importar.js`: importa os dados do backup inicial para o banco de dados.
- `package.json`: lista as dependências da API.
- `.env.example`: modelo de configuração das variáveis de ambiente.

## Observação importante

A interface principal do projeto ainda utiliza `localStorage` e autenticação local do navegador. Embora a API e suas rotas estejam presentes, a integração completa entre as telas e o MySQL ainda precisa ser realizada.

O pacote não contém um script SQL de criação das tabelas. A estrutura do banco deve corresponder às tabelas e colunas utilizadas nas consultas da API.

Não compartilhe o arquivo `.env` nem utilize credenciais de demonstração em um ambiente público.
