# Arquitetura e dados

## Aplicação local

```text
HTML/CSS
  |
  +-- js/app.js / js/admin.js
        |
        +-- js/auth.js (sessão local)
        +-- js/db.js (regras, validação e persistência)
              |
              +-- localStorage
              +-- sessionStorage (sessão)
```

## API separada

```text
Cliente HTTP
  |
  +-- Express (api/server.js)
        +-- Consultas de catálogo
        +-- Cadastro/login (api/contas.js)
              |
              +-- MySQL
              +-- Sessões em memória
```

O adaptador `js/api-client.js` está no repositório, mas não é carregado pelas páginas principais examinadas. Ele não deve ser apresentado como integração ativa do frontend.

## Módulos principais

| Arquivo | Responsabilidade |
|---|---|
| `index.html` | Estrutura da aplicação principal. |
| `login.html` | Tela de login/cadastro local. |
| `js/app.js` | Navegação, catálogo, detalhes, empréstimos, conta e notificações. |
| `js/admin.js` | Administração, métricas, usuários e backups. |
| `js/auth.js` | Sessão e autenticação local. |
| `js/db.js` | Regras de dados, validação, empréstimos, backup e persistência. |
| `js/data.js` | Dados-semente e inicialização/migração. |
| `js/theme.js` | Tema e preferência. |
| `js/covers.js` | Capas de livros. |
| `js/authors-photo.js` | Imagens de autores. |
| `js/carousel3d.js` | Carrossel de autores. |
| `js/api-client.js` | Adaptador experimental de consulta via API. |
| `api/server.js` | Express, pool MySQL e rotas públicas de catálogo. |
| `api/contas.js` | Cadastro/login/sessão/logout via API. |
| `api/importar.js` | Importação inicial de dados. |

## Dados locais

A camada `js/db.js` organiza as coleções no Web Storage. A sessão local é separada e usa `sessionStorage`. O navegador e o perfil são o escopo de persistência: não há sincronização automática entre computadores.

## Regras de consistência descritas/implementadas no código

- Disponibilidade é derivada da quantidade total menos empréstimos ativos.
- Livro com histórico é arquivado em vez de eliminado definitivamente.
- Operações de empréstimo/devolução são validadas pela camada de dados.
- Backup/restauração local envolve coleções da aplicação e substitui dados locais, mediante confirmação.
- Datas de calendário são representadas em formato ISO de data; instantes podem utilizar epoch em milissegundos.

Este documento é uma descrição do código local examinado, não um desenho de arquitetura de produção.
