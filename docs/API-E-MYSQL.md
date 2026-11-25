# API e MySQL

## Escopo

A API é um componente separado da aplicação local. No estado examinado, ela oferece consultas públicas de catálogo e rotas de cadastro, login, sessão e logout. A interface principal ainda não utiliza o adaptador `js/api-client.js` nem migrou suas operações de empréstimos/administração para MySQL.

## Tecnologias

Node.js, Express, MySQL, `mysql2`, `dotenv` e `bcryptjs`.

## Rotas observadas

| Método | Endpoint | Descrição |
|---|---|---|
| GET | `/api/livros` | Consulta o catálogo de livros não arquivados e disponibilidade calculada a partir de empréstimos ativos. |
| GET | `/api/autores` | Consulta autores. |
| GET | `/api/categorias` | Consulta categorias. |
| POST | `/api/cadastro` | Cadastro de conta de leitor, com hash bcrypt. |
| POST | `/api/login` | Verificação de credenciais e criação de sessão. |
| GET | `/api/sessao` | Consulta sessão corrente. |
| POST | `/api/sair` | Encerra a sessão. |

## Configuração

Crie um arquivo `api/.env` local (não versionado) com variáveis como:

```dotenv
PORT=3000
DB_HOST=127.0.0.1
DB_PORT=3306
DB_USER=usuario
DB_PASSWORD=senha
DB_NAME=biblioteca_maynard
```

Instale as dependências e inicie:

```bash
cd api
npm install
node server.js
```

O servidor está configurado para escutar em `127.0.0.1`. A página inicial do servidor direciona para a tela de login.

## Estrutura esperada

As consultas e scripts referenciam tabelas `livros`, `autores`, `categorias`, `usuarios` e `emprestimos`. O código também menciona notificações no modelo local. O ZIP analisado não contém um script SQL completo de criação/versionamento do esquema, portanto a estrutura abaixo não deve ser tratada como especificação oficial de banco:

- `livros`: identificadores, título, autor/categoria, editora, ano, descrição, quantidade, acessos, criação e arquivamento.
- `autores`: dados biográficos e de destaque.
- `categorias`: nome e descrição.
- `usuarios`: nome, email, hash de senha, telefone e tipo.
- `emprestimos`: usuário, livro, datas e status.

## Limitações

- As telas principais continuam operando com dados locais.
- Não existe integração completa dos empréstimos e operações administrativas com MySQL.
- Sessões são mantidas em memória e não sobrevivem à reinicialização.
- O servidor está limitado ao loopback e à origem local configurada; não é um serviço pronto para hospedagem.
- É necessário criar e versionar um esquema SQL oficial, além de testes e endpoints faltantes, antes de uma migração integral.

## Segurança e uso demonstrativo

Contas de teste e senhas de demonstração não devem ser reutilizadas em ambiente real. A API utiliza bcrypt para contas criadas por suas rotas, mas isso não torna a aplicação local nem a API prontas para produção. Antes de implantação real, devem ser implementadas autorização server-side, proteção operacional, persistência de sessão apropriada, política de segredo e testes de segurança.
